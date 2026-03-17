"use client";

import { FormEvent, useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface Props {
    initial: {
        name: string;
        email: string;
        phone: string;
    };
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

const selectCls =
    "flex-1 h-10 rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary outline-none appearance-none cursor-pointer focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors";

const inputCls =
    "h-12 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors";

export default function SettingsPageClient({ initial }: Props) {
    const nameParts = initial.name.trim().split(" ");
    const [firstName, setFirstName] = useState(nameParts[0] ?? "");
    const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") ?? "");
    const [phone, setPhone] = useState(initial.phone);
    const [dobDay, setDobDay] = useState("");
    const [dobMonth, setDobMonth] = useState("");
    const [dobYear, setDobYear] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    async function handleSave(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setSaveMessage(null);
        try {
            const response = await fetch("/api/v1/users/me", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                    phone: phone.trim() || null,
                }),
            });
            if (!response.ok) {
                const body = (await response.json()) as { detail?: string };
                throw new Error(body.detail ?? "Failed to save");
            }
            setSaveMessage("Changes saved.");
        } catch (err) {
            setSaveMessage(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave}>
            {/* Profile Details */}
            <section className="mb-6">
                <h2 className="mb-4 text-base font-bold text-text-heading">Profile Details</h2>
                <div className="border-t border-border-subtle pt-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs text-text-muted">First Name</label>
                            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-text-muted">Last Name</label>
                            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Details */}
            <section className="mb-6">
                <h2 className="mb-4 text-base font-bold text-text-heading">Contact Details</h2>
                <div className="border-t border-border-subtle pt-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs text-text-muted">Email</label>
                            <input
                                type="email"
                                value={initial.email}
                                disabled
                                className="h-12 w-full rounded-lg border border-border-subtle bg-surface-muted px-3 text-sm text-text-muted cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-text-muted">Mobile Phone</label>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" className={inputCls} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Date of birth */}
            <section className="mb-8">
                <h2 className="mb-4 text-base font-bold text-text-heading">Date of birth</h2>
                <div className="border-t border-border-subtle pt-5">
                    <div className="flex gap-3">
                        <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} className={selectCls}>
                            <option value="">Day</option>
                            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} className={selectCls}>
                            <option value="">Month</option>
                            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={dobYear} onChange={(e) => setDobYear(e.target.value)} className={selectCls}>
                            <option value="">Year</option>
                            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            {/* Save */}
            <div className="flex items-center gap-4">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save"}
                </button>
                {saveMessage && <p className="text-sm text-text-muted">{saveMessage}</p>}
            </div>

            {/* Delete account */}
            <div className="mt-10 border-t border-border-subtle pt-6">
                {!deleteConfirm ? (
                    <button type="button" onClick={() => setDeleteConfirm(true)} className="text-sm font-semibold text-text-danger underline underline-offset-2 hover:opacity-80">
                        Delete Account
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-text-primary">Are you sure?</p>
                        <button
                            type="button"
                            className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                            onClick={async () => {
                                await fetch("/api/v1/users/me", { method: "DELETE" });
                                await signOut({ callbackUrl: "/" });
                            }}
                        >
                            Yes, delete
                        </button>
                        <button type="button" onClick={() => setDeleteConfirm(false)} className="text-sm text-text-muted hover:text-text-primary">
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Sign out */}
            <div className="mt-8 border-t border-border-subtle pt-5">
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-primary"
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </button>
            </div>
        </form>
    );
}
