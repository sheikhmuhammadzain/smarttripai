'use client';

import dynamic from 'next/dynamic';
import { ArrowUpDown, Info, Map, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ProductList from '@/components/ProductList';

const ItineraryGenerator = dynamic(() => import('@/components/ItineraryGenerator'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-blue-50/50 p-6 md:p-8 rounded-2xl border border-blue-100 shadow-lg mb-8">
      <div className="h-6 w-56 rounded bg-blue-100 animate-pulse mb-4" />
      <div className="h-12 rounded bg-white/80 animate-pulse" />
    </div>
  ),
});

const TurkeyMap = dynamic(() => import('@/components/TurkeyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
      Loading map...
    </div>
  ),
});

export default function LandingInteractiveSection() {
  const [showMap, setShowMap] = useState(false);

  return (
    <>
      <ItineraryGenerator />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <h1 className="text-[#1a1b1d] font-bold text-xl md:text-2xl flex items-baseline gap-2">
          <span className="text-gray-500 font-normal">Showing results for:</span>
          <span>Turkey AI Itinerary</span>
        </h1>

        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={() => setShowMap((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Map className="w-4 h-4" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>

          <div className="flex items-center gap-1 text-sm text-[#1a1b1d]">
            <Info className="w-4 h-4" />
            <span className="mr-1">Sort by:</span>
            <span className="font-bold border-b border-dotted border-black cursor-pointer flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              AI Recommended
            </span>
            <ArrowUpDown className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>

      <div className="flex gap-6 relative">
        <div className={`flex-1 transition-all duration-300 ${showMap ? 'w-full md:w-1/2 lg:w-3/5' : 'w-full'}`}>
          <ProductList />
        </div>

        {showMap && (
          <div className="hidden md:block w-1/2 lg:w-2/5 sticky top-[200px] h-[calc(100vh-220px)] rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-100 animate-in fade-in slide-in-from-right-10 duration-300">
            <TurkeyMap />
          </div>
        )}
      </div>
    </>
  );
}
