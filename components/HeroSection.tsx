import { Star } from 'lucide-react';
import Image from 'next/image';

export default function HeroSection() {
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
              action="/planner"
              className="relative flex items-center w-full h-14 md:h-16 rounded-full bg-white shadow-lg overflow-hidden pl-4 md:pl-6 pr-2"
            >
              <div className="flex-1 flex items-center h-full">
                <input
                  name="destination"
                  type="text"
                  placeholder="Find places and things to do in Turkey"
                  className="w-full h-full outline-none text-gray-700 placeholder-gray-500 font-medium text-base md:text-lg bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="h-10 md:h-12 px-5 md:px-8 bg-[#0071eb] hover:bg-[#005fb8] text-white font-bold rounded-full transition-colors text-sm md:text-base"
              >
                Search
              </button>
            </form>
          </div>

          <div className="relative w-full max-w-sm pt-2 md:pt-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl max-w-[400px]">
              <div className="mb-3">
                <h3 className="text-[#1a1b1d] font-bold text-[30px] mb-2">Continue planning your trip</h3>
              </div>
              <div className="flex gap-3 md:gap-4 bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
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
                    <p className="text-xs text-gray-600 mb-1">2 hours • Skip the line</p>
                    <div className="flex items-center gap-1">
                      <div className="flex text-[#FFC800]">
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
                    From <span className="font-bold text-lg text-[#1a1b1d]">$42</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
