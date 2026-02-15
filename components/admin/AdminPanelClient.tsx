"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Bell,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Table,
  Users,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { GETYOURGUIDE_LOGO_DATA_URI } from "@/components/branding/logo";

type AdminTab = "users" | "orders" | "itineraries" | "feedback";
type AdminNav = "overview" | AdminTab;
type Option = { value: string; label: string };

interface AdminPanelClientProps {
  overview: {
    totals: {
      users: number;
      itineraries: number;
      orders: number;
      feedback: number;
      recentRevenue: number;
    };
  };
  users: {
    data: Array<{
      id: string;
      name: string;
      email: string;
      image: string | null;
      emailVerified: Date | string | null;
    }>;
  };
  orders: {
    data: Array<{
      id: string;
      orderCode: string;
      status: string;
      total: number;
      currency: string;
      customer: { email: string; fullName: string };
      createdAt: Date | string;
    }>;
  };
  itineraries: {
    data: Array<{
      id: string;
      userId: string;
      status: string;
      notes?: string;
      updatedAt: Date | string;
    }>;
  };
  feedback: {
    data: Array<{
      id: string;
      email: string | null;
      category: string;
      status: string;
      rating: number | null;
      message: string;
      createdAt: Date | string;
    }>;
  };
}

export default function AdminPanelClient(props: AdminPanelClientProps) {
  const [activeNav, setActiveNav] = useState<AdminNav>("overview");
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [search, setSearch] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [sortValue, setSortValue] = useState("default");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [users, setUsers] = useState(props.users.data);
  const [orders, setOrders] = useState(props.orders.data);
  const [itineraries, setItineraries] = useState(props.itineraries.data);
  const [feedback, setFeedback] = useState(props.feedback.data);

  const totals = props.overview.totals;

  const chartModel = useMemo(() => {
    const now = new Date();
    const monthKeys: string[] = [];
    const monthLabels: string[] = [];
    const monthIndex = new Map<string, number>();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthKeys.push(key);
      monthLabels.push(date.toLocaleString("en-US", { month: "short" }));
      monthIndex.set(key, monthLabels.length - 1);
    }

    const empty = () => new Array(monthKeys.length).fill(0);
    const revenueSeries = empty();
    const orderCountSeries = empty();
    const itinerarySeries = empty();
    const itineraryArchivedSeries = empty();
    const feedbackCountSeries = empty();
    const feedbackRatingSumSeries = empty();
    const feedbackRatingCountSeries = empty();
    const userSignupSeries = empty();
    const userVerifiedSeries = empty();

    const monthKeyFromDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    orders.forEach((order) => {
      const key = monthKeyFromDate(new Date(order.createdAt));
      const idx = monthIndex.get(key);
      if (idx === undefined) return;
      revenueSeries[idx] += order.total;
      orderCountSeries[idx] += 1;
    });

    itineraries.forEach((item) => {
      const key = monthKeyFromDate(new Date(item.updatedAt));
      const idx = monthIndex.get(key);
      if (idx === undefined) return;
      itinerarySeries[idx] += 1;
      if (item.status === "archived") {
        itineraryArchivedSeries[idx] += 1;
      }
    });

    feedback.forEach((item) => {
      const key = monthKeyFromDate(new Date(item.createdAt));
      const idx = monthIndex.get(key);
      if (idx === undefined) return;
      feedbackCountSeries[idx] += 1;
      if (item.rating !== null) {
        feedbackRatingSumSeries[idx] += item.rating;
        feedbackRatingCountSeries[idx] += 1;
      }
    });

    const feedbackAvgRatingSeries = feedbackRatingSumSeries.map((sum, idx) =>
      feedbackRatingCountSeries[idx] > 0 ? Number((sum / feedbackRatingCountSeries[idx]).toFixed(2)) : 0,
    );

    users.forEach((item) => {
      const objectIdTimeHex = item.id.slice(0, 8);
      if (objectIdTimeHex.length === 8) {
        const created = new Date(parseInt(objectIdTimeHex, 16) * 1000);
        const createdIdx = monthIndex.get(monthKeyFromDate(created));
        if (createdIdx !== undefined) {
          userSignupSeries[createdIdx] += 1;
        }
      }

      if (item.emailVerified) {
        const verified = new Date(item.emailVerified);
        const verifiedIdx = monthIndex.get(monthKeyFromDate(verified));
        if (verifiedIdx !== undefined) {
          userVerifiedSeries[verifiedIdx] += 1;
        }
      }
    });

    function makePath(values: number[], width: number, height: number, pad = 18) {
      const max = Math.max(...values, 1);
      const xStep = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
      return values
        .map((value, index) => {
          const x = pad + index * xStep;
          const y = height - pad - (value / max) * (height - pad * 2);
          return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
    }

    const byNav: Record<
      AdminNav,
      {
        title: string;
        firstLabel: string;
        secondLabel: string;
        firstValues: number[];
        secondValues: number[];
        firstSuffix?: string;
        secondSuffix?: string;
      }
    > = {
      overview: {
        title: "Consolidated trend (Revenue vs Itineraries)",
        firstLabel: "Revenue",
        secondLabel: "Itineraries",
        firstValues: revenueSeries,
        secondValues: itinerarySeries,
        firstSuffix: "EUR",
      },
      users: {
        title: "User trend (Signups vs Verified)",
        firstLabel: "Signups",
        secondLabel: "Verified",
        firstValues: userSignupSeries,
        secondValues: userVerifiedSeries,
      },
      orders: {
        title: "Orders trend (Revenue vs Orders)",
        firstLabel: "Revenue",
        secondLabel: "Orders",
        firstValues: revenueSeries,
        secondValues: orderCountSeries,
        firstSuffix: "EUR",
      },
      itineraries: {
        title: "Itinerary trend (Total vs Archived)",
        firstLabel: "Total",
        secondLabel: "Archived",
        firstValues: itinerarySeries,
        secondValues: itineraryArchivedSeries,
      },
      feedback: {
        title: "Feedback trend (Count vs Avg Rating)",
        firstLabel: "Feedback",
        secondLabel: "Avg rating",
        firstValues: feedbackCountSeries,
        secondValues: feedbackAvgRatingSeries,
      },
    };

    const current = byNav[activeNav];

    return {
      title: current.title,
      months: monthLabels,
      firstLabel: current.firstLabel,
      secondLabel: current.secondLabel,
      firstValues: current.firstValues,
      secondValues: current.secondValues,
      firstSuffix: current.firstSuffix,
      secondSuffix: current.secondSuffix,
      firstPath: makePath(current.firstValues, 900, 180),
      secondPath: makePath(current.secondValues, 900, 180),
      firstTotal: Number(current.firstValues.reduce((a, b) => a + b, 0).toFixed(2)),
      secondTotal: Number(current.secondValues.reduce((a, b) => a + b, 0).toFixed(2)),
    };
  }, [activeNav, feedback, itineraries, orders, users]);

  const filteredUsers = useMemo(
    () => users.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase())),
    [users, search],
  );
  const filteredOrders = useMemo(
    () =>
      orders.filter((item) => `${item.orderCode} ${item.customer.email}`.toLowerCase().includes(search.toLowerCase())),
    [orders, search],
  );
  const filteredItineraries = useMemo(
    () =>
      itineraries.filter((item) => `${item.id} ${item.userId} ${item.status}`.toLowerCase().includes(search.toLowerCase())),
    [itineraries, search],
  );
  const filteredFeedback = useMemo(
    () =>
      feedback.filter((item) => `${item.category} ${item.email ?? ""} ${item.message}`.toLowerCase().includes(search.toLowerCase())),
    [feedback, search],
  );

  const filterOptions = useMemo<Option[]>(() => {
    if (activeTab === "users") {
      return [
        { value: "all", label: "All users" },
        { value: "verified", label: "Verified only" },
        { value: "unverified", label: "Unverified only" },
      ];
    }
    if (activeTab === "orders") {
      return [
        { value: "all", label: "All orders" },
        { value: "confirmed", label: "Confirmed only" },
        { value: "cancelled", label: "Cancelled only" },
      ];
    }
    if (activeTab === "itineraries") {
      return [
        { value: "all", label: "All itineraries" },
        { value: "saved", label: "Saved" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
      ];
    }
    return [
      { value: "all", label: "All feedback" },
      { value: "new", label: "New only" },
      { value: "reviewed", label: "Reviewed only" },
      { value: "with-rating", label: "With rating" },
    ];
  }, [activeTab]);

  const sortOptions = useMemo<Option[]>(() => {
    if (activeTab === "users") {
      return [
        { value: "default", label: "Default order" },
        { value: "name-asc", label: "Name A-Z" },
        { value: "name-desc", label: "Name Z-A" },
        { value: "email-asc", label: "Email A-Z" },
      ];
    }
    if (activeTab === "orders") {
      return [
        { value: "default", label: "Newest first" },
        { value: "oldest", label: "Oldest first" },
        { value: "value-desc", label: "Highest value" },
        { value: "value-asc", label: "Lowest value" },
      ];
    }
    if (activeTab === "itineraries") {
      return [
        { value: "default", label: "Recently updated" },
        { value: "oldest", label: "Least recent" },
        { value: "status-asc", label: "Status A-Z" },
      ];
    }
    return [
      { value: "default", label: "Newest first" },
      { value: "oldest", label: "Oldest first" },
      { value: "rating-desc", label: "Highest rating" },
      { value: "rating-asc", label: "Lowest rating" },
    ];
  }, [activeTab]);

  useEffect(() => {
    const hasFilter = filterOptions.some((item) => item.value === filterValue);
    const hasSort = sortOptions.some((item) => item.value === sortValue);
    if (!hasFilter) setFilterValue(filterOptions[0]?.value ?? "all");
    if (!hasSort) setSortValue(sortOptions[0]?.value ?? "default");
    setFilterMenuOpen(false);
    setSortMenuOpen(false);
  }, [activeTab, filterOptions, sortOptions, filterValue, sortValue]);

  const visibleUsers = useMemo(() => {
    const rows = [...filteredUsers].filter((user) => {
      if (filterValue === "verified") return Boolean(user.emailVerified);
      if (filterValue === "unverified") return !user.emailVerified;
      return true;
    });

    if (sortValue === "name-asc") rows.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortValue === "name-desc") rows.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortValue === "email-asc") rows.sort((a, b) => a.email.localeCompare(b.email));
    return rows;
  }, [filteredUsers, filterValue, sortValue]);

  const visibleOrders = useMemo(() => {
    const rows = [...filteredOrders].filter((order) => {
      if (filterValue === "confirmed") return order.status === "confirmed";
      if (filterValue === "cancelled") return order.status === "cancelled";
      return true;
    });

    if (sortValue === "oldest") rows.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    else if (sortValue === "value-desc") rows.sort((a, b) => b.total - a.total);
    else if (sortValue === "value-asc") rows.sort((a, b) => a.total - b.total);
    else rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return rows;
  }, [filteredOrders, filterValue, sortValue]);

  const visibleItineraries = useMemo(() => {
    const rows = [...filteredItineraries].filter((item) => {
      if (filterValue === "saved" || filterValue === "draft" || filterValue === "archived") {
        return item.status === filterValue;
      }
      return true;
    });

    if (sortValue === "oldest") rows.sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt));
    else if (sortValue === "status-asc") rows.sort((a, b) => a.status.localeCompare(b.status));
    else rows.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return rows;
  }, [filteredItineraries, filterValue, sortValue]);

  const visibleFeedback = useMemo(() => {
    const rows = [...filteredFeedback].filter((item) => {
      if (filterValue === "new") return item.status === "new";
      if (filterValue === "reviewed") return item.status === "reviewed";
      if (filterValue === "with-rating") return item.rating !== null;
      return true;
    });

    if (sortValue === "oldest") rows.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    else if (sortValue === "rating-desc") rows.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortValue === "rating-asc") rows.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    else rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return rows;
  }, [filteredFeedback, filterValue, sortValue]);

  async function runAction(action: () => Promise<void>, id: string, successMessage: string) {
    setMessage(null);
    setBusyId(id);
    try {
      await action();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <aside className="hidden w-[260px] border-r border-border-default bg-surface-muted p-4 lg:flex lg:flex-col">
        <div className="mb-4 flex items-center gap-2 rounded-xl px-2 py-1">
          <div className="overflow-hidden rounded-lg">
            <Image
              src={GETYOURGUIDE_LOGO_DATA_URI}
              alt="GetYourGuide"
              width={36}
              height={40}
              className="h-8 w-8 object-cover object-left"
              unoptimized
            />
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-border-default bg-white px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Search className="h-4 w-4" />
            <span>Search workspace...</span>
          </div>
        </div>

        <nav className="space-y-1 text-sm">
          <SidebarItem
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Overview"
            active={activeNav === "overview"}
            onClick={() => {
              setActiveNav("overview");
              setActiveTab("users");
              setSearch("");
            }}
          />
          <SidebarItem
            icon={<Users className="h-4 w-4" />}
            label="Users"
            count={totals.users}
            active={activeNav === "users"}
            onClick={() => {
              setActiveNav("users");
              setActiveTab("users");
              setSearch("");
            }}
          />
          <SidebarItem
            icon={<Table className="h-4 w-4" />}
            label="Orders"
            count={totals.orders}
            active={activeNav === "orders"}
            onClick={() => {
              setActiveNav("orders");
              setActiveTab("orders");
              setSearch("");
            }}
          />
          <SidebarItem
            icon={<Sparkles className="h-4 w-4" />}
            label="Itineraries"
            count={totals.itineraries}
            active={activeNav === "itineraries"}
            onClick={() => {
              setActiveNav("itineraries");
              setActiveTab("itineraries");
              setSearch("");
            }}
          />
          <SidebarItem
            icon={<Bell className="h-4 w-4" />}
            label="Feedback"
            count={totals.feedback}
            active={activeNav === "feedback"}
            onClick={() => {
              setActiveNav("feedback");
              setActiveTab("feedback");
              setSearch("");
            }}
          />
        </nav>

        <div className="mt-6 space-y-1 border-t border-border-default pt-4 text-sm">
          <Link href="/help" className="block">
            <SidebarItem icon={<HelpCircle className="h-4 w-4" />} label="Help center" />
          </Link>
          <SidebarItem
            icon={<Bell className="h-4 w-4" />}
            label="Notifications"
            active={activeNav === "feedback"}
            onClick={() => {
              setActiveNav("feedback");
              setActiveTab("feedback");
              setSearch("");
            }}
          />
        </div>

        <div className="mt-auto rounded-xl border border-border-default bg-white p-3">
          <p className="text-xs text-text-subtle">Signed in as</p>
          <p className="text-sm font-semibold text-text-heading">admin@gmail.com</p>
          <button
            onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border-danger bg-surface-danger-soft px-3 py-2 text-xs font-semibold text-text-danger"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-3 rounded-2xl border border-border-default bg-white p-2.5 shadow-sm lg:hidden">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <div className="flex items-center gap-2">
                <Image
                  src={GETYOURGUIDE_LOGO_DATA_URI}
                  alt="GetYourGuide"
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-md object-cover object-left"
                  unoptimized
                />
                <p className="text-sm font-semibold text-text-primary">Admin Workspace</p>
              </div>
              <button
                onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                className="inline-flex items-center gap-1 rounded-md border border-border-danger bg-surface-danger-soft px-2.5 py-1.5 text-[11px] font-semibold text-text-danger"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-1">
              <SidebarItemCompact
                label="Overview"
                active={activeNav === "overview"}
                onClick={() => {
                  setActiveNav("overview");
                  setActiveTab("users");
                  setSearch("");
                }}
              />
              <SidebarItemCompact
                label={`Users (${totals.users})`}
                active={activeNav === "users"}
                onClick={() => {
                  setActiveNav("users");
                  setActiveTab("users");
                  setSearch("");
                }}
              />
              <SidebarItemCompact
                label={`Orders (${totals.orders})`}
                active={activeNav === "orders"}
                onClick={() => {
                  setActiveNav("orders");
                  setActiveTab("orders");
                  setSearch("");
                }}
              />
              <SidebarItemCompact
                label={`Itineraries (${totals.itineraries})`}
                active={activeNav === "itineraries"}
                onClick={() => {
                  setActiveNav("itineraries");
                  setActiveTab("itineraries");
                  setSearch("");
                }}
              />
              <SidebarItemCompact
                label={`Feedback (${totals.feedback})`}
                active={activeNav === "feedback"}
                onClick={() => {
                  setActiveNav("feedback");
                  setActiveTab("feedback");
                  setSearch("");
                }}
              />
            </div>
          </div>

          <header className="mb-4 overflow-hidden rounded-2xl border border-border-default bg-white px-3 py-3 shadow-sm sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0 flex flex-wrap items-center gap-1.5 text-xs text-text-muted sm:gap-2 sm:text-sm">
                <Link href="/" className="font-medium text-text-body">Workspace</Link>
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Projects</span>
                <ChevronRight className="hidden h-4 w-4 sm:block" />
                <span className="truncate font-semibold text-text-heading">Admin Operations</span>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <button className="rounded-lg border border-border-default bg-white px-3 py-2 text-xs font-semibold text-text-body">Manage</button>
                <button className="rounded-lg border border-border-default bg-white px-3 py-2 text-xs font-semibold text-text-body">Share</button>
              </div>
            </div>
          </header>

          <section className="mb-4 rounded-2xl border border-border-default bg-white p-3.5 shadow-sm sm:p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Admin Command Center</p>
                <p className="mt-1 text-sm text-text-muted">Unified control for users, bookings, itineraries, and support operations.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <KpiCard label="Users" value={String(totals.users)} tone="blue" />
                <KpiCard label="Orders" value={String(totals.orders)} tone="green" />
                <KpiCard label="Itineraries" value={String(totals.itineraries)} tone="amber" />
                <KpiCard label="Revenue" value={`${totals.recentRevenue} EUR`} tone="slate" />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border-default bg-surface-alt p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-heading">{chartModel.title}</p>
                <div className="flex items-center gap-1">
                  <button className="rounded-md bg-surface-brand-soft px-2 py-1 text-xs font-semibold text-text-brand">6M</button>
                </div>
              </div>
              <div className="no-scrollbar max-w-full overflow-x-auto">
                <svg viewBox="0 0 900 180" className="h-[140px] min-w-[460px] w-full sm:h-[160px] sm:min-w-[620px]">
                  <rect x="0" y="0" width="900" height="180" fill="transparent" />
                  <path d={chartModel.firstPath} stroke="var(--color-metric-primary)" strokeWidth="3" fill="none" />
                  <path d={chartModel.secondPath} stroke="var(--color-metric-secondary)" strokeWidth="3" fill="none" />
                </svg>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-metric-primary" />
                    {chartModel.firstLabel} ({chartModel.firstTotal}{chartModel.firstSuffix ? ` ${chartModel.firstSuffix}` : ""} / 6M)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-metric-secondary" />
                    {chartModel.secondLabel} ({chartModel.secondTotal}{chartModel.secondSuffix ? ` ${chartModel.secondSuffix}` : ""} / 6M)
                  </span>
                </div>
                <span className="w-full break-words text-left sm:w-auto sm:text-right">{chartModel.months.join("  •  ")}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border-default bg-white p-3.5 shadow-sm sm:p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="no-scrollbar max-w-full flex w-full gap-2 overflow-x-auto pb-1 md:w-auto md:flex-wrap md:overflow-visible md:pb-0">
                {(["users", "orders", "itineraries", "feedback"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setActiveNav(tab);
                      setFilterValue("all");
                      setSortValue("default");
                    }}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                      activeTab === tab ? "bg-text-primary text-white" : "border border-border-strong bg-white text-text-body"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="max-w-full flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMenuOpen((prev) => !prev);
                      setSortMenuOpen(false);
                    }}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-border-strong bg-white px-3 py-2 text-xs font-semibold text-text-body"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filter
                  </button>
                  {filterMenuOpen ? (
                    <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-border-strong bg-white p-1 shadow-lg md:left-auto md:right-0">
                      {filterOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setFilterValue(option.value);
                            setFilterMenuOpen(false);
                          }}
                          className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                            filterValue === option.value
                              ? "bg-surface-brand-subtle font-semibold text-text-brand"
                              : "text-text-body hover:bg-surface-muted"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSortMenuOpen((prev) => !prev);
                      setFilterMenuOpen(false);
                    }}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-border-strong bg-white px-3 py-2 text-xs font-semibold text-text-body"
                  >
                    <Settings2 className="h-4 w-4" />
                    Sort
                  </button>
                  {sortMenuOpen ? (
                    <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-border-strong bg-white p-1 shadow-lg md:left-auto md:right-0">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSortValue(option.value);
                            setSortMenuOpen(false);
                          }}
                          className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                            sortValue === option.value
                              ? "bg-surface-brand-subtle font-semibold text-text-brand"
                              : "text-text-body hover:bg-surface-muted"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="relative min-w-0 grow md:grow-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${activeTab}`}
                    className="h-10 w-full min-w-0 rounded-lg border border-border-strong pl-9 pr-3 text-sm outline-none focus:border-brand md:w-[220px]"
                  />
                </div>
              </div>
            </div>

            {message ? (
              <div className="mb-3 rounded-lg border border-border-info bg-surface-info px-3 py-2 text-sm text-text-brand">{message}</div>
            ) : null}

            <div className="md:hidden">
              {activeTab === "users" ? (
                <MobileList
                  rows={visibleUsers.map((user) => ({
                    id: user.id,
                    title: user.name,
                    subtitle: user.email,
                    meta: user.emailVerified ? "Verified" : "Unverified",
                    actions: (
                      <>
                        <ActionButton
                          label="Edit"
                          disabled={busyId === user.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                const name = window.prompt("Update name", user.name);
                                if (!name) return;
                                const response = await fetch(`/api/v1/admin/users/${user.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ name }),
                                });
                                if (!response.ok) throw new Error("User update failed");
                                setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, name } : item)));
                              },
                              user.id,
                              "User updated",
                            )
                          }
                        />
                        <DangerButton
                          label="Delete"
                          disabled={busyId === user.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                if (!window.confirm("Delete user and related records?")) return;
                                const response = await fetch(`/api/v1/admin/users/${user.id}`, { method: "DELETE" });
                                if (!response.ok) throw new Error("User delete failed");
                                setUsers((prev) => prev.filter((item) => item.id !== user.id));
                              },
                              user.id,
                              "User deleted",
                            )
                          }
                        />
                      </>
                    ),
                  }))}
                />
              ) : null}

              {activeTab === "orders" ? (
                <MobileList
                  rows={visibleOrders.map((order) => ({
                    id: order.id,
                    title: order.orderCode,
                    subtitle: order.customer.email,
                    meta: `${order.status} • ${order.total} ${order.currency}`,
                    actions: (
                      <>
                        <ActionButton
                          label="Toggle"
                          disabled={busyId === order.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                const nextStatus = order.status === "confirmed" ? "cancelled" : "confirmed";
                                const response = await fetch(`/api/v1/admin/orders/${order.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ status: nextStatus }),
                                });
                                if (!response.ok) throw new Error("Order update failed");
                                setOrders((prev) => prev.map((it) => (it.id === order.id ? { ...it, status: nextStatus } : it)));
                              },
                              order.id,
                              "Order updated",
                            )
                          }
                        />
                        <DangerButton
                          label="Delete"
                          disabled={busyId === order.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                if (!window.confirm("Delete this order?")) return;
                                const response = await fetch(`/api/v1/admin/orders/${order.id}`, { method: "DELETE" });
                                if (!response.ok) throw new Error("Order delete failed");
                                setOrders((prev) => prev.filter((it) => it.id !== order.id));
                              },
                              order.id,
                              "Order deleted",
                            )
                          }
                        />
                      </>
                    ),
                  }))}
                />
              ) : null}

              {activeTab === "itineraries" ? (
                <MobileList
                  rows={visibleItineraries.map((item) => ({
                    id: item.id,
                    title: item.id,
                    subtitle: item.userId,
                    meta: `${item.status} • ${new Date(item.updatedAt).toLocaleString()}`,
                    actions: (
                      <>
                        <ActionButton
                          label="Cycle"
                          disabled={busyId === item.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                const status = item.status === "saved" ? "archived" : item.status === "archived" ? "draft" : "saved";
                                const response = await fetch(`/api/v1/admin/itineraries/${item.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ status }),
                                });
                                if (!response.ok) throw new Error("Itinerary update failed");
                                setItineraries((prev) => prev.map((it) => (it.id === item.id ? { ...it, status } : it)));
                              },
                              item.id,
                              "Itinerary updated",
                            )
                          }
                        />
                        <DangerButton
                          label="Delete"
                          disabled={busyId === item.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                if (!window.confirm("Delete itinerary?")) return;
                                const response = await fetch(`/api/v1/admin/itineraries/${item.id}`, { method: "DELETE" });
                                if (!response.ok) throw new Error("Itinerary delete failed");
                                setItineraries((prev) => prev.filter((it) => it.id !== item.id));
                              },
                              item.id,
                              "Itinerary deleted",
                            )
                          }
                        />
                      </>
                    ),
                  }))}
                />
              ) : null}

              {activeTab === "feedback" ? (
                <MobileList
                  rows={visibleFeedback.map((item) => ({
                    id: item.id,
                    title: item.category,
                    subtitle: item.email ?? "Anonymous",
                    meta: `Rating: ${item.rating ?? "-"} • ${item.status}`,
                    details: item.message,
                    actions: (
                      <>
                        <ActionButton
                          label="Toggle"
                          disabled={busyId === item.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                const status = item.status === "new" ? "reviewed" : "new";
                                const response = await fetch(`/api/v1/admin/feedback/${item.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ status }),
                                });
                                if (!response.ok) throw new Error("Feedback update failed");
                                setFeedback((prev) => prev.map((it) => (it.id === item.id ? { ...it, status } : it)));
                              },
                              item.id,
                              "Feedback updated",
                            )
                          }
                        />
                        <DangerButton
                          label="Delete"
                          disabled={busyId === item.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                if (!window.confirm("Delete feedback entry?")) return;
                                const response = await fetch(`/api/v1/admin/feedback/${item.id}`, { method: "DELETE" });
                                if (!response.ok) throw new Error("Feedback delete failed");
                                setFeedback((prev) => prev.filter((it) => it.id !== item.id));
                              },
                              item.id,
                              "Feedback deleted",
                            )
                          }
                        />
                      </>
                    ),
                  }))}
                />
              ) : null}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-border-soft md:block">
              <div className="max-h-[460px] overflow-auto">
                {activeTab === "users" ? (
                  <ResourceTable
                    headers={["Name", "Email", "Verified", "Actions"]}
                    rows={visibleUsers.map((user) => [
                      user.name,
                      user.email,
                      user.emailVerified ? "Yes" : "No",
                      <div key={user.id} className="flex gap-2">
                        <ActionButton
                          label="Edit"
                          disabled={busyId === user.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                const name = window.prompt("Update name", user.name);
                                if (!name) return;
                                const response = await fetch(`/api/v1/admin/users/${user.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ name }),
                                });
                                if (!response.ok) throw new Error("User update failed");
                                setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, name } : item)));
                              },
                              user.id,
                              "User updated",
                            )
                          }
                        />
                        <DangerButton
                          label="Delete"
                          disabled={busyId === user.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                if (!window.confirm("Delete user and related records?")) return;
                                const response = await fetch(`/api/v1/admin/users/${user.id}`, { method: "DELETE" });
                                if (!response.ok) throw new Error("User delete failed");
                                setUsers((prev) => prev.filter((item) => item.id !== user.id));
                              },
                              user.id,
                              "User deleted",
                            )
                          }
                        />
                      </div>,
                    ])}
                  />
                ) : null}

                {activeTab === "orders" ? (
                  <ResourceTable
                    headers={["Order", "Customer", "Status", "Value", "Actions"]}
                    rows={visibleOrders.map((order) => [
                      order.orderCode,
                      order.customer.email,
                      order.status,
                      `${order.total} ${order.currency}`,
                      <div key={order.id} className="flex gap-2">
                        <ActionButton
                          label="Toggle"
                          disabled={busyId === order.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                const nextStatus = order.status === "confirmed" ? "cancelled" : "confirmed";
                                const response = await fetch(`/api/v1/admin/orders/${order.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ status: nextStatus }),
                                });
                                if (!response.ok) throw new Error("Order update failed");
                                setOrders((prev) => prev.map((it) => (it.id === order.id ? { ...it, status: nextStatus } : it)));
                              },
                              order.id,
                              "Order updated",
                            )
                          }
                        />
                        <DangerButton
                          label="Delete"
                          disabled={busyId === order.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                if (!window.confirm("Delete this order?")) return;
                                const response = await fetch(`/api/v1/admin/orders/${order.id}`, { method: "DELETE" });
                                if (!response.ok) throw new Error("Order delete failed");
                                setOrders((prev) => prev.filter((it) => it.id !== order.id));
                              },
                              order.id,
                              "Order deleted",
                            )
                          }
                        />
                      </div>,
                    ])}
                  />
                ) : null}

                {activeTab === "itineraries" ? (
                  <ResourceTable
                    headers={["Itinerary ID", "User ID", "Status", "Updated", "Actions"]}
                    rows={visibleItineraries.map((item) => [
                      <span key={`${item.id}-id`} className="font-mono text-xs">{item.id}</span>,
                      <span key={`${item.id}-uid`} className="font-mono text-xs">{item.userId}</span>,
                      item.status,
                      new Date(item.updatedAt).toLocaleString(),
                      <div key={item.id} className="flex gap-2">
                        <ActionButton
                          label="Cycle"
                          disabled={busyId === item.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                const status = item.status === "saved" ? "archived" : item.status === "archived" ? "draft" : "saved";
                                const response = await fetch(`/api/v1/admin/itineraries/${item.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ status }),
                                });
                                if (!response.ok) throw new Error("Itinerary update failed");
                                setItineraries((prev) => prev.map((it) => (it.id === item.id ? { ...it, status } : it)));
                              },
                              item.id,
                              "Itinerary updated",
                            )
                          }
                        />
                        <DangerButton
                          label="Delete"
                          disabled={busyId === item.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                if (!window.confirm("Delete itinerary?")) return;
                                const response = await fetch(`/api/v1/admin/itineraries/${item.id}`, { method: "DELETE" });
                                if (!response.ok) throw new Error("Itinerary delete failed");
                                setItineraries((prev) => prev.filter((it) => it.id !== item.id));
                              },
                              item.id,
                              "Itinerary deleted",
                            )
                          }
                        />
                      </div>,
                    ])}
                  />
                ) : null}

                {activeTab === "feedback" ? (
                  <ResourceTable
                    headers={["Category", "Email", "Rating", "Status", "Message", "Actions"]}
                    rows={visibleFeedback.map((item) => [
                      item.category,
                      item.email ?? "Anonymous",
                      item.rating ?? "-",
                      item.status,
                      <span key={`${item.id}-msg`} className="line-clamp-2 max-w-[320px]">{item.message}</span>,
                      <div key={item.id} className="flex gap-2">
                        <ActionButton
                          label="Toggle"
                          disabled={busyId === item.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                const status = item.status === "new" ? "reviewed" : "new";
                                const response = await fetch(`/api/v1/admin/feedback/${item.id}`, {
                                  method: "PATCH",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ status }),
                                });
                                if (!response.ok) throw new Error("Feedback update failed");
                                setFeedback((prev) => prev.map((it) => (it.id === item.id ? { ...it, status } : it)));
                              },
                              item.id,
                              "Feedback updated",
                            )
                          }
                        />
                        <DangerButton
                          label="Delete"
                          disabled={busyId === item.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                if (!window.confirm("Delete feedback entry?")) return;
                                const response = await fetch(`/api/v1/admin/feedback/${item.id}`, { method: "DELETE" });
                                if (!response.ok) throw new Error("Feedback delete failed");
                                setFeedback((prev) => prev.filter((it) => it.id !== item.id));
                              },
                              item.id,
                              "Feedback deleted",
                            )
                          }
                        />
                      </div>,
                    ])}
                  />
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left ${
        active ? "bg-white font-semibold text-text-primary shadow-sm" : "text-text-muted hover:bg-white"
      }`}
    >
      {icon}
      {label}
      {typeof count === "number" ? (
        <span className="ml-auto rounded-full bg-surface-count-chip px-2 py-0.5 text-[10px] text-text-body">{count}</span>
      ) : null}
    </button>
  );
}

function SidebarItemCompact({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
        active
          ? "border-text-primary bg-text-primary text-white"
          : "border-border-strong bg-white text-text-body"
      }`}
    >
      {label}
    </button>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "amber" | "slate" }) {
  const toneClass =
    tone === "blue"
      ? "border-border-info bg-surface-info"
      : tone === "green"
      ? "border-border-success bg-surface-success-soft"
      : tone === "amber"
      ? "border-border-warning bg-surface-warning-soft"
      : "border-border-strong bg-slate-50";

  return (
    <div className={`min-w-[120px] rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-base font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function MobileList({
  rows,
}: {
  rows: Array<{
    id: string;
    title: ReactNode;
    subtitle: ReactNode;
    meta: ReactNode;
    details?: ReactNode;
    actions: ReactNode;
  }>;
}) {
  if (rows.length === 0) {
    return <div className="rounded-xl border border-border-soft bg-slate-50 p-3 text-sm text-text-muted">No results found.</div>;
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <article key={row.id} className="rounded-xl border border-border-soft bg-white p-3">
          <p className="truncate text-sm font-semibold text-text-primary">{row.title}</p>
          <p className="mt-1 truncate text-xs text-text-body">{row.subtitle}</p>
          <p className="mt-1 text-xs text-text-muted">{row.meta}</p>
          {row.details ? <p className="mt-2 line-clamp-3 text-xs text-text-body">{row.details}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">{row.actions}</div>
        </article>
      ))}
    </div>
  );
}

function ResourceTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-border-soft bg-slate-50 text-left text-text-muted">
          {headers.map((header) => (
            <th key={header} className="px-3 py-2 font-medium">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-border-subtle text-text-body">
            {row.map((cell, cellIndex) => (
              <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-3 align-middle">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActionButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-border-strong bg-white px-2.5 py-1 text-xs font-semibold text-text-body disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function DangerButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-border-danger-subtle bg-surface-danger-subtle px-2.5 py-1 text-xs font-semibold text-text-danger disabled:opacity-50"
    >
      {label}
    </button>
  );
}
