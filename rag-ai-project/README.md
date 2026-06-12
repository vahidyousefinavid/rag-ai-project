# RAG AI Project

Production-grade RAG (Retrieval-Augmented Generation) system with persistent chat history and session management.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeScript |
| Vector DB | Qdrant |
| Relational DB | PostgreSQL 16 |
| Cache | Redis 7 |
| Embeddings + LLM | Ollama (local) |
| Frontend | React + Vite + TypeScript |

## Versions

### v0.1 — Basic RAG
- Basic RAG pipeline
- Chroma vector DB
- Simple similarity search

### v0.2 — Production RAG + Chat History
- **Qdrant** replacing Chroma (production vector DB, persistent volumes)
- **PostgreSQL** for users, chat sessions, messages
- **Redis** for embedding cache (24h TTL) and query cache (5min TTL)
- **bge-m3** embeddings via Ollama (1024-dim, strong Persian/multilingual support)
- Multi-query expansion (question + 2 variants for better recall)
- Conversation history in RAG prompt (last 6 messages)
- Session auto-titling from first user message
- Minimal dark frontend with session sidebar

## Architecture

```
Client (React/Vite :5173)
    │
    ▼
NestJS API (:3000)
    ├── ChatModule       → PostgreSQL (sessions, messages, users)
    ├── RagModule
    │   ├── RagService   → multi-query + history-aware prompt
    │   ├── VectorService → Qdrant (upsert/search) + Redis embedding cache
    │   └── IngestService → chunk + embed documents on startup
    └── OllamaService    → bge-m3 (embed) + llama3 (generate)

Infrastructure (Docker)
    ├── PostgreSQL :5432
    ├── Qdrant     :6333
    └── Redis      :6379
```

## Setup

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- [Ollama](https://ollama.ai) running on port 7998 with models pulled:
  ```bash
  ollama pull bge-m3
  ollama pull llama3
  ```

### Start infrastructure
```bash
docker compose up -d
```

### Backend
```bash
cd backend
cp .env.example .env   # edit as needed
npm install
npm run start:dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions/users` | Get or create user |
| POST | `/sessions` | Create chat session |
| GET | `/sessions?userId=` | List sessions |
| GET | `/sessions/:id/messages` | Get messages |
| POST | `/sessions/:id/messages` | Send message (triggers RAG) |
| DELETE | `/sessions/:id` | Delete session |

## Ingest documents

Place documents in `backend/src/data/` (`.txt`, `.md`, `.pdf`) and restart the backend — `IngestService` chunks and embeds on `onModuleInit`.

## Performance note (1M+ records)

With bge-m3 on GPU, current one-by-one embedding takes ~28-35 hours for 2.5M chunks.  
Batch embedding optimization (planned for v0.3) reduces this to ~2-3 hours.

## Environment variables

See `backend/.env` — key vars:

```env
POSTGRES_HOST=localhost
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=rag-production
REDIS_HOST=localhost
OLLAMA_BASE_URL=http://127.0.0.1:7998
OLLAMA_EMBED_MODEL=bge-m3
OLLAMA_LLM_MODEL=llama3
```
