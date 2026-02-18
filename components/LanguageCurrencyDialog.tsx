"use client";

import { Check, Globe, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CURRENCY_OPTIONS,
  LANGUAGE_OPTIONS,
  type AppCurrency,
  type AppLanguage,
  type AppPreferences,
} from "@/lib/preferences-client";

interface LanguageCurrencyDialogProps {
  open: boolean;
  preferences: AppPreferences;
  onClose: () => void;
  onChange: (next: AppPreferences) => void;
}

type TabMode = "language" | "currency";

export default function LanguageCurrencyDialog({
  open,
  preferences,
  onClose,
  onChange,
}: LanguageCurrencyDialogProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("language");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const featuredCurrencies = useMemo(() => CURRENCY_OPTIONS.slice(0, 6), []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/45 backdrop-blur-[1px] px-4 py-8" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Language and currency preferences"
        onClick={(event) => event.stopPropagation()}
        className="mx-auto flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-text-heading">Preferences</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Close preferences dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 pt-2">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("language")}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${
                activeTab === "language"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Globe className="h-4 w-4" />
              Language
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("currency")}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${
                activeTab === "currency"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                $
              </span>
              Currency
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {activeTab === "language" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LANGUAGE_OPTIONS.map((item) => {
                const selected = preferences.language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => onChange({ ...preferences, language: item.code as AppLanguage })}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${
                      selected ? "border-brand bg-blue-50 text-brand" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-xs text-gray-500">{item.nativeLabel}</span>
                    </span>
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <p className="mb-3 text-sm font-semibold text-text-heading">Popular currencies</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredCurrencies.map((item) => (
                    <CurrencyButton
                      key={item.code}
                      code={item.code}
                      label={item.label}
                      symbol={item.symbol}
                      selected={preferences.currency === item.code}
                      onClick={() => onChange({ ...preferences, currency: item.code as AppCurrency })}
                    />
                  ))}
                </div>
              </section>

              <section className="border-t border-gray-200 pt-4">
                <p className="mb-3 text-sm font-semibold text-text-heading">All currencies</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CURRENCY_OPTIONS.map((item) => (
                    <CurrencyButton
                      key={item.code}
                      code={item.code}
                      label={item.label}
                      symbol={item.symbol}
                      selected={preferences.currency === item.code}
                      onClick={() => onChange({ ...preferences, currency: item.code as AppCurrency })}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrencyButton({
  code,
  label,
  symbol,
  selected,
  onClick,
}: {
  code: string;
  label: string;
  symbol: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${
        selected ? "border-brand bg-blue-50 text-brand" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-gray-500">
          {code} {symbol}
        </span>
      </span>
      {selected ? <Check className="h-4 w-4" /> : null}
    </button>
  );
}
