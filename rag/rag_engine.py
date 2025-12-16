
# rag_api.py
import logging
import time
from typing import Generator, Dict, Any, List, Tuple
import os

import torch
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from sentence_transformers import CrossEncoder
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_DIR = os.getenv("VECTORSTORE_DIR", "vectorstore")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-large")
RERANKER_MODEL = os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:14b-instruct-q4_K_M")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
SYSTEM_PROMPT = """Tu es un assistant technique expert des procédés Prayon.

RÈGLES IMPORTANTES:
1. Pour les questions TECHNIQUES: Réponds en utilisant UNIQUEMENT les informations du CONTEXTE ci-dessous et CITE TOUJOURS les sources exactes (document + page)
2. Pour les salutations ou questions générales: Réponds naturellement et poliment
3. Si le contexte contient des informations PARTIELLES ou LIÉES à une question technique, fournis-les en précisant ce qui est disponible
4. Si le contexte ne contient AUCUNE information pour une question technique, dis-le poliment sans inventer de chiffres ou détails
5. Sois professionnel, précis et en français

CONTEXTE DOCUMENTAIRE:
{context}
"""

DEFAULT_RRF_K = 60

class ChatRequest(BaseModel):
    question: str
    conversationId: int = None

@dataclass
class RRFResult:
    document: Document
    rrf_score: float
    original_ranks: Dict[str, int]

def reciprocal_rank_fusion(
    search_results_list: List[List[Document]],
    k: int = DEFAULT_RRF_K
) -> List[RRFResult]:
    doc_scores = {}
    for method_idx, results in enumerate(search_results_list):
        for rank, doc in enumerate(results, start=1):
            chunk_id = doc.metadata.get("chunk_id", f"doc_{id(doc)}")
            if chunk_id not in doc_scores:
                doc_scores[chunk_id] = {"document": doc, "ranks": {}, "rrf_score": 0.0}
            doc_scores[chunk_id]["ranks"][f"method_{method_idx}"] = rank
            doc_scores[chunk_id]["rrf_score"] += 1.0 / (k + rank)
    rrf_results = [
        RRFResult(document=data["document"], rrf_score=data["rrf_score"], original_ranks=data["ranks"])
        for data in doc_scores.values()
    ]
    return sorted(rrf_results, key=lambda x: x.rrf_score, reverse=True)

class CrossEncoderReranker:
    def __init__(self, model_name: str = RERANKER_MODEL):
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading Cross-Encoder {model_name} on {device}")
        self.model = CrossEncoder(model_name, device=device)

    def rerank(self, query: str, documents: List[Document], top_k: int = 10) -> List[Tuple[Document, float]]:
        if not documents:
            return []
        pairs = [[query, doc.page_content] for doc in documents]
        scores = self.model.predict(pairs, show_progress_bar=False)
        return sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)[:top_k]
        
class HybridRetrieverWithReranking:
    def __init__(self, vectorstore: Chroma, bm25_retriever: BM25Retriever = None, reranker: CrossEncoderReranker = None,
                 k_bm25: int = 20, k_semantic: int = 20, k_mmr: int = 20, k_final: int = 6):
        self.vectorstore = vectorstore
        self.bm25_retriever = bm25_retriever
        self.reranker = reranker
        self.k_bm25 = k_bm25
        self.k_semantic = k_semantic
        self.k_mmr = k_mmr
        self.k_final = k_final

    def _perform_searches(self, query: str) -> List[List[Document]]:
        search_results = []
        # BM25
        if self.bm25_retriever:
            try:
                bm25_results = self.bm25_retriever.invoke(query)[:self.k_bm25]
                search_results.append(bm25_results)
            except Exception as e:
                logger.warning(f"BM25 failed: {e}")
        # Semantic
        try:
            semantic_results = self.vectorstore.similarity_search(query, k=self.k_semantic)
            search_results.append(semantic_results)
        except Exception as e:
            logger.warning(f"Semantic failed: {e}")
        # MMR
        try:
            mmr_results = self.vectorstore.max_marginal_relevance_search(query, k=self.k_mmr, fetch_k=self.k_mmr*2)
            search_results.append(mmr_results)
        except Exception as e:
            logger.warning(f"MMR failed: {e}")
        return search_results

    def retrieve(self, query: str) -> List[Tuple[Document, float]]:
        search_results = self._perform_searches(query)
        if not search_results:
            return []
        rrf_results = reciprocal_rank_fusion(search_results)
        top_rrf_docs = [r.document for r in rrf_results[:self.k_semantic]]
        if self.reranker and top_rrf_docs:
            try:
                return self.reranker.rerank(query, top_rrf_docs, top_k=self.k_final)
            except Exception as e:
                logger.warning(f"Reranking failed: {e}")
        return [(r.document, r.rrf_score) for r in rrf_results[:self.k_final]]

class RAGEngine:
    """FastAPI compatible RAG engine, keeps BM25 methods and stream_query"""
    def __init__(self):
        self.db_dir = DB_DIR
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        # Embeddings
        self.embedding_function = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": device},
            encode_kwargs={"normalize_embeddings": True}
        )
        # Vectorstore
        self.vectorstore = Chroma(persist_directory=self.db_dir, embedding_function=self.embedding_function)
        # BM25
        self.bm25_retriever = None
        try:
            data = self.vectorstore.get()
            documents = [Document(page_content=c, metadata=m) for c, m in zip(data['documents'], data['metadatas'])]
            if documents:
                self.bm25_retriever = BM25Retriever.from_documents(documents)
                self.bm25_retriever.k = 20
        except Exception as e:
            logger.warning(f"BM25 init failed: {e}")
        # Reranker
        self.reranker = CrossEncoderReranker()
        # Hybrid Retriever
        self.hybrid_retriever = HybridRetrieverWithReranking(
            vectorstore=self.vectorstore,
            bm25_retriever=self.bm25_retriever,
            reranker=self.reranker
        )
        # LLM
        self.llm = ChatOllama(model=LLM_MODEL, base_url=OLLAMA_URL, temperature=0.0, num_ctx=4096, top_p=0.95, repeat_penalty=1.1)
        self.is_ready = True

    def stream_query(self, question: str, top_k: int = 6) -> Generator[str, None, None]:
        if not self.is_ready:
            yield "SYSTEM_ERROR: RAG Engine not ready."
            return
        # Retrieve documents
        docs_with_scores = self.hybrid_retriever.retrieve(question)
        context_parts, sources = [], []
        for doc, score in docs_with_scores:
            context_parts.append(f"Source: {doc.metadata.get('source')}, Page: {doc.metadata.get('page')}\n{doc.page_content}")
            sources.append(f"{doc.metadata.get('source')} (p.{doc.metadata.get('page')})")
        context_str = "\n\n---\n\n".join(context_parts)
        yield f"METADATA_START:{str({'sources': list(set(sources)), 'context': context_str})}:METADATA_END\n\n"
        messages = [SystemMessage(content=SYSTEM_PROMPT.format(context=context_str)), HumanMessage(content=question)]
        try:
            for chunk in self.llm.stream(messages):
                if chunk.content:
                    yield chunk.content
        except Exception as e:
            yield f"SYSTEM_ERROR: LLM generation failed: {e}"


app = FastAPI()
rag_engine = RAGEngine()

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    question = request.question
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    def generator():
        yield from rag_engine.stream_query(question)
    return StreamingResponse(generator(), media_type="text/plain")

@app.get("/health")
async def health_check():
    return {"status": "ok", "rag_ready": rag_engine.is_ready}


