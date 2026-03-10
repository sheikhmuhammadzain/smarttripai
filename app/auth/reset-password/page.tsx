"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type PageState = "idle" | "loading" | "success" | "error" | "invalid";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token") ?? "";

    const [state, setState] = useState<PageState>(token ? "idle" : "invalid");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!token) setState("invalid");
    }, [token]);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMsg(null);

        if (newPassword !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        setState("loading");
        try {
            const res = await fetch("/api/v1/auth/reset-password-with-token", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const body = (await res.json()) as { detail?: string };

            if (!res.ok) {
                setErrorMsg(body.detail ?? "Reset failed. The link may have expired.");
                setState("error");
                return;
            }

            setState("success");
        } catch {
            setErrorMsg("Network error. Please try again.");
            setState("error");
        }
    }

    return (
        <div className="mx-auto w-full max-w-md rounded-xl border border-border-default bg-surface-base p-5 shadow-md md:rounded-2xl md:p-6 md:shadow-lg">

            {state === "invalid" && (
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
                        <XCircle className="h-7 w-7 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-text-heading">Invalid link</h1>
                    <p className="text-sm text-text-muted">
                        This password reset link is missing a token. Please request a new one.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push("/auth/signin")}
                        className="mt-2 w-full rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
                    >
                        Back to sign in
                    </button>
                </div>
            )}

            {state === "success" && (
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h1 className="text-xl font-bold text-text-heading">Password reset!</h1>
                    <p className="text-sm text-text-muted">
                        Your password has been updated. You can now sign in with your new password.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push("/auth/signin")}
                        className="mt-2 w-full rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
                    >
                        Sign in
                    </button>
                </div>
            )}

            {(state === "idle" || state === "loading" || state === "error") && (
                <>
                    <h1 className="text-2xl font-bold text-text-heading">Set new password</h1>
                    <p className="mt-1 text-sm text-text-body">
                        Choose a strong password with at least 8 characters.
                    </p>

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-text-body">
                                New password
                            </span>
                            <input
                                required
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={8}
                                placeholder="At least 8 characters"
                                className="h-11 w-full rounded-lg border border-border-strong bg-surface-base px-3 text-text-primary outline-none focus:border-brand"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-text-body">
                                Confirm new password
                            </span>
                            <input
                                required
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={8}
                                placeholder="Repeat new password"
                                className="h-11 w-full rounded-lg border border-border-strong bg-surface-base px-3 text-text-primary outline-none focus:border-brand"
                            />
                        </label>

                        {errorMsg && (
                            <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                        )}

                        <button
                            type="submit"
                            disabled={state === "loading"}
                            className="w-full rounded-full bg-brand px-5 py-2.5 font-semibold text-white disabled:opacity-70"
                        >
                            {state === "loading" ? "Updating password…" : "Reset password"}
                        </button>
                    </form>
                </>
            )}

        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-surface-muted text-text-heading">
            <Header />
            <main className="mx-auto max-w-300 px-4 py-8 md:py-14 md:px-6">
                <Suspense fallback={<div className="mx-auto w-full max-w-md p-6 text-center text-text-muted">Loading…</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}

