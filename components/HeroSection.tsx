import { Search, MapPin, Star, Heart } from 'lucide-react';
import Image from 'next/image';
import ProductCard from './ProductCard';

export default function HeroSection() {
    const recommendedTours = [
        {
            start_index: 101,
            title: "Colosseum, Roman Forum & Palatine Hill Guided Tour",
            image: "https://picsum.photos/400/300?random=101",
            rating: 4.8,
            duration: "2.5 hours",
            features: ["Skip the line", "Small group"],
            from_price: 58,
            original_price: 72,
            badge: "Likely to sell out"
        },
        {
            start_index: 102,
            title: "Rome: Colosseum & Forum with Audio Guide App -Optional Arena",
            image: "https://picsum.photos/400/300?random=102",
            rating: 4.2,
            duration: "1 - 3 hours",
            features: ["Skip the line", "Optional audio guide"],
            from_price: 43,
            original_price: 54,
            badge: "Likely to sell out"
        },
        {
            start_index: 103,
            title: "Vatican Museums, Sistine Chapel & St. Peter's Basilica Tour",
            image: "https://picsum.photos/400/300?random=103",
            rating: 4.3,
            duration: "2 - 3 hours",
            features: ["Skip the line", "Private option available"],
            from_price: 72,
            original_price: 144
        },
        {
            start_index: 104,
            title: "Rome: Pantheon Fast-Track Ticket and Official Audioguide",
            image: "https://picsum.photos/400/300?random=104",
            rating: 4.5,
            duration: "1 hour",
            features: ["Skip the line", "Optional audio guide"],
            from_price: 5,
            badge: "Likely to sell out"
        }
    ];

    return (
        <div className="relative">
            {/* Search Overlay Container */}
            <div className="relative w-full min-h-[640px] md:h-[580px]">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://picsum.photos/1920/800"
                        alt="Winter activities"
                        fill
                        className="object-cover"
                        priority
                    />
                    {/* Gradient overlay for better text readability */}
                    <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 max-w-[1320px] mx-auto px-4 md:px-6 h-full flex flex-col justify-center pb-8 md:pb-20 pt-12 md:pt-0">
                    <h1 className="text-white text-4xl sm:text-5xl md:text-[56px] font-bold mb-6 md:mb-8 drop-shadow-md leading-tight">
                        Discover & book things to do
                    </h1>

                    {/* Search Bar */}
                    <div className="max-w-[640px] w-full mb-6 md:mb-12">
                        <div className="relative flex items-center w-full h-14 md:h-16 rounded-full bg-white shadow-lg overflow-hidden pl-4 md:pl-6 pr-2">
                            <div className="flex-1 flex items-center h-full">
                                <input
                                    type="text"
                                    placeholder="Find places and things to do"
                                    className="w-full h-full outline-none text-gray-700 placeholder-gray-500 font-medium text-base md:text-lg bg-transparent"
                                />
                            </div>
                            <button className="h-10 md:h-12 px-5 md:px-8 bg-[#0071eb] hover:bg-[#005fb8] text-white font-bold rounded-full transition-colors text-sm md:text-base">
                                Search
                            </button>
                        </div>
                    </div>

                    {/* Continue Planning Card */}
                    <div className="relative md:absolute md:top-[60%] left-0 md:left-6 w-full max-w-sm pt-2 md:pt-[10%]">
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl max-w-[400px]">
                            <div className="mb-3">
                                <h3 className="text-white font-bold text-lg drop-shadow-md mb-2">Continue planning your trip</h3>
                            </div>
                            <div className="flex gap-3 md:gap-4 bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
                                <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden">
                                    <Image
                                        src="https://picsum.photos/200/200"
                                        alt="Rome tour"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex flex-col justify-between py-1 min-w-0">
                                    <div>
                                        <h4 className="font-bold text-sm leading-tight text-gray-900 mb-1 line-clamp-2">Rome: Skip the line Catacombs Underground Group Tour</h4>
                                        <p className="text-xs text-gray-500 mb-1">1 hour • Skip the line</p>
                                        <div className="flex items-center gap-1">
                                            <div className="flex text-[#FFC800]">
                                                <Star className="w-3 h-3 fill-current" />
                                                <Star className="w-3 h-3 fill-current" />
                                                <Star className="w-3 h-3 fill-current" />
                                                <Star className="w-3 h-3 fill-current" />
                                                <Star className="w-3 h-3 fill-current" />
                                            </div>
                                            <span className="text-xs text-gray-400">5</span>
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

            {/* Based on your search section - connecting to the grid below */}
            <div className="max-w-[1320px] mx-auto px-4 md:px-6 pt-12">
                <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-2xl font-bold text-[#1a1b1d]">Based on your search in Rome</h2>
                </div>

                {/* Recommended Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    {recommendedTours.map((item) => (
                        <div key={item.start_index} className="h-full">
                            {/* Using ProductCard but assuming custom data structure compatibility or inline layout matching screenshot */}
                            <div className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer relative">
                                {/* Image */}
                                <div className="relative aspect-[4/3] w-full overflow-hidden">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />

                                    {/* Heart */}
                                    <button className="absolute top-3 right-3 p-2 bg-white rounded-full hover:bg-gray-50 transition-colors shadow-sm z-10">
                                        <Heart className="w-5 h-5 text-gray-700 stroke-[1.5]" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex flex-col flex-1 p-4">
                                    <div className="text-xs text-gray-500 mb-1">Guided tour</div>
                                    <h3 className="font-bold text-[#1a1b1d] text-[16px] leading-[1.4] mb-2 group-hover:text-[#0071eb] transition-colors line-clamp-3">
                                        {item.title}
                                    </h3>

                                    <div className="text-xs text-gray-500 mb-2">
                                        {item.duration} • {item.features.join(' • ')}
                                    </div>

                                    {/* Certified Badge Placeholder (Simulated) */}
                                    <div className="flex items-center gap-1 mb-3">
                                        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                            <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span className="text-xs text-gray-500">Certified by GetYourGuide</span>
                                    </div>

                                    {item.badge && (
                                        <div className="mb-auto">
                                            <span className="inline-block bg-[#D93025] text-white text-[11px] font-bold px-2 py-1 rounded-sm uppercase">Likely to sell out</span>
                                        </div>
                                    )}

                                    <div className="mt-4 flex items-end justify-between">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-[#FFC800] text-[#FFC800]" />
                                                <span className="text-sm font-bold text-[#1a1b1d]">{item.rating}</span>
                                                <span className="text-xs text-gray-400">({Math.floor(Math.random() * 5000)})</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">From</div>
                                            <div className="flex items-center gap-1 justify-end">
                                                {item.original_price && <span className="text-xs text-gray-400 line-through">${item.original_price}</span>}
                                                <span className="text-lg font-bold text-[#D93025]">${item.from_price}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-2xl font-bold text-[#1a1b1d]">Things to do wherever you're going</h2>
                </div>

                {/* Bottom Destination Grid Placeholder - Just to match the screenshot bottom part */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-20">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden relative cursor-pointer group">
                            <Image
                                src={`https://picsum.photos/300/400?random=${i + 200}`}
                                alt="Destination"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                                <span className="text-white font-bold drop-shadow-md">Destination {i}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
