/**
 * Maps lowercase destination keys to OpenWeatherMap-compatible city names.
 * Shared between the client ItineraryGenerator and the server-side ContextCollector.
 */
export const WEATHER_CITY_MAP: Record<string, string> = {
  cappadocia: "Nevsehir",
  istanbul: "Istanbul",
  ephesus: "Izmir",
  pamukkale: "Denizli",
  antalya: "Antalya",
  bodrum: "Bodrum",
  bursa: "Bursa",
  ankara: "Ankara",
  trabzon: "Trabzon",
  konya: "Konya",
  canakkale: "Canakkale",
};
