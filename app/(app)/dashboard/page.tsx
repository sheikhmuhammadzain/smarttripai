import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShoppingBag, MapPin, Calendar, Users, Package,
  CheckCircle2, XCircle, ArrowRight, Sparkles, Clock,
  Mail, Phone, Globe, Receipt, TrendingUp, ChevronRight,
  Star, Ticket,
} from "lucide-react";
import CurrencyAmount from "@/components/CurrencyAmount";
import PageScaffold from "@/components/PageScaffold";
import { getAuthSession } from "@/lib/auth/get-session";
import { formatUtcDateTime } from "@/lib/format/date";
import { isAdminSession } from "@/modules/auth/guards";
import { itineraryTitle, parseGeneratedItinerary } from "@/modules/itineraries/presenter";
import { listItinerariesService } from "@/modules/itineraries/itinerary.service";
import { listUserOrdersService } from "@/modules/orders/order.service";

export default async function DashboardPage() {
  let session: Awaited<ReturnType<typeof getAuthSession>> | null = null;
  let userId: string | undefined;
  let admin = false;
  let data: [
    Awaited<ReturnType<typeof listItinerariesService>>,
    Awaited<ReturnType<typeof listUserOrdersService>>
  ] | null = null;
  let loadError = false;

  try {
    session = await getAuthSession();
    userId = session?.user?.id;
    admin = userId ? await isAdminSession() : false;
    if (admin) redirect("/admin");
    data = userId
      ? await Promise.all([
          listItinerariesService(userId, undefined, 20),
          listUserOrdersService(userId, undefined, 20),
        ])
      : null;
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <PageScaffold title="Dashboard" description="Manage your bookings and saved trips.">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800/40 dark:bg-amber-900/10">
          <p className="mb-1 font-semibold text-amber-900 dark:text-amber-300">Could not load dashboard data.</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">Check server logs and environment variables.</p>
        </div>
      </PageScaffold>
    );
  }

  if (!session?.user?.id) {
    return (
      <PageScaffold title="Dashboard" description="Manage your bookings and saved trips.">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border-default bg-surface-muted py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
            <Package className="h-7 w-7 text-brand" />
          </div>
          <p className="mb-1 text-lg font-semibold text-text-primary">Sign in to view your dashboard</p>
          <p className="mb-6 text-sm text-text-muted">Track your bookings and saved itineraries</p>
          <Link href="/auth/signin" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
            Sign In <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageScaffold>
    );
  }

  const orders = data?.[1] ?? { data: [], nextCursor: null };
  const itineraries = data?.[0] ?? { data: [], nextCursor: null };
  const confirmedOrders = orders.data.filter((o) => o.status === "confirmed");
  const totalSpent = orders.data.reduce((s, o) => s + (o.currency === "EUR" ? o.total : 0), 0);

  return (
    <PageScaffold title="My Dashboard" description="Your bookings, orders & saved itineraries.">

      {/* Welcome banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-brand px-6 py-6 md:px-8">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold text-white">{session.user.name ?? "Traveler"}</h1>
            <p className="mt-1 text-sm text-white/70">
              {orders.data.length} order{orders.data.length !== 1 ? "s" : ""} · {itineraries.data.length} saved trip{itineraries.data.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25 transition-colors">
            <Sparkles className="h-4 w-4" /> Plan a Trip
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Ticket className="h-5 w-5" />}
          iconBg="bg-blue-500/10 text-blue-500"
          label="Total Orders"
          value={String(orders.data.length)}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-emerald-500/10 text-emerald-500"
          label="Confirmed"
          value={String(confirmedOrders.length)}
        />
        <StatCard
          icon={<Sparkles className="h-5 w-5" />}
          iconBg="bg-violet-500/10 text-violet-500"
          label="Itineraries"
          value={String(itineraries.data.length)}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-amber-500/10 text-amber-500"
          label="Total Spent"
          value={<CurrencyAmount amount={totalSpent} baseCurrency="EUR" />}
        />
      </div>

      {/* Orders */}
      <section className="mb-10">
        <SectionHeader icon={<ShoppingBag className="h-5 w-5 text-brand" />} title="My Orders" />

        {orders.data.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8 text-text-subtle" />}
            title="No orders yet"
            description="Explore curated Turkey experiences and book your first activity."
            action={{ label: "Browse Experiences", href: "/products" }}
          />
        ) : (
          <div className="space-y-4">
            {orders.data.map((order) => (
              <div key={order.id} className="overflow-hidden rounded-2xl border border-border-default bg-surface-base shadow-sm">

                {/* Order header row */}
                <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle bg-surface-subtle px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
                    <Package className="h-5 w-5 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-text-primary">{order.orderCode}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {formatUtcDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-text-muted mb-0.5">Order Total</p>
                    <p className="text-lg font-bold text-text-primary">
                      <CurrencyAmount amount={order.total} baseCurrency={order.currency} />
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-5">

                  {/* Customer info */}
                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-text-muted">Customer Details</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <CustomerField icon={<Users className="h-3.5 w-3.5 text-text-subtle" />} label="Full Name" value={order.customer.fullName} />
                      <CustomerField icon={<Mail className="h-3.5 w-3.5 text-text-subtle" />} label="Email" value={order.customer.email} />
                      <CustomerField icon={<Phone className="h-3.5 w-3.5 text-text-subtle" />} label="Phone" value={order.customer.phone} />
                      <CustomerField icon={<Globe className="h-3.5 w-3.5 text-text-subtle" />} label="Country" value={order.customer.country} />
                    </div>
                  </div>

                  {/* Booked items */}
                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-text-muted">Booked Experiences</p>
                    <div className="rounded-xl border border-border-soft overflow-hidden">
                      {order.items.map((item, i) => (
                        <div
                          key={i}
                          className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border-subtle" : ""}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/8">
                              <Star className="h-4 w-4 text-brand" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary truncate">{item.title}</p>
                              <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-text-muted">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {item.quantity} {item.quantity === 1 ? "traveler" : "travelers"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Receipt className="h-3 w-3" />
                                  <CurrencyAmount amount={item.unitPrice} baseCurrency={item.currency} /> / person
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-bold text-text-primary">
                              <CurrencyAmount amount={item.lineTotal} baseCurrency={item.currency} />
                            </p>
                            <p className="text-[11px] text-text-muted">line total</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary footer */}
                  <div className="flex items-center justify-between rounded-xl bg-surface-subtle px-4 py-3">
                    <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {order.items.reduce((s, i) => s + i.quantity, 0)} traveler{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Ticket className="h-3.5 w-3.5" />
                        {order.items.length} experience{order.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-brand">
                      Total: <CurrencyAmount amount={order.total} baseCurrency={order.currency} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Itineraries */}
      <section>
        <SectionHeader
          icon={<Sparkles className="h-5 w-5 text-violet-500" />}
          title="Saved Itineraries"
          action={<Link href="/" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">Plan new <ChevronRight className="h-3.5 w-3.5" /></Link>}
        />

        {itineraries.data.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-8 w-8 text-text-subtle" />}
            title="No itineraries yet"
            description="Use our AI planner to create a personalised Turkey trip."
            action={{ label: "Create Itinerary", href: "/" }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {itineraries.data.map((itinerary) => {
              const parsed = parseGeneratedItinerary(itinerary.generatedPlan);
              const cities = parsed?.days
                ? [...new Set(parsed.days.map((d) => d.city).filter(Boolean))]
                : [];
              return (
                <article key={itinerary.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-base shadow-sm hover:shadow-md hover:border-brand/30 transition-all">
                  <div className="flex items-start justify-between gap-3 border-b border-border-subtle bg-surface-subtle px-5 py-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-text-primary leading-snug truncate">
                        {itineraryTitle(itinerary.generatedPlan, "My Trip")}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
                        <Clock className="h-3 w-3" /> {formatUtcDateTime(itinerary.updatedAt)}
                      </p>
                    </div>
                    <ItineraryStatusBadge status={itinerary.status} />
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    {cities.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {cities.map((city) => (
                          <span key={city} className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/6 px-2.5 py-1 text-[11px] font-semibold text-brand">
                            <MapPin className="h-3 w-3" /> {city}
                          </span>
                        ))}
                      </div>
                    )}

                    {parsed && (
                      <div className="mb-4 flex flex-wrap gap-4">
                        <span className="flex items-center gap-1.5 text-sm text-text-muted">
                          <Calendar className="h-4 w-4 text-text-subtle" />
                          <strong className="text-text-primary">{parsed.days.length}</strong> days
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-text-muted">
                          <Receipt className="h-4 w-4 text-text-subtle" />
                          <strong className="text-text-primary"><CurrencyAmount amount={parsed.totalEstimatedCostTRY} baseCurrency="TRY" /></strong>
                        </span>
                      </div>
                    )}

                    {itinerary.notes && (
                      <p className="mb-4 line-clamp-2 text-sm text-text-muted">{itinerary.notes}</p>
                    )}

                    <div className="mt-auto">
                      <Link
                        href={`/itineraries/${itinerary.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-surface-subtle border border-border-default px-4 py-2 text-sm font-semibold text-text-primary hover:bg-brand hover:text-white hover:border-brand transition-all"
                      >
                        View Itinerary <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageScaffold>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function SectionHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text-heading">
        {icon} {title}
      </h2>
      {action}
    </div>
  );
}

function StatCard({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-default bg-surface-base p-4 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-text-muted mb-0.5">{label}</p>
      <p className="text-xl font-bold text-text-heading">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "confirmed";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide border ${
      ok
        ? "bg-emerald-500 text-white border-emerald-600"
        : "bg-red-500 text-white border-red-600"
    }`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {ok ? "Confirmed" : "Cancelled"}
    </span>
  );
}

function ItineraryStatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide border ${
      active
        ? "bg-violet-500 text-white border-violet-600"
        : "bg-surface-muted text-text-muted border-border-subtle"
    }`}>
      {status}
    </span>
  );
}

function CustomerField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface-subtle px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
      </div>
      <p className="text-sm font-semibold text-text-primary truncate">{value}</p>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default bg-surface-muted/50 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-subtle">
        {icon}
      </div>
      <p className="mb-1 font-semibold text-text-primary">{title}</p>
      <p className="mb-5 max-w-xs text-sm text-text-muted">{description}</p>
      <Link href={action.href} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
        {action.label} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
