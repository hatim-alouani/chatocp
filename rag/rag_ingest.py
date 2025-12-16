import os
import logging
import shutil
import re
from typing import List, Dict, Tuple
from dataclasses import dataclass

import fitz
import torch
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from sentence_transformers import CrossEncoder

from dynamic_splitter import DynamicTechnicalTextSplitter, ChemicalNormalizer

if not os.path.exists('logs'):
    os.makedirs('logs')

import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/rag_agent.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

DATA_DIR = "data/raw"
DB_DIR = "vectorstore"

def extract_text_from_pdf(pdf_path: str) -> List[Dict]:
    doc_content = []
    normalizer = ChemicalNormalizer()
    
    try:
        doc = fitz.open(pdf_path)
        current_section = "Introduction"
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            blocks = page.get_text("dict")["blocks"]
            page_text_parts = []
            
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text = span["text"].strip()
                            if text:
                                if normalizer.is_section_header(text):
                                    current_section = text
                                page_text_parts.append(text)
            
            full_text = " ".join(page_text_parts)
            full_text = normalizer.normalize_text(full_text)
            
            if full_text.strip():
                entities = normalizer.extract_entities(full_text)
                
                doc_content.append({
                    "page_content": full_text,
                    "metadata": {
                        "source": os.path.basename(pdf_path),
                        "page": page_num + 1,
                        "section": current_section,
                        "type_doc": "technique",
                        "chemical_formulas": ", ".join(entities["formulas"][:5]),
                        "has_concentrations": len(entities["concentrations"]) > 0,
                        "has_temperatures": len(entities["temperatures"]) > 0,
                        "equipment_mentioned": ", ".join(entities["equipment"][:3]),
                    }
                })
        
        doc.close()
        logger.info(f"Extracted {len(doc_content)} pages from {os.path.basename(pdf_path)}")
        
    except Exception as e:
        logger.error(f"Error reading PDF {pdf_path}: {e}")
    
    return doc_content

class E5EmbeddingsWithPrefix(HuggingFaceEmbeddings):
    """Wrapper pour ajouter les préfixes requis par E5."""
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        prefixed_texts = [f"passage: {text}" for text in texts]
        return super().embed_documents(prefixed_texts)
    
    def embed_query(self, text: str) -> List[float]:
        prefixed_text = f"query: {text}"
        return super().embed_query(prefixed_text)

class TechnicalTextSplitter(RecursiveCharacterTextSplitter):
    
    def __init__(self, chunk_size=800, chunk_overlap=150):
        separators = [
            "\n\n\n",
            "\n\n",
            "\n",
            ". ",
            ".",
            ";",
            ",",
        ]
        
        super().__init__(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separators,
            length_function=len,
            is_separator_regex=False
        )
    
    def split_documents(self, documents: List[Document]) -> List[Document]:
        chunks = super().split_documents(documents)
        
        normalizer = ChemicalNormalizer()
        for i, chunk in enumerate(chunks):
            chunk.metadata["chunk_id"] = f"{chunk.metadata.get('source', 'unknown')}_{i}"
            
            entities = normalizer.extract_entities(chunk.page_content)
            chunk.metadata.update({
                "has_chemical_formula": len(entities["formulas"]) > 0,
                "has_percentage": "%" in chunk.page_content,
                "has_temperature": len(entities["temperatures"]) > 0,
                "has_equation": "→" in chunk.page_content or "=" in chunk.page_content,
                "word_count": len(chunk.page_content.split()),
                "char_count": len(chunk.page_content)
            })
        
        return chunks


@dataclass
class RRFResult:
    document: Document
    rrf_score: float
    original_ranks: Dict[str, int]

def reciprocal_rank_fusion(
    search_results_list: List[List[Document]],
    k: int = 60
) -> List[RRFResult]:
    doc_scores = {}
    
    for method_idx, results in enumerate(search_results_list):
        for rank, doc in enumerate(results, start=1):
            chunk_id = doc.metadata.get("chunk_id", f"doc_{id(doc)}")
            
            if chunk_id not in doc_scores:
                doc_scores[chunk_id] = {
                    "document": doc,
                    "ranks": {},
                    "rrf_score": 0.0
                }
            
            doc_scores[chunk_id]["ranks"][f"method_{method_idx}"] = rank
            doc_scores[chunk_id]["rrf_score"] += 1.0 / (k + rank)
    
    rrf_results = [
        RRFResult(
            document=data["document"],
            rrf_score=data["rrf_score"],
            original_ranks=data["ranks"]
        )
        for data in doc_scores.values()
    ]
    
    rrf_results.sort(key=lambda x: x.rrf_score, reverse=True)
    
    return rrf_results

