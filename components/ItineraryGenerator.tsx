'use client';

import { Sparkles, MapPin, DollarSign, Clock, Save, CloudSun, Banknote, Bus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { BudgetLevel, GeneratedItinerary, InterestTag, ItineraryRequest } from '@/types/travel';

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

export default function ItineraryGenerator() {
  const [destinations, setDestinations] = useState<string[]>(['istanbul']);
  const [duration, setDuration] = useState<string>('4-7');
  const [interest, setInterest] = useState<InterestTag>('culture');
  const [budget, setBudget] = useState<BudgetLevel>('standard');
  const [transportFrom, setTransportFrom] = useState<string>('istanbul');
  const [transportMode, setTransportMode] = useState<'car' | 'bus' | 'flight'>('bus');
  const [transportDepartureDate, setTransportDepartureDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
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
          fetch('/api/v1/realtime/currency?base=USD&target=TRY'),
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
  }, [primaryDestination, transportDepartureDate, transportFrom, transportMode]);

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
    'w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium outline-none appearance-none cursor-pointer transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10';

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 md:p-8 mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">AI Itinerary Planner</h2>
          <p className="text-xs text-gray-400 mt-0.5">Plan your perfect trip to Turkey in seconds</p>
        </div>
      </div>

      {/* Row 1 — 4 core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Destinations */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">
            Destinations (up to 4)
          </label>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-white p-2">
            <MapPin className="mt-1 h-4 w-4 text-gray-300" />
            {DESTINATIONS.map((item) => {
              const active = destinations.includes(item);
              return (
                <button
                  key={`destination-${item}`}
                  type="button"
                  onClick={() => toggleDestination(item)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Route: {destinations.map((item) => item.charAt(0).toUpperCase() + item.slice(1)).join(' -> ')}
          </p>
        </div>

        {/* How long */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">How long?</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
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
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">Interest</label>
          <div className="relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
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
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">Budget</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
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
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">Transport from</label>
          <select
            value={transportFrom}
            onChange={(e) => setTransportFrom(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 font-medium outline-none appearance-none cursor-pointer focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors bg-white"
          >
            {DESTINATIONS.map((item) => (
              <option key={`from-${item}`} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">Transport mode</label>
          <select
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value as 'car' | 'bus' | 'flight')}
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 font-medium outline-none appearance-none cursor-pointer focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors bg-white"
          >
            <option value="bus">Bus</option>
            <option value="car">Car</option>
            <option value="flight">Flight</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">Departure date</label>
          <input
            type="date"
            value={transportDepartureDate}
            onChange={(e) => setTransportDepartureDate(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors bg-white"
          />
        </div>
      </div>

      {/* Row 3 — Live info strips */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Weather */}
        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <CloudSun className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Weather ({weather?.city ?? WEATHER_CITY_MAP[primaryDestination]})</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-800 truncate">
              {realtimeLoading ? <span className="animate-pulse text-gray-300">—</span> : weather ? `${Math.round(weather.temperatureC)}°C, ${weather.description}` : 'Unavailable'}
            </p>
            {weather?.hourly?.[0] && (
              <p className="text-[11px] text-gray-400">
                Next: {Math.round(weather.hourly[0].temperatureC)}°C at{' '}
                {new Date(weather.hourly[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        {/* Currency */}
        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Currency (USD to TRY)</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-800">
              {realtimeLoading ? <span className="animate-pulse text-gray-300">—</span> : currency ? `1 ${currency.base} = ${currency.rate.toFixed(2)} ${currency.target}` : 'Unavailable'}
            </p>
          </div>
        </div>

        {/* Transport info */}
        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <Bus className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Transport ({transportFrom} → {primaryDestination})</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-800">
              {realtimeLoading ? <span className="animate-pulse text-gray-300">—</span> : transport ? `${transport.distanceKm} km, ~${transport.estimatedDurationHours}h` : 'Unavailable'}
            </p>
            {transport?.recommendation && (
              <p className="text-[11px] text-gray-400 line-clamp-2">{transport.recommendation}</p>
            )}
            {transport?.source && (
              <p className="text-[11px] text-gray-400">
                Source: {transport.source === 'google-distance-matrix' ? 'Google Distance Matrix' : 'Estimated fallback'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Divider + Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
        <div className="flex flex-wrap gap-2">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {saveResult && <p className="text-xs text-gray-500">{saveResult}</p>}
          {savedItineraryId && (
            <Link
              href={`/itineraries/${savedItineraryId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
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
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-bold text-base text-gray-900">{result.title}</h3>
            <span className="shrink-0 text-xs font-medium text-gray-400">{result.totalEstimatedCostTRY} TRY</span>
          </div>
          <div className="space-y-2">
            {result.days.slice(0, 3).map((day) => (
              <div key={day.day} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">{day.day}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{day.city}</p>
                  <p className="text-[11px] text-gray-400">{day.items.length} activities · {day.notes[0] ?? 'Curated by AI'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
