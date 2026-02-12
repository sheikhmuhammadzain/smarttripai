'use client';

import { useMemo, useState } from 'react';

const MARKERS = [
  { city: 'Istanbul', lat: 41.0082, lon: 28.9784, label: 'Culture & History' },
  { city: 'Cappadocia', lat: 38.6431, lon: 34.8272, label: 'Adventure' },
  { city: 'Ephesus', lat: 37.939, lon: 27.3415, label: 'Ancient Wonders' },
  { city: 'Pamukkale', lat: 37.9244, lon: 29.1177, label: 'Nature' },
  { city: 'Antalya', lat: 36.8969, lon: 30.7133, label: 'Coastal Relaxation' },
] as const;

function buildOsmEmbedUrl(lat: number, lon: number) {
  const latDelta = 1.25;
  const lonDelta = 1.75;

  const minLat = Math.max(-90, lat - latDelta);
  const maxLat = Math.min(90, lat + latDelta);
  const minLon = Math.max(-180, lon - lonDelta);
  const maxLon = Math.min(180, lon + lonDelta);

  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}

export default function TurkeyMap() {
  const [selectedCity, setSelectedCity] = useState<(typeof MARKERS)[number]>(MARKERS[0]);

  const embedUrl = useMemo(
    () => buildOsmEmbedUrl(selectedCity.lat, selectedCity.lon),
    [selectedCity.lat, selectedCity.lon],
  );

  return (
    <div className="w-full h-full relative bg-white">
      <iframe
        title={`Map for ${selectedCity.city}`}
        src={embedUrl}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      <div className="absolute top-3 left-3 right-3 rounded-xl bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">Free map (OpenStreetMap)</p>
        <div className="flex flex-wrap gap-2">
          {MARKERS.map((marker) => {
            const active = selectedCity.city === marker.city;
            return (
              <button
                key={marker.city}
                onClick={() => setSelectedCity(marker)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50'
                }`}
                aria-label={`Show ${marker.city} on map`}
              >
                {marker.city}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-600 mt-2">{selectedCity.label}</p>
      </div>
    </div>
  );
}
