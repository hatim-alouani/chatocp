import logging
import os
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from rag_engine import RAGEngine

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
OLLAMA_HOST = os.getenv("OLLAMA_HOST_URL", "http://localhost:11434")

logger.info(f"INTERNAL_API_KEY loaded: {INTERNAL_API_KEY[:10] + '...' if INTERNAL_API_KEY else 'NOT SET'}")
logger.info(f"OLLAMA_HOST: {OLLAMA_HOST}")

os.environ["OLLAMA_HOST_URL"] = OLLAMA_HOST


app = FastAPI(
    title="AI Service (FastAPI RAG)",
    description="Orchestrates RAG logic and streams LLM responses.",
    version="0.1.0"
)


try:
    RAG_ENGINE = RAGEngine()
except Exception as e:
    logger.critical(f"Failed to initialize RAG_ENGINE: {e}")
    RAG_ENGINE = None

@app.get("/health")
def health_check():
    return {"status": "ok", "rag_engine_ready": RAG_ENGINE.is_ready if RAG_ENGINE else False}

@app.post("/api/stream_response")
async def stream_response_endpoint(request: Request):
    received_key = request.headers.get("x-internal-secret")
    
    logger.info(f"Received key: {received_key[:10] + '...' if received_key else 'MISSING'}")
    logger.info(f"Expected key: {INTERNAL_API_KEY[:10] + '...' if INTERNAL_API_KEY else 'NOT SET'}")
    
    if received_key != INTERNAL_API_KEY:
        logger.warning("Unauthorized access attempt to /api/stream_response")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized internal access"
        )

    try:
        data = await request.json()
        user_id = data.get("user_id")
        question = data.get("question")
        conversation_id = data.get("conversation_id")

        if not question:
            raise HTTPException(status_code=400, detail="Question is required.")

        logger.info(f"Authorized request received: {question[:50]}...")

    except Exception as e:
        logger.error(f"Failed to parse JSON body: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON body.")

    try:
        generator = RAG_ENGINE.stream_query(
            question=question,
            top_k=6
        )
        return StreamingResponse(generator, media_type="text/plain")

    except Exception as e:
        logger.error(f"Critical error during RAG execution: {e}")

        async def error_stream():
            yield "SYSTEM_ERROR: Une erreur inattendue est survenue dans le service AI."

        return StreamingResponse(
            error_stream(),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            media_type="text/plain"
        )