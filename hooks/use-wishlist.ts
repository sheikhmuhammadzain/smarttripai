"use client";

import { useEffect, useState } from "react";

interface WishlistStore {
  items: string[];
  loaded: boolean;
  loading: boolean;
  subscribers: Set<() => void>;
}

// Module-level store — survives Next.js soft navigation between pages
const store: WishlistStore = {
  items: [],
  loaded: false,
  loading: false,
  subscribers: new Set(),
};

function notify(): void {
  store.subscribers.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wishlist:changed", { detail: { items: store.items } }),
    );
  }
}

async function fetchWishlist(): Promise<void> {
  if (store.loaded || store.loading) return;
  store.loading = true;
  try {
    const res = await fetch("/api/v1/wishlist", { cache: "no-store" });
    if (!res.ok) {
      store.loaded = true;
      return;
    }
    const body = (await res.json()) as { items: string[] };
    store.items = body.items ?? [];
    store.loaded = true;
    notify();
  } catch {
    store.loaded = true;
  } finally {
    store.loading = false;
  }
}

export function useWishlist() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const sub = () => rerender((n) => n + 1);
    store.subscribers.add(sub);
    void fetchWishlist();
    return () => {
      store.subscribers.delete(sub);
    };
  }, []);

  async function toggle(productId: string): Promise<void> {
    const wasWishlisted = store.items.includes(productId);
    // Optimistic update
    store.items = wasWishlisted
      ? store.items.filter((id) => id !== productId)
      : [...store.items, productId];
    notify();

    try {
      const res = await fetch("/api/v1/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 401) {
        // Revert and redirect to sign-in
        store.items = wasWishlisted
          ? store.items
          : store.items.filter((id) => id !== productId);
        notify();
        window.location.href = "/auth/signin";
        return;
      }

      if (!res.ok) {
        // Revert
        store.items = wasWishlisted
          ? [...store.items, productId]
          : store.items.filter((id) => id !== productId);
        notify();
        return;
      }

      const body = (await res.json()) as { items: string[] };
      store.items = body.items ?? [];
      notify();
    } catch {
      // Revert
      store.items = wasWishlisted
        ? [...store.items, productId]
        : store.items.filter((id) => id !== productId);
      notify();
    }
  }

  async function remove(productId: string): Promise<void> {
    // Optimistic
    store.items = store.items.filter((id) => id !== productId);
    notify();

    try {
      const res = await fetch(`/api/v1/wishlist/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        store.loaded = false;
        void fetchWishlist();
        return;
      }
      const body = (await res.json()) as { items: string[] };
      store.items = body.items ?? [];
      notify();
    } catch {
      store.loaded = false;
      void fetchWishlist();
    }
  }

  return {
    items: store.items,
    isWishlisted: (id: string) => store.items.includes(id),
    isLoading: !store.loaded,
    toggle,
    remove,
  };
}
