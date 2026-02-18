'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { products } from '@/lib/data';

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
    <div className="relative">
      <div className="relative w-full min-h-[640px] md:h-[580px]">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://picsum.photos/1920/800"
            alt="Turkey travel inspiration"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative z-10 max-w-[1320px] mx-auto px-4 md:px-6 h-full flex flex-col justify-center pb-8 md:pb-20 pt-12 md:pt-0">
          <h1 className="text-white text-4xl sm:text-5xl md:text-[56px] font-bold mb-6 md:mb-8 drop-shadow-md leading-tight">
            Discover and plan unforgettable Turkey experiences
          </h1>

          <div className="max-w-[640px] w-full mb-6 md:mb-12">
            <form
              ref={formRef}
              action="/search"
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
              className="relative flex items-center w-full h-14 md:h-16 rounded-full bg-white shadow-lg overflow-visible pl-4 md:pl-6 pr-2"
            >
              <div className="flex-1 flex items-center h-full">
                <input
                  name="q"
                  type="text"
                  value={input}
                  onFocus={() => setFocused(true)}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Find places and things to do in Turkey"
                  className="w-full h-full outline-none text-gray-700 placeholder-gray-500 font-medium text-base md:text-lg bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="h-10 md:h-12 px-5 md:px-8 bg-brand hover:bg-brand-hover text-white font-bold rounded-full transition-colors text-sm md:text-base"
              >
                Search
              </button>

              {focused && suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 rounded-2xl border border-gray-200 bg-white shadow-2xl">
                  <ul className="max-h-80 overflow-y-auto py-2">
                    {suggestions.map((product) => (
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

          <div className="relative w-full max-w-sm pt-2 md:pt-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl max-w-[400px]">
              <div className="mb-3">
                <h3 className="text-text-heading font-bold text-xl sm:text-2xl mb-2">Continue planning your trip</h3>
              </div>
              <Link href="/products/2" className="flex gap-3 md:gap-4 bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src="https://picsum.photos/seed/istanbul-planning/200/200"
                    alt="Istanbul tour"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-between py-1 min-w-0">
                  <div>
                    <h4 className="font-bold text-sm leading-tight text-gray-900 mb-1 line-clamp-2">
                      Istanbul: Skip-the-line Hagia Sophia and Basilica Cistern Tour
                    </h4>
                    <p className="text-xs text-gray-600 mb-1">2 hours | Skip the line</p>
                    <div className="flex items-center gap-1">
                      <div className="flex text-yellow-400">
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                      <span className="text-xs text-gray-600">4.8</span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    From <span className="font-bold text-lg text-text-heading">$42</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
