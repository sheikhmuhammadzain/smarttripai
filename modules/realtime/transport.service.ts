import { getServerEnv } from "@/lib/env/server";
import { getCachedPayload, setCachedPayload } from "@/modules/realtime/cache.repository";

const TRANSPORT_TTL_MS = 1000 * 60 * 60 * 24;

const cityCoordinates: Record<string, [number, number]> = {
  istanbul: [41.0082, 28.9784],
  ankara: [39.9334, 32.8597],
  izmir: [38.4237, 27.1428],
  antalya: [36.8969, 30.7133],
  cappadocia: [38.6431, 34.8272],
  konya: [37.8746, 32.4932],
  bodrum: [37.0344, 27.4305],
  trabzon: [41.0027, 39.7168],
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(from: [number, number], to: [number, number]) {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(to[0] - from[0]);
  const lonDiff = toRadians(to[1] - from[1]);

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(toRadians(from[0])) * Math.cos(toRadians(to[0])) * Math.sin(lonDiff / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c);
}

function speedByMode(mode: "car" | "bus" | "flight") {
  if (mode === "flight") return 650;
  if (mode === "car") return 75;
  return 55;
}

type TransportSource = "google-distance-matrix" | "heuristic";

interface TransportPayload {
  from: string;
  to: string;
  mode: "car" | "bus" | "flight";
  distanceKm: number;
  estimatedDurationHours: number;
  recommendation: string;
  source: TransportSource;
}

function defaultRecommendation(mode: "car" | "bus" | "flight") {
  if (mode === "flight") {
    return "Book at least 2 weeks early for better domestic fares.";
  }
  if (mode === "car") {
    return "Plan for toll roads and rest stops on long intercity drives.";
  }
  return "Use overnight buses for long routes to save accommodation cost.";
}

function mapToGoogleMode(mode: "car" | "bus" | "flight") {
  if (mode === "car") return "driving";
  if (mode === "bus") return "transit";
  return null;
}

async function getGoogleDistanceMatrix(
  apiKey: string,
  from: string,
  to: string,
  mode: "car" | "bus" | "flight",
  departureAt?: string,
): Promise<TransportPayload | null> {
  const googleMode = mapToGoogleMode(mode);
  if (!googleMode) {
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${from}, Turkey`);
  url.searchParams.set("destinations", `${to}, Turkey`);
  url.searchParams.set("units", "metric");
  url.searchParams.set("mode", googleMode);
  url.searchParams.set("key", apiKey);
  if (googleMode === "transit") {
    if (departureAt) {
      const departureEpoch = Math.floor(new Date(departureAt).getTime() / 1000);
      if (Number.isFinite(departureEpoch) && departureEpoch > 0) {
        url.searchParams.set("departure_time", String(departureEpoch));
      } else {
        url.searchParams.set("departure_time", "now");
      }
    } else {
      url.searchParams.set("departure_time", "now");
    }
  }

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    status?: string;
    rows?: Array<{
      elements?: Array<{
        status?: string;
        distance?: { value?: number };
        duration?: { value?: number };
      }>;
    }>;
  };

  if (payload.status !== "OK") {
    return null;
  }

  const element = payload.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    return null;
  }

  const distanceMeters = element.distance?.value ?? 0;
  const durationSeconds = element.duration?.value ?? 0;
  if (!distanceMeters || !durationSeconds) {
    return null;
  }

  return {
    from,
    to,
    mode,
    distanceKm: Math.round(distanceMeters / 1000),
    estimatedDurationHours: Number((durationSeconds / 3600).toFixed(1)),
    recommendation:
      mode === "bus"
        ? "Transit estimate is based on current schedules and service availability."
        : defaultRecommendation(mode),
    source: "google-distance-matrix",
  };
}

export async function getTransportGuidance(
  from: string,
  to: string,
  mode: "car" | "bus" | "flight",
  departureAt?: string,
) {
  const normalizedFrom = from.trim().toLowerCase();
  const normalizedTo = to.trim().toLowerCase();
  const cacheKey = `transport:${normalizedFrom}:${normalizedTo}:${mode}`;

  const cached = await getCachedPayload<TransportPayload>("transport", cacheKey);

  if (cached) {
    return cached;
  }

  const { GOOGLE_DISTANCE_MATRIX_API_KEY, GOOGLE_MAPS_API_KEY } = getServerEnv();
  const googleDistanceApiKey = GOOGLE_DISTANCE_MATRIX_API_KEY ?? GOOGLE_MAPS_API_KEY;
  if (googleDistanceApiKey) {
    const providerPayload = await getGoogleDistanceMatrix(
      googleDistanceApiKey,
      from,
      to,
      mode,
      departureAt,
    );
    if (providerPayload) {
      await setCachedPayload("transport", cacheKey, providerPayload, TRANSPORT_TTL_MS);
      return providerPayload;
    }
  }

  const fromCoordinates = cityCoordinates[normalizedFrom] ?? cityCoordinates.istanbul;
  const toCoordinates = cityCoordinates[normalizedTo] ?? cityCoordinates.ankara;

  const distanceKm = haversineKm(fromCoordinates, toCoordinates);
  const estimatedDurationHours = Number((distanceKm / speedByMode(mode)).toFixed(1));

  const payload = {
    from,
    to,
    mode,
    distanceKm,
    estimatedDurationHours,
    recommendation: defaultRecommendation(mode),
    source: "heuristic" as const,
  };

  await setCachedPayload("transport", cacheKey, payload, TRANSPORT_TTL_MS);
  return payload;
}
