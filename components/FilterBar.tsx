
import { SlidersHorizontal, Calendar, ChevronRight } from 'lucide-react';
import { filters } from '@/lib/data';

export default function FilterBar() {
  return (
    <div className="border-b border-gray-200 bg-white sticky top-[124px] z-40">
      <div className="max-w-[1320px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar mask-gradient-right">
        
        {/* Main Filters */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 hover:border-gray-800 transition-colors font-medium text-sm whitespace-nowrap bg-white text-gray-700">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
        </button>

        <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 hover:border-gray-800 transition-colors font-medium text-sm whitespace-nowrap bg-white text-gray-700">
          <Calendar className="w-4 h-4" />
          <span>Dates</span>
        </button>

        <div className="h-6 w-[1px] bg-gray-300 mx-1 shrink-0" />

        {/* Category Pills */}
        {filters.map((filter) => (
          <button 
            key={filter}
            className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors font-medium text-sm text-gray-700 whitespace-nowrap"
          >
            {filter}
          </button>
        ))}
        
        {/* Scroll hint/arrow if needed, visually just a fade usually */}
        <div className="flex-1"></div>
         <button className="p-2 rounded-full hover:bg-gray-100 hidden md:block">
            <ChevronRight className="w-5 h-5 text-gray-500" />
         </button>
      </div>
    </div>
  );
}
