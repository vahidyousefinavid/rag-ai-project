export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER ?? 'rag_user',
    password: process.env.POSTGRES_PASSWORD ?? 'rag_password',
    database: process.env.POSTGRES_DB ?? 'rag_db',
  },
  qdrant: {
    url: process.env.QDRANT_URL ?? 'http://localhost:6333',
    collection: process.env.QDRANT_COLLECTION ?? 'rag-production',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:7998',
    embedModel: process.env.OLLAMA_EMBED_MODEL ?? 'bge-m3',
    llmModel: process.env.OLLAMA_LLM_MODEL ?? 'llama3.1',
  },
});
