'use client';

import { ExternalLink, MapPinned, Plane, Route } from 'lucide-react';

type TransportMode = 'car' | 'bus' | 'flight';
type TransportSource = 'google-distance-matrix' | 'heuristic';

interface TransportMapEmbedProps {
  from: string;
  destinations: string[];  // full ordered list — supports multi-stop routes
  mode: TransportMode;
  distanceKm?: number;
  estimatedDurationHours?: number;
  recommendation?: string;
  source?: TransportSource;
  isLoading: boolean;
}

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getTravelMode(mode: TransportMode): 'driving' | 'transit' {
  return mode === 'car' ? 'driving' : 'transit';
}

export default function TransportMapEmbed(props: TransportMapEmbedProps) {
  const { from, destinations, mode, distanceKm, estimatedDurationHours, recommendation, source, isLoading } = props;
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const origin = toLabel(from);
  const finalDest = toLabel(destinations[destinations.length - 1] ?? from);
  // Waypoints = all destinations except the last one (Google Maps: origin→waypoints→destination)
  const waypoints = destinations.slice(0, -1).map(toLabel);
  const isFlight = mode === 'flight';

  const routeTitle = [origin, ...destinations.map(toLabel)].join(' → ');

  // Google Maps Embed API does NOT support waypoints in directions mode.
  // For multi-stop routes use Static Maps API which renders all markers + path.
  function buildMapUrl(): { url: string; type: 'embed' | 'static' } | null {
    if (!googleMapsKey) return null;

    if (isFlight) {
      return {
        url: `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(googleMapsKey)}&q=${encodeURIComponent(`${origin} to ${finalDest} airports`)}`,
        type: 'embed',
      };
    }

    const allStops = [origin, ...destinations.map(toLabel)];

    // Multi-stop: use Static Maps API — supports multiple markers + polyline path
    if (allStops.length > 2) {
      const markerParams = allStops
        .map((stop, i) => {
          const color = i === 0 ? 'blue' : i === allStops.length - 1 ? 'red' : '0xF59E0B';
          return `markers=color:${color}|label:${i + 1}|${encodeURIComponent(`${stop}, Turkey`)}`;
        })
        .join('&');
      const pathStops = allStops.map((s) => encodeURIComponent(`${s}, Turkey`)).join('|');
      return {
        url: `https://maps.googleapis.com/maps/api/staticmap?size=800x400&scale=2&key=${googleMapsKey}&${markerParams}&path=color:0x2563EB|weight:4|${pathStops}&style=feature:water|color:0xdbeafe&style=feature:landscape|color:0xf0fdf4`,
        type: 'static',
      };
    }

    // Single destination: use Embed directions mode
    return {
      url: `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(googleMapsKey)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(finalDest)}&mode=${getTravelMode(mode)}`,
      type: 'embed',
    };
  }

  function buildExternalUrl(): string {
    if (isFlight) {
      return `https://www.google.com/maps/search/${encodeURIComponent(`${origin} to ${finalDest} airports`)}`;
    }
    const allStops = [origin, ...destinations.map(toLabel)];
    return `https://www.google.com/maps/dir/${allStops.map(encodeURIComponent).join('/')}`;
  }

  const mapResult = buildMapUrl();
  const externalUrl = buildExternalUrl();

  return (
    <div className="overflow-hidden rounded-[28px] border border-border-soft bg-surface-base shadow-[0_20px_50px_rgba(15,23,42,0.10)]">
      <div className="h-65 overflow-hidden bg-surface-subtle md:h-75">
        {mapResult ? (
          mapResult.type === 'static' ? (
            // Multi-stop: static map image shows all markers + polyline
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapResult.url}
              alt={`Map route: ${routeTitle}`}
              className="h-full w-full object-cover"
            />
          ) : (
            // Single destination: interactive embed with directions
            <iframe
              title={`Google Maps route: ${routeTitle}`}
              src={mapResult.url}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(32,123,244,0.14),transparent_38%),linear-gradient(180deg,var(--color-surface-base,white),var(--color-surface-subtle,#f4f6f8))] px-6 text-center">
            <div>
              <MapPinned className="mx-auto h-10 w-10 text-brand" />
              <p className="mt-4 text-sm font-semibold text-text-primary">Google Maps preview unavailable</p>
              <p className="mt-2 text-xs text-text-muted">Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to render the live route here.</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border-soft bg-surface-base p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                Live route
              </span>
              {source ? (
                <span className="rounded-full bg-surface-brand-subtle px-2.5 py-1 text-[10px] font-semibold text-brand">
                  {source === 'google-distance-matrix' ? 'Google Maps data' : 'Estimated route'}
                </span>
              ) : null}
            </div>
            <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-text-primary md:text-xl">
              {isFlight ? <Plane className="h-5 w-5 text-brand" /> : <Route className="h-5 w-5 text-brand" />}
              {routeTitle}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              {recommendation ?? (isFlight ? 'Airport search based on your selected route.' : 'Google Maps route preview based on the chosen transport mode.')}
            </p>
          </div>

          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-base px-3 py-2 text-xs font-semibold text-text-body transition-colors hover:border-border-strong hover:bg-surface-subtle"
          >
            Open in Google Maps
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border-soft bg-surface-subtle px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-text-subtle">Mode</p>
            <p className="mt-1 text-sm font-semibold capitalize text-text-primary">{mode}</p>
          </div>
          <div className="rounded-2xl border border-border-soft bg-surface-subtle px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-text-subtle">Distance</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{isLoading ? 'Loading...' : distanceKm ? `${distanceKm} km` : 'Unavailable'}</p>
          </div>
          <div className="rounded-2xl border border-border-soft bg-surface-subtle px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-text-subtle">ETA</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{isLoading ? 'Loading...' : estimatedDurationHours ? `~${estimatedDurationHours}h` : 'Unavailable'}</p>
          </div>
          <div className="rounded-2xl border border-border-soft bg-surface-subtle px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-text-subtle">Source</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{source === 'google-distance-matrix' ? 'Google' : source === 'heuristic' ? 'Estimate' : 'Preview'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
