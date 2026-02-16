# Operations Runbook

## Services
- Next.js app + API routes (`/api/v1/*`)
- MongoDB Atlas
- OpenRouter/OpenAI (optional fallback to deterministic)
- OpenWeather + ExchangeRate providers (optional fallback responses)

## Required Environment Variables
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (for client map rendering)

Optional providers:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `EMAIL_SERVER`, `EMAIL_FROM`
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENWEATHER_API_KEY`
- `EXCHANGERATE_API_KEY`
- `SENTRY_DSN`

## Deploy Checklist
1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`
6. Verify health endpoint: `GET /api/v1/health`
7. Smoke test:
   - `POST /api/v1/itineraries/generate`
   - `GET /api/v1/realtime/weather?city=Istanbul`
   - `GET /api/v1/realtime/currency?base=USD&target=TRY`

## Incident Playbooks

### AI provider errors / rate limits
1. Confirm `OPENROUTER_API_KEY` or `OPENAI_API_KEY` validity.
2. Check logs for AI warnings.
3. Service automatically falls back to deterministic itinerary/chat response.
4. Keep API online; do not disable generation endpoint.

### External realtime API outage
1. Check `OPENWEATHER_API_KEY` / `EXCHANGERATE_API_KEY`.
2. Endpoint serves cached data when available.
3. If provider unavailable and cache expired, fallback response is returned.

### MongoDB connectivity issues
1. Validate `MONGODB_URI`.
2. Confirm Atlas IP/network access and user credentials.
3. Check app logs for connection bootstrap errors.
4. After recovery, replay failed save operations if needed.

## Notes
- Rate limiting is in-memory; for multi-instance production replace with Redis.
- Current monitoring logger is JSON-structured logs; connect to Sentry/analytics in deployment platform.
