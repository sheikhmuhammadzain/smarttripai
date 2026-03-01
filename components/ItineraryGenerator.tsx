'use client';

import { Sparkles, MapPin, DollarSign, Clock, Save, CloudSun, Banknote, Bus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { BudgetLevel, GeneratedItinerary, InterestTag, ItineraryRequest } from '@/types/travel';
import { useAppPreferences } from '@/lib/preferences-client';

const DESTINATIONS = ['cappadocia', 'istanbul', 'ephesus', 'pamukkale', 'antalya', 'bodrum'] as const;

const DURATION_DAYS: Record<string, number> = {
  '1-3': 3,
  '4-7': 7,
  '8-14': 14,
  '15+': 15,
};

const WEATHER_CITY_MAP: Record<string, string> = {
  cappadocia: 'Nevsehir',
  istanbul: 'Istanbul',
  ephesus: 'Izmir',
  pamukkale: 'Denizli',
  antalya: 'Antalya',
  bodrum: 'Bodrum',
};

interface WeatherData {
  city: string;
  temperatureC: number;
  description: string;
  hourly?: Array<{
    time: string;
    temperatureC: number;
    description: string;
  }>;
}

interface CurrencyData {
  base: string;
  target: string;
  rate: number;
}

interface TransportData {
  from: string;
  to: string;
  mode: 'car' | 'bus' | 'flight';
  distanceKm: number;
  estimatedDurationHours: number;
  recommendation: string;
  source?: 'google-distance-matrix' | 'heuristic';
}

const PLANNER_STORAGE_KEY = 'itinerary-planner-state';

interface PlannerPersistedState {
  destinations: string[];
  duration: string;
  interest: InterestTag;
  budget: BudgetLevel;
  transportFrom: string;
  transportMode: 'car' | 'bus' | 'flight';
  transportDepartureDate: string;
  result: GeneratedItinerary | null;
  requestSnapshot: ItineraryRequest | null;
  savedItineraryId: string | null;
}

function readPersistedState(): Partial<PlannerPersistedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PlannerPersistedState>;
  } catch {
    return {};
  }
}

