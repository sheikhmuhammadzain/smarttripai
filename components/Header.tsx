
'use client';

import { Heart, ShoppingCart, Settings, User, LogOut, LogIn, Shield, ChevronDown, Sun, Moon, BadgeDollarSign } from 'lucide-react';
import LanguageCurrencyDialog from '@/components/LanguageCurrencyDialog';
import { useAppPreferences, writeAppPreferences, type AppPreferences } from '@/lib/preferences-client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { SMARTTRIPAI_LOGO_DATA_URI as GETYOURGUIDE_LOGO_DATA_URI } from '@/components/branding/logo';
import { products } from '@/lib/data';
import { useTheme } from '@/components/ThemeProvider';
import { useWishlist } from '@/hooks/use-wishlist';

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const { items: wishlistItems } = useWishlist();
  const wishlistCount = wishlistItems.length;
  const [cartCount, setCartCount] = useState(0);
  const [activeQuery, setActiveQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLFormElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { preferences } = useAppPreferences();

  function handlePrefsChange(next: AppPreferences) {
    writeAppPreferences(next);
  }

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

  return (
    <>
    <header className="sticky top-0 z-50 bg-background border-b border-border-soft transition-colors">
      <div className="max-w-330 mx-auto px-3 sm:px-4 md:px-6 h-18 md:h-20 flex items-center justify-between gap-2 md:gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-1" aria-label="Smart Trip AI Home">
          <Image
            src={GETYOURGUIDE_LOGO_DATA_URI}
            alt="Smart Trip AI - Travel experiences and tours"
            width={80}
            height={96}
            className="h-14 md:h-16 w-auto"
            unoptimized
          />
        </Link>

        {/* Search Bar - conditionally visible */}
        <div className={`hidden md:block flex-1 max-w-160 transition-opacity duration-300 ${showSearch ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          <form
            ref={searchRef}
            action="/search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
            className="relative flex items-center w-full h-11 rounded-full border border-border-default transition-shadow bg-background overflow-visible pl-5 pr-1 py-1 group focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand"
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
              className="flex-1 h-full outline-none text-text-body placeholder-text-subtle font-medium text-[15px] bg-transparent"
            />
            <button type="submit" aria-label="Plan trip" className="h-9 px-6 bg-brand hover:bg-brand-hover text-white font-bold rounded-full transition-colors text-[14px] flex items-center gap-2">
              Search
            </button>

            {searchFocused && headerSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-border-soft bg-background shadow-2xl">
                <ul className="max-h-80 overflow-y-auto py-2">
                  {headerSuggestions.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => submitSearch(product.title)}
                        className="w-full px-4 py-2.5 text-left hover:bg-surface-subtle">
                        <p className="text-sm font-semibold text-text-primary">{product.title}</p>
                        <p className="text-xs text-text-muted">{product.location} | {product.category}</p>
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
          <Link href="/wishlist" className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-text-muted hover:text-text-primary group" aria-label="View wishlist">
            <div className="relative">
              <Heart
                className={`w-5 h-5 md:w-6 md:h-6 stroke-[1.6] ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : ''
                  }`}
                aria-hidden="true"
              />
              {wishlistCount > 0 ? (
                <span className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              ) : null}
            </div>
            <span className="text-[11px] font-medium hidden md:block">Wishlist</span>
          </Link>
          <Link href="/cart" className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-text-muted hover:text-text-primary group" aria-label="View cart">
            <div className="relative">
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" aria-hidden="true" />
              {cartCount > 0 ? (
                <span className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              ) : null}
            </div>
            <span className="text-[11px] font-medium hidden md:block">Cart</span>
          </Link>
          {/* Currency / Language */}
          <button
            onClick={() => setPrefsOpen(true)}
            className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-text-muted hover:text-text-primary group"
            aria-label="Change currency or language"
          >
            <BadgeDollarSign className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" />
            <span className="text-[11px] font-medium hidden md:block">
              {preferences.currency}
            </span>
          </button>

          <div ref={accountRef} className="relative">
            <button
              onClick={() => setAccountOpen((prev) => !prev)}
              className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-text-muted hover:text-text-primary group"
              aria-label="Open account menu"
            >
              <div className="flex items-center gap-0.5">
                <User className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" aria-hidden="true" />
                <ChevronDown className="h-3 w-3 hidden md:block" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-medium hidden md:block">
                {isAuthenticated ? (userName ?? 'Account') : 'Account'}
              </span>
            </button>

            {accountOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-56 rounded-2xl border border-border-soft bg-background p-1.5 shadow-xl">
                {accountLoading ? (
                  <p className="px-3 py-2 text-sm text-text-subtle">Loading…</p>
                ) : isAuthenticated ? (
                  <>
                    <div className="mb-1 rounded-xl bg-surface-subtle px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-text-subtle">Signed in as</p>
                      <p className="mt-0.5 text-sm font-semibold text-text-primary truncate">{userName ?? 'Traveler'}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-text-body hover:bg-surface-subtle transition-colors"
                    >
                      <User className="h-4 w-4 text-text-subtle" />
                      Dashboard
                    </Link>
                    <Link
                      href="/user/settings"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-text-body hover:bg-surface-muted transition-colors"
                    >
                      <Settings className="h-4 w-4 text-text-subtle" />
                      Settings
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-text-body hover:bg-surface-muted transition-colors"
                      >
                        <Shield className="h-4 w-4 text-text-subtle" />
                        Admin Panel
                      </Link>
                    )}
                    <div className="my-1 border-t border-border-subtle" />
                    <button
                      onClick={() => void handleLogout()}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-text-danger hover:bg-surface-danger-soft transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-text-body hover:bg-surface-subtle transition-colors"
                    >
                      <LogIn className="h-4 w-4 text-text-subtle" />
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-text-body hover:bg-surface-muted transition-colors"
                    >
                      <User className="h-4 w-4 text-text-subtle" />
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 md:p-0 flex flex-col items-center gap-1 text-text-muted hover:text-text-primary group"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" />
            ) : (
              <Moon className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" />
            )}
            <span className="text-[11px] font-medium hidden md:block">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>
        </nav>
      </div>

      {/* Sub-navigation */}
      <div className="max-w-330 mx-auto px-3 sm:px-4 md:px-6">
        <nav className="flex items-center gap-5 md:gap-8 py-3 text-[13px] md:text-[14px] text-text-muted font-medium border-t border-border-subtle overflow-x-auto no-scrollbar whitespace-nowrap" aria-label="Secondary navigation">
          <Link href="/attractions" className="relative group hover:text-text-primary transition-colors pb-0.75">
            Explore Destinations
            <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-brand rounded-full group-hover:w-full transition-[width] duration-200" />
          </Link>
          <Link href="/planner" className="relative group hover:text-text-primary transition-colors pb-0.75">
            Activities & Experiences
            <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-brand rounded-full group-hover:w-full transition-[width] duration-200" />
          </Link>
          <Link href="/products" className="relative group hover:text-text-primary transition-colors pb-0.75">
            Top Experiences
            <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-brand rounded-full group-hover:w-full transition-[width] duration-200" />
          </Link>
          <Link href="/assistant" className="relative group hover:text-text-primary transition-colors pb-0.75">
            Travel Guides
            <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-brand rounded-full group-hover:w-full transition-[width] duration-200" />
          </Link>
        </nav>
      </div>

    </header>

    <LanguageCurrencyDialog
      open={prefsOpen}
      preferences={preferences}
      onClose={() => setPrefsOpen(false)}
      onChange={handlePrefsChange}
    />
    </>
  );
}
