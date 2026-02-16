# AI-Powered Travel Planner for Turkey

Modular full-stack Next.js app with MongoDB, NextAuth, versioned APIs, itinerary generation, realtime travel data, and AI assistant support.

## Stack
- Next.js App Router (TypeScript)
- MongoDB Atlas + Mongoose
- NextAuth (credentials-based auth)
- OpenAI/OpenRouter (hybrid with deterministic fallback)
- Google Maps JavaScript API
- Zod validation + RFC7807-style API errors

## Architecture
- API namespace: `/api/v1/*`
- Domain modules in `modules/*`
- Infrastructure in `lib/*`
- Types in `types/*`
- OpenAPI spec in `openapi/travel-planner-v1.yaml`

## Implemented Endpoints
- `GET /api/v1/health`
- `GET /api/v1/attractions`
- `GET /api/v1/itineraries`
- `POST /api/v1/itineraries`
- `POST /api/v1/itineraries/generate`
- `GET|PATCH|DELETE /api/v1/itineraries/:id`
- `POST /api/v1/assistant/chat`
- `GET /api/v1/realtime/weather`
- `GET /api/v1/realtime/currency`
- `GET /api/v1/realtime/transport`
- `GET|PATCH /api/v1/users/me/preferences`
- `POST /api/v1/feedback`
- `GET /api/v1/orders`
- `GET /api/v1/users/me`
- `GET /api/v1/users/me/dashboard`
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/itineraries`
- `POST /api/v1/checkout`

## Setup
1. Copy `.env.example` to `.env.local`.
2. Fill required variables:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `ADMIN_EMAILS` (comma-separated admin emails for `/admin`)
3. Optional AI provider (pick one):
   - OpenRouter:
     - `OPENROUTER_API_KEY`
     - `OPENROUTER_MODEL` (example: `meta-llama/llama-3.1-8b-instruct:free`)
     - `OPENROUTER_SITE_URL`
     - `OPENROUTER_APP_NAME`
   - OpenAI:
     - `OPENAI_API_KEY`
     - `OPENAI_MODEL`
4. Install and run:

```bash
pnpm install
pnpm dev
```

## Data Seed
Seed curated Turkey attractions:

```bash
pnpm seed:attractions
```

## Quality Gates
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## CI
GitHub Actions workflow is configured at `.github/workflows/ci.yml` with:
- lint
- typecheck
- unit tests
- build

## Operations
Runbook: `docs/OPERATIONS.md`
