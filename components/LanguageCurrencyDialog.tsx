"use client";

import { Check, X } from "lucide-react";
import { useEffect } from "react";
import {
  CURRENCY_OPTIONS,
  type AppCurrency,
  type AppPreferences,
} from "@/lib/preferences-client";

interface Props {
  open: boolean;
  preferences: AppPreferences;
  onClose: () => void;
  onChange: (next: AppPreferences) => void;
}

export default function LanguageCurrencyDialog({ open, preferences, onClose, onChange }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-90 bg-slate-900/45 backdrop-blur-[1px] px-4 py-8 flex items-start justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select currency"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border-soft bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
          <h2 className="text-base font-bold text-text-heading">Select Currency</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-text-muted hover:bg-surface-subtle transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Currency grid */}
        <div className="overflow-y-auto max-h-[70vh] p-4">
          <div className="grid grid-cols-2 gap-2">
            {CURRENCY_OPTIONS.map((item) => {
              const selected = preferences.currency === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    onChange({ ...preferences, currency: item.code as AppCurrency });
                    onClose();
                  }}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-brand bg-brand text-white"
                      : "border-border-default hover:border-brand hover:bg-surface-subtle"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold">{item.symbol} {item.code}</span>
                    <span className={`block text-xs ${selected ? "text-white/80" : "text-text-muted"}`}>{item.label}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
