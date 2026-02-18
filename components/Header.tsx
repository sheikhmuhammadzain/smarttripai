
'use client';

import { Heart, ShoppingCart, Globe, User, LogOut, ChevronDown, Shield, Settings, LogIn } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { GETYOURGUIDE_LOGO_DATA_URI } from '@/components/branding/logo';
import { products } from '@/lib/data';
import LanguageCurrencyDialog from '@/components/LanguageCurrencyDialog';
import { useAppPreferences } from '@/lib/preferences-client';

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [accountLoading, setAccountLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [activeQuery, setActiveQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLFormElement | null>(null);
  const { preferences, setPreferences } = useAppPreferences();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const url = new URL(window.location.href);
      setActiveQuery(url.searchParams.get('q') ?? url.searchParams.get('destination') ?? '');
    } catch {
      setActiveQuery('');
    }
  }, []);

  useEffect(() => {
    setSearchInput(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const headerSuggestions = debouncedSearch.length < 2
    ? []
    : products
      .filter((product) => {
        const haystack = `${product.title} ${product.location} ${product.category} ${product.summary}`.toLowerCase();
        return haystack.includes(debouncedSearch.toLowerCase());
      })
      .slice(0, 6);

  function submitSearch(value?: string) {
    const query = (value ?? searchInput).trim();
    if (!query) return;
    setSearchFocused(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  useEffect(() => {
    const handleScroll = () => {
      // Show search bar after scrolling 400px (past hero area approx)
      setShowSearch(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountState() {
      setAccountLoading(true);
      try {
        const meResponse = await fetch('/api/v1/users/me', { cache: 'no-store' });
        if (!meResponse.ok) {
          if (!cancelled) {
            setIsAuthenticated(false);
            setIsAdmin(false);
            setUserName(null);
          }
          return;
        }

        const meBody = (await meResponse.json()) as { name?: string | null };
        if (!cancelled) {
          setIsAuthenticated(true);
          setUserName(meBody.name ?? null);
        }

        const adminResponse = await fetch('/api/v1/admin/overview', { cache: 'no-store' });
        if (!cancelled) {
          setIsAdmin(adminResponse.ok);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUserName(null);
        }
      } finally {
        if (!cancelled) {
          setAccountLoading(false);
        }
      }
    }

    void loadAccountState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWishlistCount() {
      try {
        const response = await fetch('/api/v1/wishlist', { cache: 'no-store' });
        if (!response.ok) {
          if (!cancelled) {
            setWishlistCount(0);
          }
          return;
        }

        const body = (await response.json()) as { items?: string[] };
        if (!cancelled) {
          setWishlistCount(body.items?.length ?? 0);
        }
      } catch {
        if (!cancelled) {
          setWishlistCount(0);
        }
      }
    }

    function onWishlistChanged(event: Event) {
      const custom = event as CustomEvent<{ items?: string[] }>;
      setWishlistCount(custom.detail?.items?.length ?? 0);
    }

    void loadWishlistCount();
    window.addEventListener('wishlist:changed', onWishlistChanged as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener('wishlist:changed', onWishlistChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    function readCartCount() {
      try {
        const raw = window.localStorage.getItem('gyg_cart_v1');
        if (!raw) return 0;
        const items = JSON.parse(raw) as Array<{ quantity?: number }>;
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
      } catch {
        return 0;
      }
    }

    setCartCount(readCartCount());

    function onCartChanged(event: Event) {
      const custom = event as CustomEvent<{ itemCount?: number }>;
      setCartCount(custom.detail?.itemCount ?? readCartCount());
    }

    window.addEventListener('cart:changed', onCartChanged as EventListener);
    return () => window.removeEventListener('cart:changed', onCartChanged as EventListener);
  }, []);

  async function handleLogout() {
    await signOut({ callbackUrl: '/auth/signin' });
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-[1320px] mx-auto px-3 sm:px-4 md:px-6 h-[72px] md:h-[80px] flex items-center justify-between gap-2 md:gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-1" aria-label="GetYourGuide Home">
          <Image
            src={GETYOURGUIDE_LOGO_DATA_URI}
            alt="GetYourGuide - Travel experiences and tours"
            width={56}
            height={64}
            className="h-10 md:h-12 w-auto"
            unoptimized
          />
        </Link>

        {/* Search Bar - conditionally visible */}
        <div className={`hidden md:block flex-1 max-w-[640px] transition-opacity duration-300 ${showSearch ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          <form
            ref={searchRef}
            action="/search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
            className="relative flex items-center w-full h-11 rounded-full border border-gray-300 shadow-sm hover:shadow-md transition-shadow bg-white overflow-visible pl-5 pr-1 py-1 group focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500"
          >
            {/* Find places text usually goes here but screenshot shows just placeholder */}
            <input
              type="search"
              name="q"
              id="header-search-destination"
              placeholder="Find places and things to do"
              value={searchInput}
              onFocus={() => setSearchFocused(true)}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Search destination"
              className="flex-1 h-full outline-none text-gray-700 placeholder-gray-500 font-medium text-[15px]"
            />
            <button type="submit" aria-label="Plan trip" className="h-9 px-6 bg-brand hover:bg-brand-hover text-white font-bold rounded-full transition-colors text-[14px] flex items-center gap-2">
              Search
            </button>

            {searchFocused && headerSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <ul className="max-h-80 overflow-y-auto py-2">
                  {headerSuggestions.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => submitSearch(product.title)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50"
                      >
                        <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                        <p className="text-xs text-gray-500">{product.location} | {product.category}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </form>
        </div>


        {/* Navigation Actions */}
        <nav className="flex items-center gap-2 sm:gap-2 md:gap-6" aria-label="Main navigation">
          <Link href="/wishlist" className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group" aria-label="View wishlist">
            <div className="relative">
              <Heart
                className={`w-5 h-5 md:w-6 md:h-6 stroke-[1.6] ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : ''
                  }`}
                aria-hidden="true"
              />
              {wishlistCount > 0 ? (
                <span className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              ) : null}
            </div>
            <span className="text-[11px] font-medium hidden md:block">Wishlist</span>
          </Link>
          <Link href="/cart" className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group" aria-label="View cart">
            <div className="relative">
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" aria-hidden="true" />
              {cartCount > 0 ? (
                <span className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              ) : null}
            </div>
            <span className="text-[11px] font-medium hidden md:block">Cart</span>
          </Link>
          <button
            onClick={() => setPreferencesOpen(true)}
            className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group"
            aria-label="Change language and currency"
          >
            <Globe className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" aria-hidden="true" />
            <span className="text-[11px] font-medium hidden md:block">
              {preferences.language.toUpperCase()}/{preferences.currency}
            </span>
          </button>
          <div ref={accountRef} className="relative">
            <button
              onClick={() => setAccountOpen((prev) => !prev)}
              className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group"
              aria-label="Open account menu"
            >
              <div className="flex items-center gap-1">
                <User className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" aria-hidden="true" />
                <ChevronDown className="h-3.5 w-3.5 hidden md:block" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-medium hidden md:block">Dashboard</span>
            </button>

            {accountOpen ? (
              <div className="absolute right-0 top-[50px] md:top-[58px] w-56 sm:w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
                {accountLoading ? (
                  <p className="px-3 py-2 text-sm text-gray-500">Loading...</p>
                ) : isAuthenticated ? (
                  <>
                    <div className="mb-1 rounded-xl bg-gray-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Signed in</p>
                      <p className="text-sm font-semibold text-gray-900">{userName ?? 'Traveler'}</p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/user"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4" />
                      User Panel
                    </Link>
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    ) : null}
                    <button
                      onClick={() => void handleLogout()}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4" />
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      {/* Sub-navigation */}
      <div className="max-w-[1320px] mx-auto px-3 sm:px-4 md:px-6">
        <nav className="flex items-center gap-5 md:gap-8 py-3 text-[13px] md:text-[14px] text-gray-500 font-medium border-t border-gray-100/50 overflow-x-auto no-scrollbar whitespace-nowrap" aria-label="Secondary navigation">
          <Link href="/attractions" className="hover:text-gray-900 flex items-center gap-1 group">
            Places to see
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:text-blue-600 transition-colors" aria-hidden="true">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/planner" className="hover:text-gray-900 flex items-center gap-1 group">
            Things to do
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:text-blue-600 transition-colors" aria-hidden="true">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/assistant" className="hover:text-gray-900 flex items-center gap-1 group">
            Trip inspiration
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:text-blue-600 transition-colors" aria-hidden="true">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </nav>
      </div>

      <LanguageCurrencyDialog
        open={preferencesOpen}
        preferences={preferences}
        onClose={() => setPreferencesOpen(false)}
        onChange={setPreferences}
      />
    </header>
  );
}