class CrossEncoderReranker:
    
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Loading Cross-Encoder: {model_name} (device: {device})")
        
        self.model = CrossEncoder(model_name, device=device)
        self.model_name = model_name
    
    def rerank(
        self,
        query: str,
        documents: List[Document],
        top_k: int = 10
    ) -> List[Tuple[Document, float]]:
        if not documents:
            return []
        
        pairs = [[query, doc.page_content] for doc in documents]
        
        scores = self.model.predict(pairs, show_progress_bar=False)
        
        doc_scores = list(zip(documents, scores))
        
        doc_scores.sort(key=lambda x: x[1], reverse=True)
        
        return doc_scores[:top_k]

class HybridRetrieverWithReranking:
    
    def __init__(
        self,
        vectorstore: Chroma,
        reranker: CrossEncoderReranker,
        k_semantic: int = 20,
        k_mmr: int = 20,
        k_final: int = 5
    ):
        self.vectorstore = vectorstore
        self.reranker = reranker
        self.k_semantic = k_semantic
        self.k_mmr = k_mmr
        self.k_final = k_final
    
    def retrieve(self, query: str) -> List[Tuple[Document, float]]:
        logger.info(f"Hybrid retrieval for: '{query}'")
        
        semantic_results = self.vectorstore.similarity_search(
            query,
            k=self.k_semantic
        )
        logger.info(f"  Semantic search: {len(semantic_results)} results")
        
        mmr_results = self.vectorstore.max_marginal_relevance_search(
            query,
            k=self.k_mmr,
            fetch_k=self.k_mmr * 2
        )
        logger.info(f"  MMR search: {len(mmr_results)} results")
        
        rrf_results = reciprocal_rank_fusion(
            [semantic_results, mmr_results],
            k=60
        )
        logger.info(f"  RRF fusion: {len(rrf_results)} unique documents")
        
        top_rrf_docs = [r.document for r in rrf_results[:self.k_semantic]]
        
        reranked_results = self.reranker.rerank(
            query,
            top_rrf_docs,
            top_k=self.k_final
        )
        logger.info(f"  Re-ranked: {len(reranked_results)} final results")
        
        return reranked_results


def ingest_documents():
    logger.info("Starting enhanced ingestion with RRF + Re-ranking support...")

    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        logger.warning(f"{DATA_DIR} created. Please add your PDFs here.")
        return

    pdf_files = [f for f in os.listdir(DATA_DIR) if f.lower().endswith('.pdf')]
    if not pdf_files:
        logger.warning(f"No PDFs found in {DATA_DIR}")
        return

    raw_documents = []
    for pdf_file in pdf_files:
        pdf_path = os.path.join(DATA_DIR, pdf_file)
        logger.info(f"Processing {pdf_file}...")
        extracted = extract_text_from_pdf(pdf_path)
        for data in extracted:
            raw_documents.append(Document(
                page_content=data["page_content"],
                metadata=data["metadata"]
            ))

    logger.info(f"Extraction: {len(raw_documents)} pages")

    splitter = DynamicTechnicalTextSplitter()
    chunks = splitter.split_documents(raw_documents)
    logger.info(f"Dynamic chunking produced {len(chunks)} chunks")
    
    if chunks:
        avg_size = sum(len(c.page_content) for c in chunks) / len(chunks)
        logger.info(f"   Average chunk: {avg_size:.0f} chars")

    device = 'cuda' if torch.cuda.is_available() and os.environ.get("USE_GPU", "1") == "1" else 'cpu'
    logger.info(f"Generating embeddings (Device: {device})...")

    embeddings = E5EmbeddingsWithPrefix(
        model_name="intfloat/multilingual-e5-large",
        model_kwargs={'device': device},
        encode_kwargs={'normalize_embeddings': True}
    )

    if os.path.exists(DB_DIR):
        logger.info(f"Rebuilding vectorstore...")
        shutil.rmtree(DB_DIR)

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=DB_DIR
    )

    logger.info(f"Ingestion completed! {len(chunks)} chunks indexed")
    
    logger.info("\nTesting Hybrid Retrieval with Re-ranking...")
    
    reranker = CrossEncoderReranker()
    hybrid_retriever = HybridRetrieverWithReranking(
        vectorstore=vectorstore,
        reranker=reranker,
        k_semantic=20,
        k_mmr=20,
        k_final=5
    )
    
    test_queries = [
        "concentration P2O5 acide phosphorique après filtration",
        "température de cristallisation",
        "équipements de filtration utilisés"
    ]
    
    for query in test_queries:
        logger.info(f"\nQuery: '{query}'")
        results = hybrid_retriever.retrieve(query)
        
        for i, (doc, score) in enumerate(results, 1):
            logger.info(f"   {i}. Score: {score:.4f} | Source: {doc.metadata.get('source')} (p.{doc.metadata.get('page')})")
            logger.info(f"      Preview: {doc.page_content[:100]}...")

if __name__ == "__main__":
    ingest_documents()
