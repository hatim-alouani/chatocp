# ChatOCP - Conversational RAG System for OCP Process Documentation

A full-stack conversational AI application that combines Next.js frontend, Node.js/Fastify backend, and Python RAG engine to provide intelligent, context-aware responses about OCP (Prayon) industrial processes.

## 📋 System Requirements


### OPERATING SYSTEM
- **WINDOWS**: PowerShell (Devloped & tested on Windows)



### Hardware
- **GPU**: NVIDIA with xxGB+ VRAM (tested on 8GB)
- **CPU**: xx+ cores recommended (tested on 8+)
- **RAM**: xxGB+ recommended (tested on 16GB+)
- **Disk**: 20GB+ for models and vector store

### Software
- **Python**: 3.11+ (tested on 3.13)
- **Node.js**: 18+ (tested on latest LTS)
- **npm**: 9+
- **Ollama**: Latest version with NVIDIA CUDA support
- **SQLite**: 3.35+
- **CUDA Toolkit**: 11.8 or 12.1 (for GPU acceleration)



---

## 🚀 Installation & Setup

### Step 0: Prerequisites

#### Install Ollama with GPU Support
1. Download [Ollama](https://ollama.ai)
2. Install NVIDIA CUDA Toolkit 12.1 or 11.8
3. Add Ollama to PATH
4. install the ollama model:
   ```powershell
   ollama pull qwen2.5:14b-instruct-q4_K_M
   ```
### Start Ollama Server

```powershell
ollama serve
```

#### Install Python with CUDA Support
1. Ensure Python 3.11+ is installed
2. Verify CUDA PyTorch installation:
   ```powershell
   python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"
   ```
   If returns `False`, reinstall PyTorch with CUDA:
   ```powershell
   pip uninstall torch -y
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```

#### Install Node.js
- Download from [nodejs.org](https://nodejs.org)
- Verify: `node --version` and `npm --version`

---

### Step 1: Clone & Setup Backend (Node.js/Fastify)

```powershell

#server

npm install

```

#### CREATE .env

```powershell

PORT=4000
DOMAIN=http://localhost:4000/
FRONTEND_URL=http://localhost:3000/
JWT_SECRET=supersecretkey123
INTERNAL_API_KEY=2f4c9ab3d6b94c48a1e2d73fe080bb6e4f3a2c9fdc87420fb3e7f0b34a28d91f
OLLAMA_HOST_URL=http://localhost:11434/
AI_SERVICE_URL=http://localhost:8000/api/stream_response

```
#### RUN THE APP

```powershell

npm start

```

---

### Step 2: Setup Frontend (Next.js)

```powershell

#client

npm install

```

#### Create .env.local File

```powershell

NEXT_PUBLIC_API_URL=http://localhost:4000
PORT=3000

```
#### RUN THE APP

```powershell

npm run dev

```

---

### Step 3: Setup Python RAG Engine (FastAPI)

#### 3.1 Create Virtual Environment

```powershell

python -m venv venv

.\venv\Scripts\activate


```

#### 3.2 Install Dependencies

```powershell

pip install --upgrade pip setuptools wheel

pip install -r requirement.txt

pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

#create the vectores
python rag_ingest.py

#run fast api
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

```

#### 3.3 Create .env File

```powershell

INTERNAL_API_KEY=2f4c9ab3d6b94c48a1e2d73fe080bb6e4f3a2c9fdc87420fb3e7f0b34a28d91f
OLLAMA_HOST_URL=http://localhost:11434/

```

---


## 📝 Accessing the Application

Once all services are running:

1. **Frontend**: http://localhost:3000
2. **Backend API**: http://localhost:4000
3. **RAG Engine**: http://localhost:8000
4. **Ollama**: http://localhost:11434

---

## 🔌 API Endpoints

### Fastify Backend (localhost:4000)

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout and clear cookies
- `GET /auth/me` - Get current user info

#### Chat
- `POST /chat` - Send message and get AI response
- `GET /chat` - Fetch conversation history
- `POST /confirm` - Confirm conversation

#### Health
- `GET /health` - Server health check

### FastAPI RAG Engine (localhost:8000)

#### Chat
- `POST /chat` - Send question with RAG
  - Body: `{ question, conversationId, user_id }`
  - Returns: Streaming response with metadata

#### Memory Debug
- `GET /memory/debug/{conversation_id}` - Inspect memory state
  - Query: `?user_id=1`
  - Returns: Raw messages, summary, relevance score

#### Health
- `GET /health` - Engine health check

---

## 🗄️ Database Schema

SQLite database (`database.sqlite`) includes:

### users
```sql
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### messages
```sql
CREATE TABLE messages (
  message_id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  speaker TEXT CHECK(speaker IN ('User', 'AI')),
  message_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

---

## 🎯 Features

- ✅ **Multi-turn Conversations** - Context-aware memory system tracks conversation history
- ✅ **Hybrid Search** - BM25 + Semantic Search + MMR (Maximum Marginal Relevance)
- ✅ **Advanced Reranking** - Cross-encoder model for precision retrieval
- ✅ **GPU-Optimized** - Automatic GPU layer distribution for 8GB VRAM
- ✅ **Secure Authentication** - JWT + HTTP-only cookies with Fastify
- ✅ **Memory Module** - Automatic conversation summarization with LLM
- ✅ **Message Isolation** - Each user only sees their own messages
- ✅ **Streaming Responses** - Real-time response streaming
  
---

## 🎓 Key Concepts

### Conversation Memory
- **What**: Last 8 messages automatically loaded and summarized
- **Why**: Enables multi-turn conversations without context loss
- **How**: LLM summarization + cross-encoder relevance scoring

### Hybrid Retrieval
- **BM25**: Keyword matching (fast, good for exact matches)
- **Semantic**: Vector similarity (good for meaning matching)
- **MMR**: Maximum Marginal Relevance (diverse results)
- **RRF**: Reciprocal Rank Fusion (combines all methods)

### Reranking
- **Purpose**: Re-score top results with more sophisticated model
- **Model**: Cross-encoder (slower but more accurate)
- **Output**: Final ranked documents for LLM context

---

## 📄 License

This project is part of the ChatOCP system for OCP/Prayon process documentation.

---

## ✅ Quick Start Checklist

- [ ] Install Ollama and download models
- [ ] Install Python 3.11+ with CUDA support
- [ ] Install Node.js 18+
- [ ] Clone project to `c:\Users\asus\Desktop\chatocp`
- [ ] Setup Backend: `npm install` in `/server`
- [ ] Setup Frontend: `npm install` in `/client`
- [ ] Setup RAG: Create venv, `pip install -r requirement.txt`
- [ ] Create `.env` files for all three services
- [ ] Start Ollama in Terminal 1
- [ ] Start RAG in Terminal 2
- [ ] Start Backend in Terminal 3
- [ ] Start Frontend in Terminal 4
- [ ] Open http://localhost:3000
- [ ] Register and start chatting!

---

**Last Updated**: December 5, 2025
**Status**: ✅ MVP
















