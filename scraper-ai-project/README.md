# Scraper AI Project

Company website crawler / scraper with scheduled change-monitoring, multi-channel notifications,
and RAG-powered chat over the crawled content. Forked from `rag-ai-project`, reusing its
Ollama + Qdrant + Redis + chat-history stack; the "RAG sources" concept is replaced with
"monitored websites".

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeScript |
| Crawling | Playwright (headless Chromium) |
| Vector DB | Qdrant |
| Relational DB | PostgreSQL 16 |
| Cache | Redis 7 |
| Embeddings + LLM | Ollama (local) |
| Scheduling | @nestjs/schedule (cron) |
| Frontend | React + Vite + TypeScript |

## What it does

1. Add a company website (name + URL + how many pages to crawl).
2. On a schedule you choose (hourly / every 6h / daily / weekly / custom cron), it re-crawls
   up to N same-domain pages with Playwright, extracts page text plus heuristic company info
   (emails, phone numbers, social links, address lines).
3. Crawled text is chunked and embedded into Qdrant, scoped by monitor id — same RAG chat
   pipeline as the original project, with per-monitor, multi-thread saved chat history.
4. If the crawled content changed since the last check, an LLM (Ollama) summarizes what changed
   (optionally focused by a free-text "what to check" hint) and sends it via whichever channels
   you enabled: Email (SMTP), Telegram bot, generic Webhook, SMS (Kavenegar).
5. Every check is logged (`monitor_runs`) and viewable per-monitor via the History panel.

## Architecture

```
Client (React/Vite :5174)
    │
    ▼
NestJS API (:3002)
    ├── ChatModule        → PostgreSQL (sessions, messages) — per-monitor threads
    ├── RagModule         → RagService (search + prompt) + VectorService (Qdrant) + Redis cache
    ├── MonitorModule
    │   ├── MonitorService   → create/list/remove, runCheck (crawl → diff → index → notify)
    │   ├── MonitorScheduler → cron tick (EVERY_MINUTE), runs due targets
    │   ├── CrawlerService   → Playwright multi-page crawl + heuristic info extraction
    │   └── notify/          → EmailService, TelegramService, WebhookService, SmsService
    └── OllamaService     → bge-m3 (embed) + llama3.1 (generate + diff summaries)

Infrastructure (Docker, separate from rag-ai-project)
    ├── PostgreSQL :5434
    ├── Qdrant     :6335 (+6336)
    └── Redis      :6380
```

## Setup

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- [Ollama](https://ollama.ai) running on port 7998 (shared with rag-ai-project) with models pulled:
  ```bash
  ollama pull bge-m3
  ollama pull llama3.1
  ```
- Playwright's Chromium browser: `npx playwright install chromium` (run once inside `backend/`)

### Start infrastructure
```bash
docker compose up -d
```

### Backend

> **Windows note:** `npm run start:dev` (Nest's `--watch` mode) runs the server through an
> extra shell-spawned child process, which breaks Playwright's own process spawning
> (`browserType.launch: spawn UNKNOWN`) on Windows. For any real crawling, build once and run
> the compiled output instead:
> ```bash
> npm run build
> npm run start:prod
> ```
> `start:dev` is still fine for iterating on non-crawler code (routes, chat, etc.) where you
> never trigger an actual crawl.

```bash
cd backend
npm install
npm run build
npm run start:prod
```

Fill in `backend/.env` for whichever notification channels you want active:
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — email
- `TELEGRAM_BOT_TOKEN` — create a bot via @BotFather
- `KAVENEGAR_API_KEY` / `KAVENEGAR_SENDER` — SMS (Kavenegar)

A channel silently no-ops (logs a warning) if its config is left empty.

### Frontend
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5174`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/monitors` | List monitored websites |
| POST | `/monitors` | Add a website (starts an immediate first crawl) |
| DELETE | `/monitors/:id` | Remove a monitor (and its vectors/history) |
| POST | `/monitors/:id/check-now` | Trigger an out-of-schedule check |
| GET | `/monitors/:id/runs` | Check history (changed/summary/error per run) |
| POST | `/sessions/by-source` / `GET /sessions/by-source?sourceId=` | Chat threads scoped to a monitor |
| POST | `/sessions/:id/messages` | Ask a question (RAG over that monitor's crawled content) |

## Notes

- First crawl of a monitor is the baseline — no "changed" notification fires until the *second*
  successful check finds a different content hash.
- The crawler follows same-origin links up to depth 2, breadth-first, capped at `maxPages`, with
  4 pages fetched concurrently. It also reads `sitemap.xml` (root + one level of sitemap-index
  nesting) to seed extra starting URLs beyond what the link graph alone would reach.
- Respects `robots.txt` (disallow rules + `crawl-delay`) under a self-identifying `ScraperBot`
  token; refuses to crawl a root URL that's disallowed.
- Anti-block hardening: `playwright-extra` + stealth plugin, rotating User-Agent/viewport per
  crawl, image/font/media requests blocked for speed, retry with exponential backoff on
  transient failures, and a circuit breaker that aborts early on repeated 403/429s or failures
  instead of grinding through a site that's actively blocking it.
- If `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` is set in the environment, the crawler's browser
  uses it — Playwright doesn't inherit these automatically the way most HTTP clients do, which
  matters on networks that require a local proxy to reach the outside world at all.
- Structured company-info extraction (email/phone/social/address) is heuristic-based, not a
  guaranteed-accurate parser.
