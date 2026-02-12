'use client';

import { Sparkles, MapPin, DollarSign, Clock, Save, CloudSun, Banknote } from 'lucide-react';
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
}

interface CurrencyData {
  base: string;
  target: string;
  rate: number;
}

export default function ItineraryGenerator() {
  const [destination, setDestination] = useState<string>('istanbul');
  const [duration, setDuration] = useState<string>('4-7');
  const [interest, setInterest] = useState<InterestTag>('culture');
  const [budget, setBudget] = useState<BudgetLevel>('standard');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedItinerary | null>(null);
  const [requestSnapshot, setRequestSnapshot] = useState<ItineraryRequest | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currency, setCurrency] = useState<CurrencyData | null>(null);

  const daysSelected = useMemo(() => DURATION_DAYS[duration] ?? 5, [duration]);

  useEffect(() => {
    let cancelled = false;

    async function loadRealtime() {
      setRealtimeLoading(true);

      try {
        const city = WEATHER_CITY_MAP[destination] ?? destination;
        const [weatherResponse, currencyResponse] = await Promise.all([
          fetch(`/api/v1/realtime/weather?city=${encodeURIComponent(city)}`),
          fetch('/api/v1/realtime/currency?base=USD&target=TRY'),
        ]);

        const weatherBody = (await weatherResponse.json()) as WeatherData;
        const currencyBody = (await currencyResponse.json()) as CurrencyData;

        if (!cancelled) {
          setWeather(weatherResponse.ok ? weatherBody : null);
          setCurrency(currencyResponse.ok ? currencyBody : null);
        }
      } catch {
        if (!cancelled) {
          setWeather(null);
          setCurrency(null);
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
  }, [destination]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSaveResult(null);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + Math.max(1, daysSelected - 1));

    const payload: ItineraryRequest = {
      destinations: [destination],
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
    } catch (saveError) {
      setSaveResult(saveError instanceof Error ? saveError.message : 'Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full bg-blue-50/50 p-6 md:p-8 rounded-2xl border border-blue-100 shadow-lg mb-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-[#0071eb] text-white rounded-xl shadow-md">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1b1d]">AI Itinerary Planner</h2>
          <p className="text-sm text-gray-500">Plan your perfect trip to Turkey in seconds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Where to?</label>
          <div className="relative group">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-700 outline-none appearance-none cursor-pointer text-sm font-medium"
            >
              {DESTINATIONS.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">How long?</label>
          <div className="relative group">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
            <select
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-700 outline-none appearance-none cursor-pointer text-sm font-medium"
            >
              <option value="1-3">1-3 Days</option>
              <option value="4-7">4-7 Days</option>
              <option value="8-14">8-14 Days</option>
              <option value="15+">15+ Days</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Interest</label>
          <div className="relative group">
            <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
            <select
              value={interest}
              onChange={(event) => setInterest(event.target.value as InterestTag)}
              className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-700 outline-none appearance-none cursor-pointer text-sm font-medium"
            >
              <option value="culture">Culture & History</option>
              <option value="adventure">Adventure</option>
              <option value="food">Food & Culinary</option>
              <option value="nature">Nature & Scenic</option>
              <option value="relaxation">Relaxation</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Budget</label>
          <div className="relative group">
            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
            <select
              value={budget}
              onChange={(event) => setBudget(event.target.value as BudgetLevel)}
              className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-700 outline-none appearance-none cursor-pointer text-sm font-medium"
            >
              <option value="budget">Budget Friendly</option>
              <option value="standard">Standard</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-blue-100 bg-white p-3 flex items-center gap-3">
          <CloudSun className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs text-gray-500">Weather ({weather?.city ?? WEATHER_CITY_MAP[destination]})</p>
            <p className="text-sm font-semibold">
              {realtimeLoading ? 'Loading...' : weather ? `${Math.round(weather.temperatureC)}°C, ${weather.description}` : 'Unavailable'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-white p-3 flex items-center gap-3">
          <Banknote className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs text-gray-500">Currency (USD to TRY)</p>
            <p className="text-sm font-semibold">
              {realtimeLoading ? 'Loading...' : currency ? `1 ${currency.base} = ${currency.rate.toFixed(2)} ${currency.target}` : 'Unavailable'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          disabled={loading}
          onClick={handleGenerate}
          className="bg-[#0071eb] hover:bg-[#005fb8] disabled:opacity-70 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform active:scale-95 duration-100"
        >
          <Sparkles className="w-5 h-5 fill-current" />
          {loading ? 'Generating...' : 'Generate My Itinerary'}
        </button>

        {result && (
          <button
            disabled={saving}
            onClick={handleSave}
            className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-70 text-[#1a1b1d] font-bold py-3 px-6 rounded-full shadow-sm transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Itinerary'}
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {saveResult && <p className="mt-4 text-sm text-gray-700">{saveResult}</p>}

      {result && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-bold text-lg mb-1">{result.title}</h3>
          <p className="text-sm text-gray-600 mb-4">Estimated total: {result.totalEstimatedCostTRY} TRY</p>
          <div className="space-y-3">
            {result.days.slice(0, 3).map((day) => (
              <div key={day.day} className="rounded-lg border border-gray-100 p-3">
                <p className="font-semibold text-sm">Day {day.day} - {day.city}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {day.items.length} activities, {day.notes[0] ?? 'Curated by AI'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
