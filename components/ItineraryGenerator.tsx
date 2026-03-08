'use client';

import { Sparkles, MapPin, DollarSign, Clock, CloudSun, Banknote, ArrowUpRight, BookmarkCheck, CalendarRange, CheckCircle2, Route } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { BudgetLevel, GeneratedItinerary, InterestTag, ItineraryRequest } from '@/types/travel';
import { useAppPreferences } from '@/lib/preferences-client';
import TransportMapEmbed from '@/components/TransportMapEmbed';

const DESTINATIONS = ['cappadocia', 'istanbul', 'ephesus', 'pamukkale', 'antalya', 'bodrum', 'bursa', 'ankara', 'trabzon', 'konya', 'canakkale', 'izmir', 'alanya', 'gaziantep', 'mardin', 'safranbolu'] as const;

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
  bursa: 'Bursa',
  ankara: 'Ankara',
  trabzon: 'Trabzon',
  konya: 'Konya',
  canakkale: 'Canakkale',
  izmir: 'Izmir',
  alanya: 'Alanya',
  gaziantep: 'Gaziantep',
  mardin: 'Mardin',
  safranbolu: 'Karabuk',
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
  try {
    const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PlannerPersistedState>;
  } catch {
    return {};
  }
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatCityLabel(city: string) {
  return city.charAt(0).toUpperCase() + city.slice(1);
}

