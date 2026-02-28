"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";

interface AuthCardProps {
  mode: "signin" | "signup";
}

export default function AuthCard({ mode }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const title = isSignup ? "Create account" : "Sign in";
  const subtitle = isSignup
    ? "Create your travel planner account with email and password."
    : "Access your trips and dashboard with email and password.";

  const callbackUrl = useMemo(() => (isSignup ? "/dashboard" : "/dashboard"), [isSignup]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await signIn("credentials", {
      email,
      password,
      intent: isSignup ? "signup" : "signin",
      ...(isSignup ? { name } : {}),
      redirect: false,
      callbackUrl,
    });

    if (!response || response.error) {
      setError(
        isSignup
          ? "Account creation failed. Use a unique email and a strong password (upper, lower, number, symbol)."
          : "Sign in failed. Check your email and password.",
      );
      setIsLoading(false);
      return;
    }

    if (!isSignup) {
      try {
        const adminProbe = await fetch("/api/v1/admin/overview", { method: "GET" });
        if (adminProbe.ok) {
          window.location.href = "/admin";
          return;
        }
      } catch {
        // Ignore and fall through to default dashboard.
      }
    }

    window.location.href = response.url ?? callbackUrl;
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl md:rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-md md:shadow-lg">
      <h1 className="text-2xl font-bold text-text-heading">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-blue-600"
            placeholder="you@example.com"
          />
        </label>

        {isSignup ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-blue-600"
              placeholder="Your name"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-blue-600"
            placeholder="Enter password"
          />
          {isSignup ? (
            <p className="mt-1 text-xs text-gray-500">
              Use at least 8 characters with uppercase, lowercase, number, and symbol.
            </p>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-brand px-5 py-2.5 font-semibold text-white disabled:opacity-70"
        >
          {isLoading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-5 text-sm text-gray-600">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <Link href={isSignup ? "/auth/signin" : "/auth/signup"} className="font-semibold text-brand">
          {isSignup ? "Sign in" : "Create account"}
        </Link>
      </div>
    </div>
  );
}

