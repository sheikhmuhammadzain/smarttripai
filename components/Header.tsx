
import { Search, Heart, ShoppingCart, Globe, User } from 'lucide-react';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-[1320px] mx-auto px-4 md:px-6 h-[80px] flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="shrink-0 flex items-center gap-1 cursor-pointer">
           {/* Recreating the text logo roughly as I don't have the SVG asset. */}
           <div className="flex flex-col leading-none font-bold text-[#FF5533]">
              <span className="text-xl tracking-tighter">GET</span>
              <span className="text-xl tracking-tighter">YOUR</span>
              <span className="text-xl tracking-tighter">GUIDE</span>
           </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-[640px]">
          <div className="relative flex items-center w-full h-12 rounded-full border border-gray-300 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden pl-5 pr-1 py-1 group focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input 
              type="text" 
              placeholder="Appian Way" 
              defaultValue="Appian Way"
              className="flex-1 h-full outline-none text-gray-700 placeholder-gray-400 font-medium text-[15px]"
            />
            <button className="h-10 px-6 bg-[#0071eb] hover:bg-[#005fb8] text-white font-bold rounded-full transition-colors text-[15px]">
              Search
            </button>
          </div>
        </div>

        {/* Navigation Actions */}
        <nav className="flex items-center gap-1 md:gap-6">
          <a href="#" className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group">
            <Heart className="w-6 h-6 stroke-[1.5]" />
            <span className="text-[11px] font-medium hidden md:block">Wishlist</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group">
            <ShoppingCart className="w-6 h-6 stroke-[1.5]" />
            <span className="text-[11px] font-medium hidden md:block">Cart</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group">
            <Globe className="w-6 h-6 stroke-[1.5]" />
            <span className="text-[11px] font-medium hidden md:block">EN/USD $</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group">
            <User className="w-6 h-6 stroke-[1.5]" />
            <span className="text-[11px] font-medium hidden md:block">Profile</span>
          </a>
        </nav>
      </div>
      
      {/* Sub-navigation */}
      <div className="max-w-[1320px] mx-auto px-4 md:px-6">
        <div className="flex items-center gap-8 py-3 text-[14px] text-gray-500 font-medium border-t border-gray-100/50">
             <a href="#" className="hover:text-gray-900">Explore Rome</a>
             <span className="text-gray-300 text-[10px]">•</span>
             <a href="#" className="hover:text-gray-900 flex items-center gap-1 group">
                Places to see
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:text-blue-600 transition-colors">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </a>
             <a href="#" className="text-gray-900 font-bold border-b-2 border-[#FF5533] pb-3 -mb-3 flex items-center gap-1">
                Things to do
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </a>
             <a href="#" className="hover:text-gray-900 flex items-center gap-1 group">
                Trip inspiration
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:text-blue-600 transition-colors">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </a>
        </div>
      </div>
    </header>
  );
}