export default function ItineraryGenerator() {
  const { preferences } = useAppPreferences();
  const userCurrency = preferences.currency;
  const [destinations, setDestinations] = useState<string[]>(['istanbul']);
  const [duration, setDuration] = useState<string>('4-7');
  const [interest, setInterest] = useState<InterestTag>('culture');
  const [budget, setBudget] = useState<BudgetLevel>('standard');
  const [transportFrom, setTransportFrom] = useState<string>('istanbul');
  const [transportMode, setTransportMode] = useState<'car' | 'bus' | 'flight'>('bus');
  const [transportDepartureDate, setTransportDepartureDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [savedItineraryId, setSavedItineraryId] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedItinerary | null>(null);
  const [requestSnapshot, setRequestSnapshot] = useState<ItineraryRequest | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currency, setCurrency] = useState<CurrencyData | null>(null);
  const [transport, setTransport] = useState<TransportData | null>(null);

  const daysSelected = useMemo(() => DURATION_DAYS[duration] ?? 5, [duration]);
  const primaryDestination = destinations[0] ?? 'istanbul';
  const totalActivities = useMemo(
    () => result?.days.reduce((sum, day) => sum + day.items.length, 0) ?? 0,
    [result],
  );
  const previewDays = useMemo(() => result?.days.slice(0, 4) ?? [], [result]);

  useEffect(() => {
    const saved = readPersistedState();

    if (saved.destinations?.length) {
      setDestinations(saved.destinations);
    }
    if (saved.duration) {
      setDuration(saved.duration);
    }
    if (saved.interest) {
      setInterest(saved.interest);
    }
    if (saved.budget) {
      setBudget(saved.budget);
    }
    if (saved.transportFrom) {
      setTransportFrom(saved.transportFrom);
    }
    if (saved.transportMode) {
      setTransportMode(saved.transportMode);
    }

    setTransportDepartureDate(saved.transportDepartureDate ?? getTodayIsoDate());
    setSavedItineraryId(saved.savedItineraryId ?? null);
    setResult(saved.result ?? null);
    setRequestSnapshot(saved.requestSnapshot ?? null);
  }, []);

  /* ── Persist form state to localStorage ── */
  useEffect(() => {
    if (!transportDepartureDate) {
      return;
    }

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

    if (!transportDepartureDate) {
      setRealtimeLoading(false);
      return () => {
        cancelled = true;
      };
    }

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

  async function saveGeneratedItinerary(payload: ItineraryRequest, generatedItinerary: GeneratedItinerary) {
    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/v1/itineraries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestSnapshot: payload,
          generatedPlan: generatedItinerary,
          notes: 'Generated via planner page',
          status: 'saved',
        }),
      });

      if (response.status === 401) {
        setSavedItineraryId(null);
        setSaveResult('Generated successfully. Sign in to auto-save this itinerary.');
        return;
      }

      const body = (await response.json()) as { id?: string; detail?: string };
      if (!response.ok || !body.id) {
        throw new Error(body.detail ?? 'Could not save itinerary');
      }

      setSaveResult('Itinerary generated and saved automatically.');
      setSavedItineraryId(body.id);
    } catch (saveError) {
      setSavedItineraryId(null);
      setSaveResult(saveError instanceof Error ? saveError.message : 'Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  }

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
      await saveGeneratedItinerary(payload, body.itinerary);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  }

  /* ── shared select class ── */
  const selectCls =
    'w-full h-11 pl-10 pr-4 bg-surface-base border border-border-default rounded-lg text-sm text-text-body font-medium outline-none appearance-none cursor-pointer transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10';

  return (
    <div className="w-full bg-surface-base border border-border-default rounded-2xl overflow-hidden mb-8 shadow-sm">
      {/* Header banner */}
      <div className="flex items-center gap-4 px-6 md:px-8 py-5 bg-linear-to-r from-brand/8 via-brand/4 to-transparent border-b border-border-soft">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand shadow-md shadow-brand/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary leading-tight">AI Itinerary Planner</h2>
          <p className="text-xs text-text-muted mt-0.5">Plan your perfect trip to Turkey in seconds</p>
        </div>
      </div>

      <div className="p-6 md:p-8">

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
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
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

          </div>
          <TransportMapEmbed
            from={transportFrom}
            to={primaryDestination}
            mode={transportMode}
            distanceKm={transport?.distanceKm}
            estimatedDurationHours={transport?.estimatedDurationHours}
            recommendation={transport?.recommendation}
            source={transport?.source}
            isLoading={realtimeLoading}
          />
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
            <button
              disabled={loading || saving}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              {loading ? 'Generating…' : saving ? 'Saving…' : 'Generate My Itinerary'}
            </button>
          </div>
        </div>

        {/* Results preview */}
        {result && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border-default bg-surface-base shadow-sm">
            <div className="border-b border-border-soft bg-linear-to-r from-brand/6 via-transparent to-transparent px-5 py-5 md:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                      AI itinerary
                    </span>
                    <span className="rounded-full bg-surface-brand-subtle px-2.5 py-1 text-[10px] font-semibold text-brand">
                      {result.days.length} days
                    </span>
                    {savedItineraryId ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2.5 py-1 text-[10px] font-semibold text-text-body">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Auto-saved
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-text-primary md:text-2xl">{result.title}</h3>
                  <p className="mt-2 text-sm text-text-muted">
                    A structured route across {result.cityOrder.map((city) => formatCityLabel(city)).join(' -> ')} with live transport context and budget-aware activity grouping.
                  </p>
                </div>

                <div className="grid min-w-[220px] grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border-soft bg-surface-subtle px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-text-subtle">Estimated total</p>
                    <p className="mt-1 text-lg font-semibold text-text-primary">{result.totalEstimatedCostTRY} TRY</p>
                  </div>
                  <div className="rounded-2xl border border-border-soft bg-surface-subtle px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-text-subtle">Activities</p>
                    <p className="mt-1 text-lg font-semibold text-text-primary">{totalActivities}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border-soft bg-surface-subtle px-4 py-3">
                  <div className="flex items-center gap-2 text-text-primary">
                    <Route className="h-4 w-4 text-brand" />
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">Route</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {result.cityOrder.map((city) => formatCityLabel(city)).join(' -> ')}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-soft bg-surface-subtle px-4 py-3">
                  <div className="flex items-center gap-2 text-text-primary">
                    <CalendarRange className="h-4 w-4 text-brand" />
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">Trip window</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {requestSnapshot?.startDate} to {requestSnapshot?.endDate}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-soft bg-surface-subtle px-4 py-3">
                  <div className="flex items-center gap-2 text-text-primary">
                    <BookmarkCheck className="h-4 w-4 text-brand" />
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">Status</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {savedItineraryId ? 'Saved to your itinerary library' : 'Generated locally'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 md:px-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-subtle">Preview days</p>
                {savedItineraryId ? (
                  <Link
                    href={`/itineraries/${savedItineraryId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-base px-3 py-2 text-xs font-semibold text-text-body transition-colors hover:border-border-strong hover:bg-surface-subtle"
                  >
                    Open saved itinerary
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {previewDays.map((day) => (
                  <div
                    key={day.day}
                    className="group rounded-2xl border border-border-soft bg-surface-base p-4 transition-colors duration-200 hover:border-border-default hover:bg-surface-subtle"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-sm font-bold text-brand">
                        {day.day}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base font-semibold text-text-primary">{formatCityLabel(day.city)}</p>
                          <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-text-muted">
                            {day.items.length} activities
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-text-body">
                          {day.notes[0] ?? 'Curated by AI for your selected pace, budget, and interests.'}
                        </p>
                        {day.items[0]?.transportHint ? (
                          <p className="mt-3 text-xs font-medium text-brand">
                            Transfer note: {day.items[0].transportHint}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {result.days.length > previewDays.length ? (
                <p className="mt-4 text-sm text-text-muted">
                  + {result.days.length - previewDays.length} more days are available in the saved itinerary view.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
