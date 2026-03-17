'use client';

import { Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { products } from '@/lib/data';

const DESTINATIONS = [
  { label: 'Istanbul', q: 'istanbul' },
  { label: 'Cappadocia', q: 'cappadocia' },
  { label: 'Ephesus', q: 'ephesus' },
  { label: 'Pamukkale', q: 'pamukkale' },
  { label: 'Antalya', q: 'antalya' },
  { label: 'Bodrum', q: 'bodrum' },
];

export default function HeroSection() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(input.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!formRef.current) return;
      if (!formRef.current.contains(event.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const suggestions = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    return products
      .filter((product) => {
        const haystack = `${product.title} ${product.location} ${product.category} ${product.summary}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [debouncedQuery]);

  function submitSearch(value?: string) {
    const q = (value ?? input).trim();
    if (!q) return;
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: '540px' }}>
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1920&q=85"
          alt="Istanbul skyline"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={85}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.62) 100%)' }} />
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-20 md:py-28" style={{ minHeight: '540px' }}>
        {/* Eyebrow */}
        <p className="text-white/70 text-xs font-semibold tracking-[0.18em] uppercase mb-4 select-none">
          Turkey Travel Experiences
        </p>

        {/* Headline */}
        <h1 className="text-white font-bold leading-tight mb-4 max-w-2xl"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', letterSpacing: '-0.02em', textShadow: '0 2px 16px rgba(0,0,0,0.25)' }}>
          Find your next<br />unforgettable experience
        </h1>

        {/* Subtext */}
        <p className="text-white/75 text-base md:text-lg mb-8 max-w-md font-normal" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
          Tours, activities & day trips across Turkey — curated by locals.
        </p>

        {/* Search bar */}
        <div className="w-full max-w-2xl mb-6">
          <form
            ref={formRef}
            action="/search"
            onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
            className="relative w-full"
          >
            <div className="flex items-center w-full h-14 rounded-xl bg-white shadow-2xl overflow-visible"
              style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}>
              <Search className="w-5 h-5 text-text-subtle ml-4 md:ml-5 shrink-0" />
              <input
                name="q"
                type="text"
                value={input}
                onFocus={() => setFocused(true)}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search destinations, tours, activities..."
                className="flex-1 h-full outline-none text-text-body placeholder-text-subtle font-medium text-sm md:text-base bg-transparent px-3"
              />
              <button
                type="submit"
                className="h-full px-6 md:px-8 bg-brand hover:bg-brand-hover text-white font-semibold rounded-r-xl transition-colors text-sm md:text-[15px] shrink-0"
              >
                Search
              </button>
            </div>

            {focused && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-border-soft bg-background shadow-2xl overflow-hidden">
                <ul className="max-h-72 overflow-y-auto py-1.5">
                  {suggestions.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => submitSearch(product.title)}
                        className="w-full px-4 py-2.5 text-left hover:bg-surface-subtle flex items-start gap-3"
                      >
                        <Search className="w-4 h-4 text-text-subtle mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{product.title}</p>
                          <p className="text-xs text-text-muted">{product.location} · {product.category}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </div>

        {/* Destination chips */}
        <div className="flex flex-wrap justify-center gap-2">
          <span className="text-white/60 text-xs font-medium self-center mr-1">Popular:</span>
          {DESTINATIONS.map((d) => (
            <Link
              key={d.q}
              href={`/search?q=${d.q}`}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
            >
              {d.label}
            </Link>
          ))}
        </div>

        {/* Trust signal */}
        <p className="mt-8 text-white/45 text-xs tracking-wide">
          500+ curated experiences &nbsp;·&nbsp; Free cancellation on most tours &nbsp;·&nbsp; Instant confirmation
        </p>
      </div>
    </div>
  );
}
