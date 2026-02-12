# AI-Powered Travel Planner for Turkey

Modular full-stack Next.js app with MongoDB, NextAuth, versioned APIs, itinerary generation, realtime travel data, and AI assistant support.

## Stack
- Next.js App Router (TypeScript)
- MongoDB Atlas + Mongoose
- NextAuth (Google + Email magic link support)
- OpenAI (hybrid with deterministic fallback)
- Mapbox (`react-map-gl`)
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

## Setup
1. Copy `.env.example` to `.env.local`.
2. Fill required variables:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
3. Install and run:

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