export default function ItineraryGenerator() {
  const { preferences } = useAppPreferences();
  const userCurrency = preferences.currency;
  const saved = useMemo(() => readPersistedState(), []);

  const [destinations, setDestinations] = useState<string[]>(
    () => saved.destinations?.length ? saved.destinations : ['istanbul'],
  );
  const [duration, setDuration] = useState<string>(saved.duration ?? '4-7');
  const [interest, setInterest] = useState<InterestTag>(saved.interest ?? 'culture');
  const [budget, setBudget] = useState<BudgetLevel>(saved.budget ?? 'standard');
  const [transportFrom, setTransportFrom] = useState<string>(saved.transportFrom ?? 'istanbul');
  const [transportMode, setTransportMode] = useState<'car' | 'bus' | 'flight'>(saved.transportMode ?? 'bus');
  const [transportDepartureDate, setTransportDepartureDate] = useState<string>(
    () => saved.transportDepartureDate ?? new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [savedItineraryId, setSavedItineraryId] = useState<string | null>(saved.savedItineraryId ?? null);
  const [result, setResult] = useState<GeneratedItinerary | null>(saved.result ?? null);
  const [requestSnapshot, setRequestSnapshot] = useState<ItineraryRequest | null>(saved.requestSnapshot ?? null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currency, setCurrency] = useState<CurrencyData | null>(null);
  const [transport, setTransport] = useState<TransportData | null>(null);

  const daysSelected = useMemo(() => DURATION_DAYS[duration] ?? 5, [duration]);
  const primaryDestination = destinations[0] ?? 'istanbul';

  /* ── Persist form state to localStorage ── */
  useEffect(() => {
    const state: PlannerPersistedState = {
      destinations,
      duration,
      interest,
      budget,
      transportFrom,
      transportMode,
      transportDepartureDate,
      result,
      requestSnapshot,
      savedItineraryId,
    };
    try {
      window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — silently ignore.
    }
  }, [destinations, duration, interest, budget, transportFrom, transportMode, transportDepartureDate, result, requestSnapshot, savedItineraryId]);

  function toggleDestination(city: string) {
    setDestinations((prev) => {
      if (prev.includes(city)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((item) => item !== city);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, city];
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadUserPreferences() {
      try {
        const response = await fetch('/api/v1/users/me/preferences');
        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as {
          preferredBudget?: BudgetLevel;
          preferredCities?: string[];
          preferredInterests?: InterestTag[];
        };

        if (cancelled) {
          return;
        }

        if (body.preferredBudget) {
          setBudget(body.preferredBudget);
        }
        if (body.preferredCities?.length) {
          const normalizedCities = body.preferredCities
            .map((city) => city.toLowerCase())
            .filter((city): city is string => DESTINATIONS.includes(city as (typeof DESTINATIONS)[number]))
            .slice(0, 4);

          if (normalizedCities.length) {
            setDestinations(normalizedCities);
            setTransportFrom(normalizedCities[0]);
          }
        }
        if (body.preferredInterests?.[0]) {
          setInterest(body.preferredInterests[0]);
        }
      } catch {
        // Non-blocking personalization fetch.
      }
    }

    void loadUserPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRealtime() {
      setRealtimeLoading(true);

      try {
        const city = WEATHER_CITY_MAP[primaryDestination] ?? primaryDestination;
        const [weatherResponse, currencyResponse, transportResponse] = await Promise.all([
          fetch(`/api/v1/realtime/weather?city=${encodeURIComponent(city)}&hours=6`),
          fetch(`/api/v1/realtime/currency?base=${encodeURIComponent(userCurrency)}&target=TRY`),
          fetch(
            `/api/v1/realtime/transport?from=${encodeURIComponent(transportFrom)}&to=${encodeURIComponent(
              primaryDestination,
            )}&mode=${transportMode}&departureAt=${encodeURIComponent(`${transportDepartureDate}T09:00:00.000Z`)}`,
          ),
        ]);

        const weatherBody = (await weatherResponse.json()) as WeatherData;
        const currencyBody = (await currencyResponse.json()) as CurrencyData;
        const transportBody = (await transportResponse.json()) as TransportData;

        if (!cancelled) {
          setWeather(weatherResponse.ok ? weatherBody : null);
          setCurrency(currencyResponse.ok ? currencyBody : null);
          setTransport(transportResponse.ok ? transportBody : null);
        }
      } catch {
        if (!cancelled) {
          setWeather(null);
          setCurrency(null);
          setTransport(null);
        }
      } finally {
        if (!cancelled) {
          setRealtimeLoading(false);
        }
      }
    }

    void loadRealtime();
    return () => {
      cancelled = true;
    };
  }, [primaryDestination, transportDepartureDate, transportFrom, transportMode, userCurrency]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSaveResult(null);
    setSavedItineraryId(null);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + Math.max(1, daysSelected - 1));

    const payload: ItineraryRequest = {
      destinations,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      budgetLevel: budget,
      interests: [interest],
      travelers: 1,
      pace: 'balanced',
    };

    try {
      const response = await fetch('/api/v1/itineraries/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { itinerary?: GeneratedItinerary; detail?: string };
      if (!response.ok || !body.itinerary) {
        throw new Error(body.detail ?? 'Could not generate itinerary');
      }

      setResult(body.itinerary);
      setRequestSnapshot(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result || !requestSnapshot) {
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/v1/itineraries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestSnapshot,
          generatedPlan: result,
          notes: 'Generated via planner page',
          status: 'saved',
        }),
      });

      if (response.status === 401) {
        throw new Error('Sign in first to save itineraries.');
      }

      const body = (await response.json()) as { id?: string; detail?: string };
      if (!response.ok || !body.id) {
        throw new Error(body.detail ?? 'Could not save itinerary');
      }

      setSaveResult(`Saved itinerary ${body.id}`);
      setSavedItineraryId(body.id);
    } catch (saveError) {
      setSaveResult(saveError instanceof Error ? saveError.message : 'Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  }

  /* ── shared select class ── */
  const selectCls =
    'w-full h-11 pl-10 pr-4 bg-surface-base border border-border-default rounded-lg text-sm text-text-body font-medium outline-none appearance-none cursor-pointer transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10';

  return (
    <div className="w-full bg-surface-base border border-border-default rounded-2xl p-6 md:p-8 mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary leading-tight">AI Itinerary Planner</h2>
          <p className="text-xs text-text-subtle mt-0.5">Plan your perfect trip to Turkey in seconds</p>
        </div>
      </div>

      {/* Row 1 — 4 core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Destinations */}
        <div>
          <label className="block text-[10px] font-semibold text-text-subtle mb-1.5 uppercase tracking-widest">
            Destinations (up to 4)
          </label>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border-default bg-surface-base p-2">
            <MapPin className="mt-1 h-4 w-4 text-text-subtle" />
            {DESTINATIONS.map((item) => {
              const active = destinations.includes(item);
              return (
                <button
                  key={`destination-${item}`}
                  type="button"
                  onClick={() => toggleDestination(item)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${active
                    ? 'border-brand bg-brand text-white'
                    : 'border-border-default bg-surface-base text-text-body hover:bg-surface-subtle'
                    }`}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-text-subtle">
            Route: {destinations.map((item) => item.charAt(0).toUpperCase() + item.slice(1)).join(' -> ')}
          </p>
        </div>

        {/* How long */}
        <div>
          <label className="block text-[10px] font-semibold text-text-subtle mb-1.5 uppercase tracking-widest">How long?</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className={selectCls}>
              <option value="1-3">1-3 Days</option>
              <option value="4-7">4-7 Days</option>
              <option value="8-14">8-14 Days</option>
              <option value="15+">15+ Days</option>
            </select>
          </div>
        </div>

        {/* Interest */}
        <div>
          <label className="block text-[10px] font-semibold text-text-subtle mb-1.5 uppercase tracking-widest">Interest</label>
          <div className="relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
            <select value={interest} onChange={(e) => setInterest(e.target.value as InterestTag)} className={selectCls}>
              <option value="culture">Culture & History</option>
              <option value="adventure">Adventure</option>
              <option value="food">Food & Culinary</option>
              <option value="nature">Nature & Scenic</option>
              <option value="relaxation">Relaxation</option>
            </select>
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-[10px] font-semibold text-text-subtle mb-1.5 uppercase tracking-widest">Budget</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
            <select value={budget} onChange={(e) => setBudget(e.target.value as BudgetLevel)} className={selectCls}>
              <option value="budget">Budget Friendly</option>
              <option value="standard">Standard</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>
        </div>
      </div>

      {/* Row 2 — Transport */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-text-subtle mb-1.5 uppercase tracking-widest">Transport from</label>
          <select
            value={transportFrom}
            onChange={(e) => setTransportFrom(e.target.value)}
            className="h-11 w-full rounded-lg border border-border-default px-3 text-sm text-text-body font-medium outline-none appearance-none cursor-pointer focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors bg-surface-base"
          >
            {DESTINATIONS.map((item) => (
              <option key={`from-${item}`} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-text-subtle mb-1.5 uppercase tracking-widest">Transport mode</label>
          <select
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value as 'car' | 'bus' | 'flight')}
            className="h-11 w-full rounded-lg border border-border-default px-3 text-sm text-text-body font-medium outline-none appearance-none cursor-pointer focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors bg-surface-base"
          >
            <option value="bus">Bus</option>
            <option value="car">Car</option>
            <option value="flight">Flight</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-text-subtle mb-1.5 uppercase tracking-widest">Departure date</label>
          <input
            type="date"
            value={transportDepartureDate}
            onChange={(e) => setTransportDepartureDate(e.target.value)}
            className="h-11 w-full rounded-lg border border-border-default px-3 text-sm text-text-body font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors bg-surface-base"
          />
        </div>
      </div>

      {/* Row 3 — Live Data Cards */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Weather Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-surface-base p-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle">
              <CloudSun className="h-5 w-5 text-sky-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Weather
                </p>
                {!realtimeLoading && weather && (
                  <span className="flex items-center gap-1 rounded-full bg-surface-subtle px-1.5 py-0.5 text-[9px] font-semibold text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-text-primary truncate">
                {realtimeLoading ? (
                  <span className="inline-block h-4 w-28 animate-pulse rounded bg-surface-subtle" />
                ) : weather ? (
                  `${Math.round(weather.temperatureC)}°C — ${weather.description}`
                ) : (
                  <span className="text-text-subtle">Unavailable</span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {weather?.city ?? WEATHER_CITY_MAP[primaryDestination]}
                {weather?.hourly?.[0] && (
                  <span className="ml-1.5 text-text-subtle">
                    · Next {Math.round(weather.hourly[0].temperatureC)}°C at{' '}
                    {new Date(weather.hourly[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Currency Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-surface-base p-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle">
              <Banknote className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Exchange Rate
                </p>
                {!realtimeLoading && currency && (
                  <span className="flex items-center gap-1 rounded-full bg-surface-subtle px-1.5 py-0.5 text-[9px] font-semibold text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-text-primary">
                {realtimeLoading ? (
                  <span className="inline-block h-4 w-32 animate-pulse rounded bg-surface-subtle" />
                ) : currency ? (
                  <>
                    1 {currency.base} = <span className="text-emerald-600">{currency.rate.toFixed(2)}</span> {currency.target}
                  </>
                ) : (
                  <span className="text-text-subtle">Unavailable</span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {userCurrency} → TRY
                <span className="ml-1.5 text-text-subtle">· Updated in real-time</span>
              </p>
            </div>
          </div>
        </div>

        {/* Transport Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-surface-base p-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle">
              <Bus className="h-5 w-5 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Transport
                </p>
                {!realtimeLoading && transport?.source && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${transport.source === 'google-distance-matrix'
                    ? 'bg-surface-subtle text-emerald-500'
                    : 'bg-surface-subtle text-amber-500'
                    }`}>
                    {transport.source === 'google-distance-matrix' ? 'Google Maps' : 'Estimate'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-text-primary">
                {realtimeLoading ? (
                  <span className="inline-block h-4 w-24 animate-pulse rounded bg-surface-subtle" />
                ) : transport ? (
                  <>
                    {transport.distanceKm} km <span className="font-normal text-text-muted">·</span> ~{transport.estimatedDurationHours}h
                  </>
                ) : (
                  <span className="text-text-subtle">Unavailable</span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted truncate">
                {transportFrom.charAt(0).toUpperCase() + transportFrom.slice(1)} → {primaryDestination.charAt(0).toUpperCase() + primaryDestination.slice(1)}
                {transport?.recommendation && (
                  <span className="ml-1.5 text-text-subtle hidden sm:inline">· {transport.recommendation}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider + Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-5">
        <div className="flex flex-wrap gap-2">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {saveResult && <p className="text-xs text-text-muted">{saveResult}</p>}
          {savedItineraryId && (
            <Link
              href={`/itineraries/${savedItineraryId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-border-strong hover:bg-surface-subtle"
            >
              View saved itinerary →
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {result && (
            <button
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-body transition-colors hover:bg-surface-subtle disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          <button
            disabled={loading}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            {loading ? 'Generating…' : 'Generate My Itinerary'}
          </button>
        </div>
      </div>

      {/* Results preview */}
      {result && (
        <div className="mt-5 rounded-xl border border-border-default bg-surface-base p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-bold text-base text-text-primary">{result.title}</h3>
            <span className="shrink-0 text-xs font-medium text-text-subtle">{result.totalEstimatedCostTRY} TRY</span>
          </div>
          <div className="space-y-2">
            {result.days.slice(0, 3).map((day) => (
              <div key={day.day} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">{day.day}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-body truncate">{day.city}</p>
                  <p className="text-[11px] text-text-muted">{day.items.length} activities · {day.notes[0] ?? 'Curated by AI'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
