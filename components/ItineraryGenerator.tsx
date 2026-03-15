'use client';

import { Sparkles, MapPin, DollarSign, Clock, CloudSun, Banknote, ArrowUpRight, BookmarkCheck, CalendarRange, CheckCircle2, Route, Navigation, Tag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { BudgetLevel, GeneratedItinerary, InterestTag, ItineraryRequest } from '@/types/travel';
import { useAppPreferences } from '@/lib/preferences-client';
import TransportMapEmbed from '@/components/TransportMapEmbed';

// Only cities that have seeded attractions in the database
const DESTINATIONS = ['istanbul', 'cappadocia', 'ephesus', 'pamukkale', 'antalya', 'bodrum', 'bursa', 'ankara', 'trabzon', 'konya', 'canakkale'] as const;

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
  icon?: string;
  humidity?: number;
  windKph?: number;
  hourly?: Array<{
    time: string;
    temperatureC: number;
    description: string;
    icon?: string;
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

const PLANNER_STORAGE_KEY = 'itinerary-planner-state-v2';

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

function weatherGradient(description?: string) {
  const d = (description ?? '').toLowerCase();
  if (d.includes('clear') || d.includes('sun')) return 'from-amber-300/20 via-sky-300/10 to-transparent';
  if (d.includes('thunder') || d.includes('storm')) return 'from-purple-500/20 via-slate-500/10 to-transparent';
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return 'from-blue-500/20 via-indigo-400/10 to-transparent';
  if (d.includes('snow') || d.includes('sleet') || d.includes('ice')) return 'from-sky-200/25 via-blue-100/10 to-transparent';
  if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return 'from-gray-400/20 via-slate-300/10 to-transparent';
  if (d.includes('cloud')) return 'from-slate-400/15 via-blue-300/10 to-transparent';
  return 'from-sky-400/15 via-blue-300/10 to-transparent';
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
            <div className={`relative overflow-hidden rounded-2xl border border-border-soft bg-linear-to-br ${weatherGradient(weather?.description)} bg-surface-base p-4`}>
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Weather</p>
                  {!realtimeLoading && weather && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-text-body">
                  {weather?.city ?? WEATHER_CITY_MAP[primaryDestination] ?? '—'}
                </p>
              </div>

              {realtimeLoading ? (
                <div className="space-y-2">
                  <div className="h-9 w-20 animate-pulse rounded-lg bg-surface-subtle" />
                  <div className="h-3 w-36 animate-pulse rounded bg-surface-subtle" />
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-16 w-14 animate-pulse rounded-xl bg-surface-subtle" />)}
                  </div>
                </div>
              ) : weather ? (
                <>
                  {/* Temp + icon */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-4xl font-bold tabular-nums text-text-primary leading-none">
                        {Math.round(weather.temperatureC)}°C
                      </p>
                      <p className="mt-1 text-xs text-text-body capitalize">{weather.description}</p>
                    </div>
                    {weather.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                        alt={weather.description}
                        width={64}
                        height={64}
                        className="-mt-2 -mr-1 drop-shadow-md"
                      />
                    ) : (
                      <CloudSun className="h-10 w-10 text-sky-400 opacity-70" />
                    )}
                  </div>

                  {/* Humidity + Wind */}
                  {(weather.humidity !== undefined || weather.windKph !== undefined) && (
                    <div className="mt-3 flex gap-2">
                      {weather.humidity !== undefined && (
                        <div className="flex items-center gap-1 rounded-lg bg-white/40 dark:bg-white/5 border border-border-soft px-2.5 py-1.5">
                          <span className="text-base leading-none">💧</span>
                          <span className="text-[11px] font-semibold text-text-body">{weather.humidity}%</span>
                        </div>
                      )}
                      {weather.windKph !== undefined && (
                        <div className="flex items-center gap-1 rounded-lg bg-white/40 dark:bg-white/5 border border-border-soft px-2.5 py-1.5">
                          <span className="text-base leading-none">💨</span>
                          <span className="text-[11px] font-semibold text-text-body">{weather.windKph} km/h</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hourly forecast strip */}
                  {weather.hourly && weather.hourly.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                      {weather.hourly.slice(0, 4).map((h, i) => (
                        <div key={i} className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl bg-white/40 dark:bg-white/5 border border-border-soft px-2.5 py-2">
                          <p className="text-[10px] text-text-subtle">
                            {new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {h.icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`https://openweathermap.org/img/wn/${h.icon}.png`}
                              alt={h.description}
                              width={32}
                              height={32}
                            />
                          ) : (
                            <CloudSun className="h-5 w-5 text-sky-400" />
                          )}
                          <p className="text-[11px] font-semibold text-text-body">{Math.round(h.temperatureC)}°</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <CloudSun className="h-5 w-5 text-text-subtle" />
                  <p className="text-sm text-text-subtle">Weather unavailable</p>
                </div>
              )}
            </div>

            {/* Currency Card */}
            <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-linear-to-br from-emerald-400/10 via-teal-300/5 to-transparent bg-surface-base p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Exchange Rate</p>
                  {!realtimeLoading && currency && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <span className="text-base leading-none" title="Turkish Lira">🇹🇷</span>
              </div>

              {realtimeLoading ? (
                <div className="space-y-2">
                  <div className="h-9 w-32 animate-pulse rounded-lg bg-surface-subtle" />
                  <div className="h-3 w-24 animate-pulse rounded bg-surface-subtle" />
                  <div className="mt-3 h-10 w-full animate-pulse rounded-xl bg-surface-subtle" />
                </div>
              ) : currency ? (
                <>
                  {/* Main rate */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold tabular-nums text-text-primary leading-none">
                        {currency.rate.toFixed(2)}
                        <span className="ml-1 text-lg font-semibold text-emerald-600">TRY</span>
                      </p>
                      <p className="mt-1 text-xs text-text-muted">per 1 {currency.base}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1">
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Real-time</span>
                    </div>
                  </div>

                  {/* Conversion pills */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[10, 50, 100].map((amount) => (
                      <div key={amount} className="rounded-xl bg-white/40 dark:bg-white/5 border border-border-soft px-2.5 py-2 text-center">
                        <p className="text-[10px] text-text-subtle">{amount} {currency.base}</p>
                        <p className="text-xs font-bold text-text-primary mt-0.5">
                          {(amount * currency.rate).toFixed(0)} <span className="text-emerald-600 font-semibold">₺</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Reverse rate */}
                  <p className="mt-2.5 text-[11px] text-text-subtle text-center">
                    100 TRY = {(100 / currency.rate).toFixed(2)} {currency.base}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <Banknote className="h-5 w-5 text-text-subtle" />
                  <p className="text-sm text-text-subtle">Rate unavailable</p>
                </div>
              )}
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
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-text-primary md:text-2xl">
                    {result.title.replace(/^(.+?)(\s+\d+-day\s+.*)$/i, (_, cities, suffix) =>
                      cities.split(' -> ').map((c: string) => c.charAt(0).toUpperCase() + c.slice(1)).join(' -> ') + suffix
                    )}
                  </h3>
                  <p className="mt-2 text-sm text-text-muted">
                    A structured route across {result.cityOrder.map((city) => formatCityLabel(city)).join(' -> ')} with live transport context and budget-aware activity grouping.
                  </p>
                </div>

                <div className="grid min-w-55 grid-cols-2 gap-3">
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

            <div className="divide-y divide-border-soft">
              {result.days.map((day) => (
                <div key={day.day} className="px-5 py-6 md:px-6">
                  {/* Day header */}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-sm font-bold text-white shadow-sm shadow-brand/30">
                      {day.day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-text-primary">{formatCityLabel(day.city)}</h4>
                        {day.notes.find(n => n.startsWith('Theme: ')) && (
                          <span className="text-sm font-semibold text-text-body">
                            — {day.notes.find(n => n.startsWith('Theme: '))?.replace('Theme: ', '').replace(/['"]/g, '')}
                          </span>
                        )}
                        <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                          {day.items.length} {day.items.length === 1 ? 'activity' : 'activities'}
                        </span>
                      </div>
                      {day.notes.find(n => !n.startsWith('Theme: ') && !n.startsWith('Insider Tip: ')) && (
                        <p className="mt-1 text-xs text-text-muted leading-relaxed">
                          {day.notes.find(n => !n.startsWith('Theme: ') && !n.startsWith('Insider Tip: '))}
                        </p>
                      )}
                    </div>
                    {savedItineraryId && day.day === 1 ? (
                      <Link
                        href={`/itineraries/${savedItineraryId}`}
                        className="ml-auto inline-flex items-center gap-1 rounded-full border border-border-default bg-surface-base px-3 py-1.5 text-xs font-semibold text-text-body transition-colors hover:border-border-strong hover:bg-surface-subtle"
                      >
                        Open full itinerary <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>

                  {/* Activity cards */}
                  {day.items.length === 0 ? (
                    <p className="rounded-xl border border-border-soft bg-surface-subtle px-4 py-3 text-sm text-text-muted">
                      No activities scheduled for this day.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {day.items.map((item, idx) => (
                        <div key={item.attractionId + idx}>
                          {/* Transport connector between activities */}
                          {idx > 0 && item.transportHint && (
                            <div className="mb-3 flex items-center gap-2 px-1">
                              <div className="h-4 w-px bg-border-default" />
                              <Navigation className="h-3 w-3 shrink-0 text-brand" />
                              <p className="text-[11px] text-text-muted">{item.transportHint}</p>
                            </div>
                          )}

                          {/* Activity card */}
                          <div className="group flex gap-3 rounded-2xl border border-border-soft bg-surface-base p-3 transition-colors hover:border-border-default hover:bg-surface-subtle sm:gap-4 sm:p-4">
                            {/* Image */}
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-subtle sm:h-24 sm:w-24">
                              <Image
                                src={`https://picsum.photos/seed/${item.attractionSlug ?? item.attractionId}/200/200`}
                                alt={item.attractionName ?? 'Activity'}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                unoptimized
                              />
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-text-primary">
                                    {item.attractionName ?? 'Activity'}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {item.startTime} – {item.endTime}
                                    </span>
                                    {item.avgDurationMin && (
                                      <span>{item.avgDurationMin} min</span>
                                    )}
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                  ₺{item.costEstimateTRY.toLocaleString()}
                                </span>
                              </div>

                              {item.attractionDescription && (
                                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-body">
                                  {item.attractionDescription}
                                </p>
                              )}

                              {item.attractionTags && item.attractionTags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.attractionTags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center gap-0.5 rounded-full bg-brand/8 px-2 py-0.5 text-[10px] font-semibold text-brand capitalize"
                                    >
                                      <Tag className="h-2.5 w-2.5" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* First activity transport hint (start of day) */}
                              {idx === 0 && item.transportHint && (
                                <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-brand">
                                  <Navigation className="h-3 w-3" />
                                  {item.transportHint}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Day tip / Insider tip */}
                  {(day.notes.find(n => n.startsWith('Insider Tip: ')) || day.notes.find(n => !n.startsWith('Theme: ') && !n.startsWith('Insider Tip: ') && n !== day.notes[0])) && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 dark:border-amber-500/10 dark:bg-amber-500/10">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Concierge Tip
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-text-body">
                          {day.notes.find(n => n.startsWith('Insider Tip: '))?.replace('Insider Tip: ', '') || 
                           day.notes.find(n => !n.startsWith('Theme: ') && !n.startsWith('Insider Tip: ') && n !== day.notes[0])}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
