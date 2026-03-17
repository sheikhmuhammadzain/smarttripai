import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Banknote,
  Navigation,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Lightbulb,
  Palette,
  ArrowDown,
  Users,
  Globe,
} from "lucide-react";
import ItineraryDetailClient from "@/components/ItineraryDetailClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAuthSession } from "@/lib/auth/get-session";
import { itineraryTitle, parseGeneratedItinerary } from "@/modules/itineraries/presenter";
import { getItineraryService } from "@/modules/itineraries/itinerary.service";
import { getAttractionsByIds } from "@/modules/attractions/attraction.repository";
import { getAttractionImages } from "@/lib/wikipedia-images";

const TAG_COLORS: Record<string, string> = {
  culture: "bg-violet-600 text-white",
  nature: "bg-emerald-600 text-white",
  food: "bg-amber-500 text-white",
  adventure: "bg-rose-600 text-white",
  history: "bg-blue-600 text-white",
  relaxation: "bg-teal-600 text-white",
};

function getTagColor(tag: string): string {
  return TAG_COLORS[tag.toLowerCase()] ?? "bg-slate-500 text-white";
}

function extractTheme(notes: string[]): string | null {
  const themeNote = notes.find((n) => n.startsWith("Theme:"));
  return themeNote ? themeNote.replace("Theme:", "").trim() : null;
}

function extractInsiderTip(notes: string[]): string | null {
  const tipNote = notes.find((n) => n.startsWith("Insider Tip:"));
  return tipNote ? tipNote.replace("Insider Tip:", "").trim() : null;
}

function getOtherNotes(notes: string[]): string[] {
  return notes.filter((n) => !n.startsWith("Theme:") && !n.startsWith("Insider Tip:"));
}

