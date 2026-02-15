"use client";

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
import { type ReactNode, useMemo, useState } from "react";

type AdminTab = "users" | "orders" | "itineraries" | "feedback";
type AdminNav = "overview" | AdminTab;

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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [users, setUsers] = useState(props.users.data);
  const [orders, setOrders] = useState(props.orders.data);
  const [itineraries, setItineraries] = useState(props.itineraries.data);
  const [feedback, setFeedback] = useState(props.feedback.data);

  const totals = props.overview.totals;

  const chartModel = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    const orderSeries: number[] = [];
    const itinerarySeries: number[] = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push(date.toLocaleString("en-US", { month: "short" }));

      const orderValue = orders
        .filter((order) => {
          const d = new Date(order.createdAt);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return k === key;
        })
        .reduce((sum, item) => sum + item.total, 0);
      orderSeries.push(orderValue);

      const itineraryValue = itineraries.filter((item) => {
        const d = new Date(item.updatedAt);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return k === key;
      }).length;
      itinerarySeries.push(itineraryValue);
    }

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

    return {
      months,
      orderSeries,
      itinerarySeries,
      orderPath: makePath(orderSeries, 900, 180),
      itineraryPath: makePath(itinerarySeries, 900, 180),
    };
  }, [orders, itineraries]);

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
    <div className="flex min-h-screen">
      <aside className="hidden w-[260px] border-r border-[#e4e7ec] bg-[#f8f9fb] p-4 lg:flex lg:flex-col">
        <div className="mb-4 flex items-center gap-2 rounded-xl px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-lg font-semibold tracking-tight text-[#1f2733]">Adminy</p>
        </div>

        <div className="mb-4 rounded-xl border border-[#e4e7ec] bg-white px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-[#667085]">
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

        <div className="mt-6 space-y-1 border-t border-[#e4e7ec] pt-4 text-sm">
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

        <div className="mt-auto rounded-xl border border-[#e4e7ec] bg-white p-3">
          <p className="text-xs text-[#98a2b3]">Signed in as</p>
          <p className="text-sm font-semibold text-[#1f2733]">admin@gmail.com</p>
          <button
            onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#f3c7cd] bg-[#fff5f6] px-3 py-2 text-xs font-semibold text-[#b42318]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <section className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-[1200px]">
          <header className="mb-4 rounded-2xl border border-[#e4e7ec] bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-[#667085]">
                <Link href="/" className="font-medium text-[#344054]">Workspace</Link>
                <ChevronRight className="h-4 w-4" />
                <span>Projects</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-[#1f2733]">Admin Operations</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-[#e4e7ec] bg-white px-3 py-2 text-xs font-semibold text-[#344054]">Manage</button>
                <button className="rounded-lg border border-[#e4e7ec] bg-white px-3 py-2 text-xs font-semibold text-[#344054]">Share</button>
              </div>
            </div>
          </header>

          <section className="mb-4 rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-3xl font-bold tracking-tight text-[#101828]">Admin Command Center</p>
                <p className="mt-1 text-sm text-[#667085]">Unified control for users, bookings, itineraries, and support operations.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <KpiCard label="Users" value={String(totals.users)} tone="blue" />
                <KpiCard label="Orders" value={String(totals.orders)} tone="green" />
                <KpiCard label="Itineraries" value={String(totals.itineraries)} tone="amber" />
                <KpiCard label="Revenue" value={`${totals.recentRevenue} EUR`} tone="slate" />
              </div>
            </div>

            <div className="rounded-xl border border-[#e4e7ec] bg-[#fbfcfd] p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1f2733]">Consolidated trend (real data)</p>
                <div className="flex items-center gap-1">
                  <button className="rounded-md bg-[#e8f1ff] px-2 py-1 text-xs font-semibold text-[#175cd3]">6M</button>
                </div>
              </div>
              <svg viewBox="0 0 900 180" className="h-[160px] w-full">
                <rect x="0" y="0" width="900" height="180" fill="transparent" />
                <path d={chartModel.orderPath} stroke="#0ba5ec" strokeWidth="3" fill="none" />
                <path d={chartModel.itineraryPath} stroke="#f04438" strokeWidth="3" fill="none" />
              </svg>
              <div className="mt-2 flex items-center justify-between text-xs text-[#667085]">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#0ba5ec]" />
                    Revenue ({chartModel.orderSeries.reduce((a, b) => a + b, 0)} EUR / 6M)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#f04438]" />
                    Itineraries ({chartModel.itinerarySeries.reduce((a, b) => a + b, 0)} / 6M)
                  </span>
                </div>
                <span>{chartModel.months.join("  •  ")}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(["users", "orders", "itineraries", "feedback"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setActiveNav(tab);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                      activeTab === tab ? "bg-[#101828] text-white" : "border border-[#d0d5dd] bg-white text-[#475467]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
                <button className="inline-flex items-center gap-1 rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-xs font-semibold text-[#344054]">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                </button>
                <button className="inline-flex items-center gap-1 rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-xs font-semibold text-[#344054]">
                  <Settings2 className="h-4 w-4" />
                  Sort
                </button>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${activeTab}`}
                    className="h-10 w-[220px] rounded-lg border border-[#d0d5dd] pl-9 pr-3 text-sm outline-none focus:border-[#175cd3]"
                  />
                </div>
              </div>
            </div>

            {message ? (
              <div className="mb-3 rounded-lg border border-[#b2ddff] bg-[#f0f9ff] px-3 py-2 text-sm text-[#175cd3]">{message}</div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-[#eaecf0]">
              <div className="max-h-[460px] overflow-auto">
                {activeTab === "users" ? (
                  <ResourceTable
                    headers={["Name", "Email", "Verified", "Actions"]}
                    rows={filteredUsers.map((user) => [
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
                    rows={filteredOrders.map((order) => [
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
                    rows={filteredItineraries.map((item) => [
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
                    rows={filteredFeedback.map((item) => [
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
        active ? "bg-white font-semibold text-[#101828] shadow-sm" : "text-[#667085] hover:bg-white"
      }`}
    >
      {icon}
      {label}
      {typeof count === "number" ? (
        <span className="ml-auto rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] text-[#475467]">{count}</span>
      ) : null}
    </button>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "amber" | "slate" }) {
  const toneClass =
    tone === "blue"
      ? "border-[#b2ddff] bg-[#f0f9ff]"
      : tone === "green"
      ? "border-[#abefc6] bg-[#ecfdf3]"
      : tone === "amber"
      ? "border-[#fde272] bg-[#fffaeb]"
      : "border-[#d0d5dd] bg-[#f9fafb]";

  return (
    <div className={`min-w-[120px] rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-xs text-[#667085]">{label}</p>
      <p className="text-base font-semibold text-[#101828]">{value}</p>
    </div>
  );
}

function ResourceTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-[#eaecf0] bg-[#f9fafb] text-left text-[#667085]">
          {headers.map((header) => (
            <th key={header} className="px-3 py-2 font-medium">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-[#f2f4f7] text-[#344054]">
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
      className="rounded-md border border-[#d0d5dd] bg-white px-2.5 py-1 text-xs font-semibold text-[#344054] disabled:opacity-50"
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
      className="rounded-md border border-[#fecdca] bg-[#fff5f4] px-2.5 py-1 text-xs font-semibold text-[#b42318] disabled:opacity-50"
    >
      {label}
    </button>
  );
}
