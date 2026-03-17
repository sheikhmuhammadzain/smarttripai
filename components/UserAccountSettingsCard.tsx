"use client";

import { FormEvent, useState } from "react";

interface UserAccountSettingsCardProps {
  initial: {
    name: string;
    email: string;
    phone: string;
  };
}

const inputCls = "h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors";

export default function UserAccountSettingsCard({ initial }: UserAccountSettingsCardProps) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const response = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() === "" ? null : phone.trim(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to update account");
      }

      setProfileMessage("Account settings updated.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Failed to update account");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage(null);

    try {
      const response = await fetch("/api/v1/users/me/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to change password");
      }

      setPasswordMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-border-default bg-surface-base p-5">
      <h2 className="mb-4 text-lg font-semibold text-text-heading">Account Settings</h2>

      <form onSubmit={saveProfile} className="mb-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Name</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputCls} />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Phone number</span>
          <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 123 4567" className={inputCls} />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Email</span>
          <input
            type="email"
            value={initial.email}
            disabled
            className="h-10 w-full rounded-lg border border-border-subtle bg-surface-muted px-3 text-sm text-text-muted cursor-not-allowed"
          />
        </label>

        <div className="md:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={profileSaving} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-70 transition-colors">
            {profileSaving ? "Saving..." : "Save account settings"}
          </button>
          {profileMessage ? <p className="text-sm text-text-muted">{profileMessage}</p> : null}
        </div>
      </form>

      <div className="border-t border-border-subtle pt-5">
        <h3 className="mb-3 text-base font-semibold text-text-heading">Security</h3>
        <form onSubmit={changePassword} className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Current password</span>
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputCls} required />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">New password</span>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputCls} minLength={8} required />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Confirm password</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputCls} minLength={8} required />
          </label>

          <div className="md:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={passwordSaving} className="rounded-full border border-border-default px-5 py-2 text-sm font-semibold text-text-primary hover:bg-surface-subtle disabled:opacity-70 transition-colors">
              {passwordSaving ? "Updating..." : "Change password"}
            </button>
            {passwordMessage ? <p className="text-sm text-text-muted">{passwordMessage}</p> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
