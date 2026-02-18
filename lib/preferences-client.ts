"use client";

import { useEffect, useMemo, useState } from "react";

export type AppLanguage = "en" | "tr" | "de" | "fr" | "es" | "ar";
export type AppCurrency = "USD" | "EUR" | "TRY" | "GBP" | "CAD" | "AUD" | "CHF" | "JPY";

export interface AppPreferences {
  language: AppLanguage;
  currency: AppCurrency;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  language: "en",
  currency: "USD",
};

export const APP_PREFERENCES_STORAGE_KEY = "gyg_app_preferences_v1";
export const APP_PREFERENCES_EVENT = "app:preferences-changed";

export const LANGUAGE_OPTIONS: Array<{ code: AppLanguage; label: string; nativeLabel: string; locale: string }> = [
  { code: "en", label: "English", nativeLabel: "English", locale: "en-US" },
  { code: "tr", label: "Turkish", nativeLabel: "Turkce", locale: "tr-TR" },
  { code: "de", label: "German", nativeLabel: "Deutsch", locale: "de-DE" },
  { code: "fr", label: "French", nativeLabel: "Francais", locale: "fr-FR" },
  { code: "es", label: "Spanish", nativeLabel: "Espanol", locale: "es-ES" },
  { code: "ar", label: "Arabic", nativeLabel: "Arabic", locale: "ar-SA" },
];

export const CURRENCY_OPTIONS: Array<{ code: AppCurrency; label: string; symbol: string }> = [
  { code: "USD", label: "U.S. Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "EUR" },
  { code: "TRY", label: "Turkish Lira", symbol: "TRY" },
  { code: "GBP", label: "British Pound", symbol: "GBP" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CAD" },
  { code: "AUD", label: "Australian Dollar", symbol: "AUD" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "JPY", label: "Japanese Yen", symbol: "JPY" },
];

export function getLanguageLocale(language: AppLanguage) {
  return LANGUAGE_OPTIONS.find((item) => item.code === language)?.locale ?? "en-US";
}

export function readAppPreferences(): AppPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_APP_PREFERENCES;
  }

  const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
  if (!raw) return DEFAULT_APP_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    const languageValid = LANGUAGE_OPTIONS.some((item) => item.code === parsed.language);
    const currencyValid = CURRENCY_OPTIONS.some((item) => item.code === parsed.currency);
    return {
      language: languageValid ? (parsed.language as AppLanguage) : DEFAULT_APP_PREFERENCES.language,
      currency: currencyValid ? (parsed.currency as AppCurrency) : DEFAULT_APP_PREFERENCES.currency,
    };
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function writeAppPreferences(next: AppPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(APP_PREFERENCES_EVENT, { detail: next }));
}

export function useAppPreferences() {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);

  useEffect(() => {
    setPreferences(readAppPreferences());

    function onPreferencesChanged(event: Event) {
      const custom = event as CustomEvent<AppPreferences>;
      if (custom.detail) {
        setPreferences(custom.detail);
        return;
      }
      setPreferences(readAppPreferences());
    }

    window.addEventListener(APP_PREFERENCES_EVENT, onPreferencesChanged as EventListener);
    return () => {
      window.removeEventListener(APP_PREFERENCES_EVENT, onPreferencesChanged as EventListener);
    };
  }, []);

  const locale = useMemo(() => getLanguageLocale(preferences.language), [preferences.language]);

  return { preferences, setPreferences: writeAppPreferences, locale };
}
