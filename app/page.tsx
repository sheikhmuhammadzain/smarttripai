
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import ProductList from '@/components/ProductList';
import { ArrowUpDown, Info } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)] text-[#1a1b1d]">
      <Header />
      
      <main className="relative">
        <FilterBar />

        <div className="max-w-[1320px] mx-auto px-4 md:px-6 pt-6 pb-20">
          
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <h1 className="text-[#1a1b1d] font-bold text-xl md:text-2xl flex items-baseline gap-2">
              <span className="text-gray-500 font-normal">109 results:</span>
              <span>Appian Way</span>
            </h1>
            
            <div className="flex items-center gap-6">
                 <div className="flex items-center gap-1 text-sm text-[#1a1b1d]">
                    <Info className="w-4 h-4" />
                    <span className="mr-1">Sort by:</span>
                    <span className="font-bold border-b border-dotted border-black cursor-pointer">Recommended</span>
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                 </div>
            </div>
          </div>

          {/* Product Grid */}
          <ProductList />

        </div>
      </main>
    </div>
  );
}