export default async function ItineraryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return (
      <Shell title="Sign In Required">
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-subtle">
            <CalendarDays className="h-6 w-6 text-text-muted" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Sign in to view your itinerary</h2>
          <p className="mt-1 text-sm text-text-muted">You need to be signed in to manage saved itineraries.</p>
          <Link href="/auth/signin" className="mt-5 inline-flex rounded-full bg-brand px-6 py-2.5 font-semibold text-white">
            Sign In
          </Link>
        </div>
      </Shell>
    );
  }

  let itinerary: Awaited<ReturnType<typeof getItineraryService>> | null = null;
  try {
    itinerary = await getItineraryService(session.user.id, id);
  } catch {
    itinerary = null;
  }

  if (!itinerary) {
    return (
      <Shell title="Not Found">
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-subtle">
            <CalendarDays className="h-6 w-6 text-text-muted" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Itinerary not found</h2>
          <p className="mt-1 text-sm text-text-muted">This itinerary does not exist or you don&apos;t have access.</p>
          <Link href="/dashboard" className="mt-5 inline-flex rounded-full bg-brand px-6 py-2.5 font-semibold text-white">
            Back to Dashboard
          </Link>
        </div>
      </Shell>
    );
  }

  const generatedPlan = parseGeneratedItinerary(itinerary.generatedPlan);
  const requestSnapshot = itinerary.requestSnapshot as Record<string, unknown> | undefined;

  const allAttractionIds = generatedPlan?.days.flatMap((d) => d.items.map((i) => i.attractionId)) ?? [];
  const attractionMap = allAttractionIds.length > 0
    ? await getAttractionsByIds(allAttractionIds)
    : new Map<string, { name: string; description: string; tags: string[]; avgDurationMin: number; slug: string }>();

  const attractionLookup: Record<string, { name: string; description: string; tags: string[]; avgDurationMin: number; slug: string }> = {};
  for (const [aid, doc] of attractionMap.entries()) {
    attractionLookup[aid] = {
      name: doc.name,
      description: doc.description,
      tags: doc.tags,
      avgDurationMin: doc.avgDurationMin,
      slug: (doc as Record<string, unknown>).slug as string ?? aid,
    };
  }

  // Fetch real Wikipedia images for all attractions in parallel
  const attractionImageInputs = Object.entries(attractionLookup).map(([, a]) => ({
    slug: a.slug,
    name: a.name,
    city: generatedPlan?.days.find((d) => d.items.some((i) => attractionLookup[i.attractionId]?.slug === a.slug))?.city ?? "",
  }));
  const wikiImages = attractionImageInputs.length > 0 ? await getAttractionImages(attractionImageInputs) : {};

  const title = itineraryTitle(itinerary.generatedPlan, "Itinerary Detail");
  const totalActivities = generatedPlan?.days.reduce((s, d) => s + d.items.length, 0) ?? 0;

  return (
    <Shell title={title}>
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-1.5 text-xs text-text-muted">
          <li><Link href="/" className="hover:text-brand transition-colors">Home</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li><Link href="/dashboard" className="hover:text-brand transition-colors">Dashboard</Link></li>
          <ChevronRight className="h-3 w-3" />
          <li className="font-medium text-text-body">Itinerary</li>
        </ol>
      </nav>

      {/* Hero section */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-br from-brand/5 via-surface-base to-surface-subtle p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-brand/8 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </span>
            {itinerary.notes && (
              <span className="rounded-full bg-surface-brand-subtle px-3 py-1 text-[10px] font-semibold text-brand">
                {itinerary.notes.includes("ai_primary") ? "AI Enhanced" : itinerary.notes.includes("ai_repaired") ? "AI + Repaired" : "Smart Plan"}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-text-muted">
            Your personalized travel itinerary with curated activities, time estimates, and local insights.
          </p>
        </div>
      </div>

      {generatedPlan ? (
        <>
          {/* Summary cards */}
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard icon={<CalendarDays className="h-5 w-5 text-brand" />} label="Duration" value={`${generatedPlan.days.length} days`} />
            <SummaryCard icon={<MapPin className="h-5 w-5 text-brand" />} label="Cities" value={generatedPlan.cityOrder.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")} />
            <SummaryCard icon={<Banknote className="h-5 w-5 text-brand" />} label="Est. Budget" value={`${generatedPlan.totalEstimatedCostTRY.toLocaleString("en-US")} TRY`} />
            <SummaryCard icon={<Globe className="h-5 w-5 text-brand" />} label="Activities" value={`${totalActivities} planned`} />
          </div>

          {/* Route overview */}
          <div className="mb-8 flex items-center justify-center gap-2 rounded-2xl border border-border-soft bg-surface-base px-5 py-4">
            {generatedPlan.cityOrder.map((city, i) => (
              <div key={city} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-4 w-4 text-text-subtle" />}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-primary">
                  <MapPin className="h-3 w-3 text-brand" />
                  {city.charAt(0).toUpperCase() + city.slice(1)}
                </span>
              </div>
            ))}
          </div>

          {/* Day-by-day */}
          <div className="space-y-8">
            {generatedPlan.days.map((day, dayIdx) => {
              const theme = extractTheme(day.notes);
              const insiderTip = extractInsiderTip(day.notes);
              const otherNotes = getOtherNotes(day.notes);

              return (
                <section key={day.day} className="overflow-hidden rounded-3xl border border-border-soft bg-surface-base shadow-sm">
                  {/* Day header */}
                  <div className="relative bg-gradient-to-r from-brand/8 via-surface-subtle to-surface-base px-6 py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white shadow-md shadow-brand/20">
                        {day.day}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-primary">
                          Day {day.day} — {day.city.charAt(0).toUpperCase() + day.city.slice(1)}
                        </h3>
                        <p className="mt-0.5 text-sm text-text-muted">
                          {day.items.length} {day.items.length === 1 ? "activity" : "activities"}
                          {theme && <span className="ml-2 text-text-subtle">·</span>}
                        </p>
                        {theme && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-brand-subtle px-3 py-1 text-xs font-semibold text-brand">
                            <Palette className="h-3 w-3" />
                            {theme}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Activities */}
                  <div className="px-4 py-2 md:px-6">
                    {day.items.length === 0 ? (
                      <p className="py-6 text-center text-sm text-text-muted italic">
                        Free day — explore at your own pace!
                      </p>
                    ) : (
                      day.items.map((item, idx) => {
                        const attraction = attractionLookup[item.attractionId];
                        const slug = attraction?.slug ?? item.attractionId;
                        const imageUrl = wikiImages[slug] ?? `https://picsum.photos/seed/${slug}-day${day.day}-${idx}/400/300`;
                        const isLast = idx === day.items.length - 1;

                        return (
                          <div key={idx}>
                            <div className="flex gap-4 py-4">
                              {/* Timeline connector */}
                              <div className="flex w-14 shrink-0 flex-col items-center">
                                <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">{item.startTime}</span>
                                <div className="my-1 flex-1 border-l-2 border-dashed border-border-default" />
                                <span className="text-[10px] font-medium text-text-subtle">{item.endTime}</span>
                              </div>

                              {/* Activity card */}
                              <div className="flex flex-1 gap-4 rounded-2xl border border-border-soft bg-surface-subtle p-3 transition-colors hover:border-border-default">
                                {/* Image */}
                                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                                  <Image
                                    src={imageUrl}
                                    alt={attraction?.name ?? "Activity"}
                                    fill
                                    className="object-cover"
                                    sizes="96px"
                                  />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-text-primary leading-snug">
                                    {attraction?.name ?? `Attraction ${item.attractionId.slice(-6)}`}
                                  </h4>
                                  {attraction?.description && (
                                    <p className="mt-1 text-xs text-text-muted leading-relaxed line-clamp-2">
                                      {attraction.description}
                                    </p>
                                  )}

                                  {/* Meta row */}
                                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    {attraction?.avgDurationMin && (
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-surface-base px-2 py-0.5 text-[10px] font-medium text-text-body">
                                        <Clock className="h-3 w-3 text-brand" />
                                        {attraction.avgDurationMin} min
                                      </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-surface-base px-2 py-0.5 text-[10px] font-medium text-text-body">
                                      <Banknote className="h-3 w-3 text-brand" />
                                      {item.costEstimateTRY.toLocaleString("en-US")} TRY
                                    </span>
                                  </div>

                                  {/* Tags */}
                                  {attraction?.tags && attraction.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {attraction.tags.map((tag) => (
                                        <span key={tag} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getTagColor(tag)}`}>
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Transport hint between activities */}
                            {!isLast && item.transportHint && (
                              <div className="ml-14 flex items-center gap-2 py-1 pl-4">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-subtle">
                                  <Navigation className="h-3 w-3 text-text-subtle" />
                                </div>
                                <span className="text-[11px] text-text-subtle">{item.transportHint}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Insider tip */}
                  {insiderTip && (
                    <div className="mx-4 mb-4 flex gap-3 rounded-2xl border border-amber-400 bg-amber-400 px-4 py-3 md:mx-6">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                      <p className="text-xs leading-relaxed text-white">
                        <span className="font-bold">Insider Tip:</span> {insiderTip}
                      </p>
                    </div>
                  )}

                  {/* Other notes */}
                  {otherNotes.length > 0 && (
                    <div className="border-t border-border-subtle px-6 py-3">
                      <p className="text-[11px] leading-relaxed text-text-subtle">
                        {otherNotes.join(" · ")}
                      </p>
                    </div>
                  )}

                  {/* Day transition arrow */}
                  {dayIdx < generatedPlan.days.length - 1 && (
                    <div className="flex justify-center pb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-subtle">
                        <ArrowDown className="h-3 w-3 text-text-subtle" />
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mb-6 rounded-2xl border border-border-soft bg-surface-subtle p-6 text-center">
          <p className="text-sm text-text-muted">No generated plan data found for this itinerary.</p>
        </div>
      )}

      {/* Notes / Status / Actions */}
      <div className="mt-10">
        <ItineraryDetailClient itinerary={itinerary} generatedPlan={generatedPlan} />
      </div>
    </Shell>
  );
}

/* Summary card component */
function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface-base p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-subtle">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}

/* Shell wrapper */
function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text-heading transition-colors">
      <Header />
      <main className="mx-auto max-w-230 px-4 py-10 md:px-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
