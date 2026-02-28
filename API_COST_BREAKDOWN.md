# API Cost Breakdown (USD)

Last updated: February 20, 2026

## Project usage (from code)
- Google Maps JavaScript API map load: `components/TurkeyMap.tsx:37`
- Google Distance Matrix request: `modules/realtime/transport.service.ts:80`
- OpenWeather current + forecast: `modules/realtime/weather.service.ts:64`, `modules/realtime/weather.service.ts:69`
- ExchangeRate latest endpoint: `modules/realtime/currency.service.ts:38`
- OpenRouter chat/completions: `modules/ai/itinerary-ai.service.ts:25`, `modules/ai/chat.service.ts:142`

## 1) Google Maps
- Dynamic Maps (JS map loads): first 10,000 free/month, then about `$7 / 1,000` loads.
- Routes/Matrix-style requests: first 10,000 free/month, then about `$5 / 1,000` requests.
- Your transport integration uses Distance Matrix endpoint; SKU mapping can vary by Google billing setup.

Cost formulas:
- `Map cost = max(0, map_loads - 10000) / 1000 * 7`
- `Distance cost = max(0, matrix_requests - 10000) / 1000 * 5`

## 2) OpenRouter
- Current model in `.env.local`: `stepfun/step-3.5-flash:free`
- Current model price: `$0` input / `$0` output (while free listing remains active).
- If you purchase credits with card, OpenRouter may apply payment processing fees (commonly ~5.5%).

## 3) OpenWeather
- Current Weather + 5-day Forecast endpoints are available in free tiers.
- Typical free allowance is around `1,000 calls/day` (plan-dependent).
- Paid tiers/products vary; One Call by Call is commonly listed from `$0.15 / 100 calls`.

## 4) ExchangeRate-API
- Free: `1,500 requests/month`
- Pro: `$5/month` for `5,000 requests/month`
- Business: `$10/month` for `100,000 requests/month`
- Volume: `$20/month` for `500,000 requests/month`

## Why your costs should stay low
Your code caches provider responses:
- Weather cache: `30 min` (`modules/realtime/weather.service.ts:4`)
- Currency cache: `12 hr` (`modules/realtime/currency.service.ts:4`)
- Transport cache: `24 hr` (`modules/realtime/transport.service.ts:4`)

This significantly reduces paid API calls. In practice, Google Maps loads are likely the first major cost driver as traffic grows.

## Sources
- Google Maps pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Google Routes billing: https://developers.google.com/maps/documentation/routes/usage-and-billing
- OpenRouter FAQ/pricing notes: https://openrouter.ai/docs/faq#how-does-openrouter-make-money
- OpenRouter model page: https://openrouter.ai/stepfun/step-3.5-flash:free
- OpenWeather pricing: https://openweathermap.org/price
- OpenWeather One Call by Call: https://home.openweathermap.org/subscriptions/onecall-by-call
- ExchangeRate-API pricing: https://www.exchangerate-api.com/pricing

## Security note
If API keys are committed or shared in plaintext, rotate and replace them immediately.
