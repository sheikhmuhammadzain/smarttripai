'use client';

import dynamic from 'next/dynamic';
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

export default function LandingInteractiveSection({ searchQuery }: { searchQuery?: string }) {
  const normalizedQuery = (searchQuery ?? '').trim();

  return (
    <>
      <ItineraryGenerator />

      <div className="mb-8">
        <h2 className="text-text-heading font-extrabold text-3xl md:text-4xl leading-tight tracking-tight">
          {normalizedQuery ? `Results for "${normalizedQuery}"` : 'Top Experiences in Turkey'}
        </h2>
        <p className="text-brand font-semibold text-base mt-1.5">
          {normalizedQuery ? 'Matching experiences' : 'Handpicked tours, activities & day trips'}
        </p>
      </div>

      <ProductList searchQuery={normalizedQuery} />
    </>
  );
}
