
'use client';

import { Search, Heart, ShoppingCart, Globe, User, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show search bar after scrolling 400px (past hero area approx)
      setShowSearch(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-[1320px] mx-auto px-3 sm:px-4 md:px-6 h-[80px] flex items-center justify-between gap-2 md:gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-1" aria-label="GetYourGuide Home">
          <img
            src="data:image/svg+xml,%3Csvg fill='none' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 382 302' width='56' height='64'%3E%3Cpath d='M98.273 125.538c-5.904 0-10.574 4.553-10.574 10.574s4.67 10.574 10.574 10.574 10.574-4.553 10.574-10.574-4.67-10.574-10.574-10.574zm60.37-51.987h-37.392V55.594h33.329V37.637h-33.329V19.925h36.775V1.84h-56.944v89.795h57.561V73.551zm-41.668 54.2c5.904 0 10.574-4.553 10.574-10.574s-4.67-10.574-10.574-10.574-10.575 4.553-10.575 10.574 4.671 10.574 10.575 10.574zM38.498 93.475c13.042 0 24.478-6.638 31.243-16.85v15.01h17.713V41.701H39.977v17.222h19.925c-1.84 9.223-9.968 16.362-19.808 16.362-10.947 0-19.808-8.862-19.808-21.776V40.222c0-12.67 9.468-22.02 22.754-22.02 10.33 0 19.553 5.659 22.627 13.903l18.702-6.52C79.199 9.84 62.476 0 43.168 0 18.818 0 .606 16.361.606 40.222v13.287c.01 22.988 16.978 39.966 37.892 39.966zm172.909-66.401h-19.903v28.69h19.903v-28.69zM235.396 1.84h-68.147v18.085h68.147V1.84zM33.829 195.887h20.17v-34.063l33.817-55.721H65.061l-21.275 36.775-21.032-36.775H0l33.829 55.966v33.818zM211.407 62.923h-19.903v28.68h19.903v-28.68zM364.87 195.887l-24.478-34.318c11.936-3.692 20.297-14.149 20.297-26.935 0-16.234-13.403-28.542-30.382-28.542h-11.808v18.201h11.074c5.904 0 10.457 4.671 10.457 10.819 0 6.149-4.553 10.83-10.457 10.83h-11.074v17.222l21.893 32.723h24.478zm-99.964 14.35h-29.648v89.912h29.648c27.796 0 47.477-19.063 47.477-44.892 0-25.829-19.681-45.02-47.477-45.02zm1.595 71.827h-11.074v-53.753h11.074c15.01 0 25.212 11.563 25.212 26.935 0 15.372-10.202 26.818-25.212 26.818zm78.104-17.956h33.328v-17.957h-33.328v-17.712h36.775v-18.074h-56.945v89.784h57.562v-18.085h-37.392v-17.956zm-32.137-98.582-10.426-14.776 10.287-14.946-10.425-14.766 10.298-14.935-20.797.01-10.298 15.095 10.436 14.777-10.298 14.946 10.436 14.765-10.297 14.957 11.074 15.372h21.02l-11.308-15.542 10.298-14.957zm-45.924-4.564v-54.859h-20.053v55.232c0 10.329-7.383 17.957-17.467 17.957-10.085 0-17.468-7.628-17.468-17.957v-55.232h-20.052v54.859c0 21.159 15.872 36.776 37.52 36.776 21.648 0 37.52-15.627 37.52-36.776zM156.452 265.586c0 10.33-7.383 17.957-17.468 17.957-10.084 0-17.467-7.627-17.467-17.957v-55.232h-20.053v54.86c0 21.159 15.872 36.775 37.52 36.775 21.649 0 37.52-15.616 37.52-36.775v-54.86h-20.052v55.232zm-116.475 1.851h19.925c-1.84 9.223-9.968 16.361-19.808 16.361-10.946 0-19.807-8.861-19.807-21.775v-13.287c0-12.67 9.467-22.021 22.754-22.021 10.33 0 19.553 5.66 22.627 13.904l18.701-6.521c-5.17-15.744-21.892-25.584-41.2-25.584-24.35 0-42.563 16.361-42.563 40.222v13.287C.606 285.022 17.584 302 38.488 302c13.042 0 24.478-6.638 31.244-16.85v15.01h17.712v-49.935H39.977v17.212z' fill='%23F53'/%3E%3Cpath d='M132.102 104.252v18.946c14.765 0 26.446 12.053 26.446 27.797s-11.681 27.797-26.446 27.797c-14.755 0-26.446-12.053-26.446-27.797h-20.67c0 26.201 20.915 46.743 47.105 46.743 26.201 0 47.105-20.542 47.105-46.743 0-26.202-20.893-46.743-47.094-46.743zm82.497 148.377c2.978-2.691 7.968-7.191 7.968-15.435 0-8.245-4.99-12.744-7.968-15.436a9.787 9.787 0 0 0-.373-.33c-1.489-1.563-1.744-3.808-1.776-4.872v-6.319h-20.201v8.404h.01c0 .107-.01.202-.01.309 0 8.244 4.989 12.744 7.967 15.435 2.139 1.936 2.139 2.032 2.139 2.809 0 .776 0 .872-2.139 2.808-2.861 2.585-7.574 6.862-7.925 14.532h-.021c0 .148-.021.287-.021.425 0 .085.01.16.01.234 0 .085-.01.16-.01.234 0 .149.01.287.021.426h.021c.351 7.67 5.064 11.946 7.925 14.531 2.139 1.936 2.139 2.032 2.139 2.808 0 .777 0 .873-2.139 2.809-2.978 2.691-7.967 7.191-7.967 15.435 0 .107 0 .213.01.309h-.01v8.404h20.201v-6.319c.032-1.053.287-3.308 1.776-4.872.117-.107.234-.213.373-.33 2.978-2.691 7.968-7.191 7.968-15.436 0-8.244-4.99-12.744-7.968-15.435-1.904-1.713-2.117-1.989-2.138-2.564.021-.574.234-.851 2.138-2.564z' fill='%23F53'/%3E%3C/svg%3E"
            alt="GetYourGuide - Travel experiences and tours"
            width={56}
            height={64}
            className="h-12 w-auto"
          />
        </Link>

        {/* Search Bar - conditionally visible */}
        <div className={`hidden md:block flex-1 max-w-[640px] transition-opacity duration-300 ${showSearch ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          <form role="search" className="relative flex items-center w-full h-11 rounded-full border border-gray-300 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden pl-5 pr-1 py-1 group focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
            {/* Find places text usually goes here but screenshot shows just placeholder */}
            <input
              type="search"
              name="destination"
              id="header-search-destination"
              placeholder="Find places and things to do"
              aria-label="Search destination"
              className="flex-1 h-full outline-none text-gray-700 placeholder-gray-500 font-medium text-[15px]"
            />
            <button type="submit" aria-label="Plan trip" className="h-9 px-6 bg-[#0071eb] hover:bg-[#005fb8] text-white font-bold rounded-full transition-colors text-[14px] flex items-center gap-2">
              Search
            </button>
          </form>
        </div>


        {/* Navigation Actions */}
        <nav className="flex items-center gap-1 sm:gap-2 md:gap-6" aria-label="Main navigation">
          <Link href="/wishlist" className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group" aria-label="View wishlist">
            <Heart className="w-6 h-6 stroke-[1.5]" aria-hidden="true" />
            <span className="text-[11px] font-medium hidden md:block">Wishlist</span>
          </Link>
          <Link href="/cart" className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group" aria-label="View cart">
            <ShoppingCart className="w-6 h-6 stroke-[1.5]" aria-hidden="true" />
            <span className="text-[11px] font-medium hidden md:block">Cart</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group" aria-label="Change language and currency">
            <Globe className="w-6 h-6 stroke-[1.5]" aria-hidden="true" />
            <span className="text-[11px] font-medium hidden md:block">EN/USD $</span>
          </button>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 group" aria-label="View profile">
            <User className="w-6 h-6 stroke-[1.5]" aria-hidden="true" />
            <span className="text-[11px] font-medium hidden md:block">Profile</span>
          </Link>
        </nav>
      </div>

      {/* Sub-navigation */}
      <div className="max-w-[1320px] mx-auto px-3 sm:px-4 md:px-6">
        <nav className="flex items-center gap-6 md:gap-8 py-3 text-[14px] text-gray-500 font-medium border-t border-gray-100/50 overflow-x-auto no-scrollbar whitespace-nowrap" aria-label="Secondary navigation">
          <button className="hover:text-gray-900 flex items-center gap-1 group">
            Places to see
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:text-blue-600 transition-colors" aria-hidden="true">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="hover:text-gray-900 flex items-center gap-1 group">
            Things to do
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:text-blue-600 transition-colors" aria-hidden="true">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="hover:text-gray-900 flex items-center gap-1 group">
            Trip inspiration
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:text-blue-600 transition-colors" aria-hidden="true">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
