'use client';

import dynamic from 'next/dynamic';
import { Map, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ProductList from '@/components/ProductList';

const ItineraryGenerator = dynamic(() => import('@/components/ItineraryGenerator'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-surface-subtle p-6 md:p-8 rounded-2xl border border-border-soft shadow-lg mb-8">
      <div className="h-6 w-56 rounded bg-surface-count-chip animate-pulse mb-4" />
      <div className="h-12 rounded bg-surface-base animate-pulse" />
    </div>
  ),
});

const TurkeyMap = dynamic(() => import('@/components/TurkeyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm text-text-muted">
      Loading map...
    </div>
  ),
});

export default function LandingInteractiveSection({ searchQuery }: { searchQuery?: string }) {
  const [showMap, setShowMap] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const normalizedQuery = (searchQuery ?? '').trim();

  return (
    <>
      <ItineraryGenerator />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-7">
        <div>
          <h2 className="text-text-heading font-bold text-xl md:text-2xl leading-tight">
            {normalizedQuery ? `Results for "${normalizedQuery}"` : 'Top Experiences in Turkey'}
          </h2>
          <p className="text-text-muted text-sm mt-1">
            {normalizedQuery
              ? `${resultCount} experience${resultCount !== 1 ? 's' : ''} found`
              : 'Handpicked tours, activities & day trips'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
        
        </div>
      </div>

      <div className="flex gap-6 relative">
        <div className={`flex-1 transition-all duration-300 ${showMap ? 'w-full md:w-1/2 lg:w-3/5' : 'w-full'}`}>
          <ProductList searchQuery={normalizedQuery} onCountChange={setResultCount} />
        </div>

        {showMap && (
          <div className="hidden md:block w-1/2 lg:w-2/5 sticky top-50 h-[calc(100vh-220px)] rounded-xl overflow-hidden shadow-lg border border-border-default bg-surface-subtle animate-in fade-in slide-in-from-right-10 duration-300">
            <TurkeyMap />
          </div>
        )}
      </div>

      {showMap ? (
        <div className="mt-5 h-90 rounded-xl overflow-hidden shadow-lg border border-border-default bg-surface-subtle md:hidden">
          <TurkeyMap />
        </div>
      ) : null}
    </>
  );
}

