/**
 * Wikipedia REST API — page thumbnail fetcher.
 *
 * Fetches the lead image for a Wikipedia article by page title.
 * Uses Next.js fetch caching (revalidate 7 days) to avoid repeated calls.
 * Returns null on any error — caller should fall back to a placeholder.
 */

/** Static overrides for slugs whose Wikipedia title differs from display name */
const SLUG_TITLE_MAP: Record<string, string> = {
  "hagia-sophia": "Hagia Sophia",
  "topkapi-palace": "Topkapi Palace",
  "blue-mosque": "Sultan Ahmed Mosque",
  "grand-bazaar-istanbul": "Grand Bazaar, Istanbul",
  "bosphorus-boat-cruise": "Bosphorus",
  "dolmabahce-palace": "Dolmabahçe Palace",
  "basilica-cistern-istanbul": "Basilica Cistern",
  "galata-tower-istanbul": "Galata Tower",
  "suleymaniye-mosque-istanbul": "Süleymaniye Mosque",
  "istanbul-modern-art-museum": "Istanbul Modern",
  "spice-bazaar-istanbul": "Spice Bazaar",
  "kadikoy-food-market": "Kadıköy",
  "princes-islands-ferry": "Princes Islands",
  "goreme-open-air-museum": "Göreme Open-Air Museum",
  "hot-air-balloon-cappadocia": "Cappadocia",
  "derinkuyu-underground-city": "Derinkuyu underground city",
  "fairy-chimneys-urgup": "Fairy chimney",
  "ihlara-valley-hike": "Ihlara Valley",
  "uchisar-castle": "Uçhisar",
  "rose-valley-goreme": "Güllüdere Valley",
  "devrent-valley-cappadocia": "Devrent Valley",
  "kaymakli-underground-city": "Kaymakli underground city",
  "love-valley-cappadocia": "Love Valley",
  "library-of-celsus": "Library of Celsus",
  "ephesus-great-theatre": "Theatre of Ephesus",
  "house-of-virgin-mary": "House of the Virgin Mary",
  "ephesus-artemis-temple": "Temple of Artemis",
  "terrace-houses-ephesus": "Slope Houses",
  "ephesus-state-agora": "Ephesus",
  "pamukkale-terraces": "Pamukkale",
  "hierapolis-ancient-city": "Hierapolis",
  "cleopatra-antique-pool": "Pamukkale",
  "pamukkale-travertine-pools": "Pamukkale",
  "kaklik-cave-pamukkale": "Kâklık Cave",
  "antalya-old-town": "Kaleiçi",
  "duden-waterfalls": "Düden waterfalls",
  "antalya-archaeology-museum": "Antalya Museum",
  "konyaalti-beach": "Konyaaltı Beach",
  "perge-ancient-city": "Perge",
  "aspendos-theatre": "Aspendos",
  "bodrum-castle": "Bodrum Castle",
  "bodrum-gulet-cruise": "Gulet",
  "yalikavak-marina-bodrum": "Yalıkavak",
  "underwater-archaeology-bodrum": "Bodrum Museum of Underwater Archaeology",
  "gumbet-beach-bodrum": "Gümbüt, Bodrum",
  "turgutreis-market-bodrum": "Turgutreis",
  "grand-mosque-bursa": "Great Mosque of Bursa",
  "bursa-silk-market": "Koza Han",
  "uludag-cable-car": "Uludağ",
  "green-mosque-bursa": "Green Mosque, Bursa",
  "koza-han-bursa": "Koza Han",
  "cumalıkizik-village": "Cumalıkızık",
  "ulu-mosque-bursa": "Great Mosque of Bursa",
  "anitkabir-ankara": "Anıtkabir",
  "museum-anatolian-civilizations": "Museum of Anatolian Civilizations",
  "atakule-tower": "Atakule tower",
  "ankara-citadel": "Ankara Castle",
  "haci-bayram-mosque-ankara": "Hacı Bayram Mosque",
  "kocatepe-mosque-ankara": "Kocatepe Mosque",
  "sumela-monastery": "Sümela Monastery",
  "trabzon-hagia-sophia": "Hagia Sophia, Trabzon",
  "uzungol-lake": "Uzungöl",
  "boztepe-hill-trabzon": "Boztepe, Trabzon",
  "ataturk-pavilion-trabzon": "Atatürk Pavilion",
  "rize-tea-gardens": "Rize",
  "mevlana-museum-konya": "Mevlana Museum",
  "aladdin-mosque-konya": "Alâeddin Mosque",
  "sille-village-konya": "Sille, Konya",
  "ince-minare-museum": "İnce Minaret Medrese",
  "catalhoyuk-konya": "Çatalhöyük",
  "konya-ethnography-museum": "Konya",
  "troy-ancient-city": "Troy",
  "gallipoli-memorial": "Gallipoli campaign",
  "anzac-cove-canakkale": "Anzac Cove",
  "canakkale-maritime-museum": "Çanakkale Naval Museum",
  "trojan-horse-canakkale": "Trojan Horse",
};

/** City-level fallback image titles when attraction-specific fails */
const CITY_FALLBACK_TITLE: Record<string, string> = {
  istanbul: "Istanbul",
  cappadocia: "Cappadocia",
  ephesus: "Ephesus",
  pamukkale: "Pamukkale",
  antalya: "Antalya",
  bodrum: "Bodrum",
  bursa: "Bursa",
  ankara: "Ankara",
  trabzon: "Trabzon",
  konya: "Konya",
  canakkale: "Çanakkale",
};

async function fetchWikipediaThumb(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      next: { revalidate: 604800 }, // cache for 7 days
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail?: { source?: string } };
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

export async function getAttractionImages(
  attractions: Array<{ slug: string; name: string; city: string }>,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  await Promise.all(
    attractions.map(async ({ slug, name, city }) => {
      // 1. Try static override first
      const mappedTitle = SLUG_TITLE_MAP[slug];
      if (mappedTitle) {
        const url = await fetchWikipediaThumb(mappedTitle);
        if (url) { results[slug] = url; return; }
      }

      // 2. Try attraction name directly
      const byName = await fetchWikipediaThumb(name);
      if (byName) { results[slug] = byName; return; }

      // 3. Try city fallback
      const cityTitle = CITY_FALLBACK_TITLE[city.toLowerCase()];
      if (cityTitle) {
        const byCity = await fetchWikipediaThumb(cityTitle);
        if (byCity) { results[slug] = byCity; return; }
      }
    }),
  );

  return results;
}
