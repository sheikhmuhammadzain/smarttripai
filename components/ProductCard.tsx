
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { Product } from '@/lib/data';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer">
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges */}
        {product.badge && (
           <div className="absolute top-3 left-3 bg-[#1952a1] text-white text-xs font-bold px-2 py-1 rounded-sm shadow-sm uppercase tracking-wide">
             {product.badge}
           </div>
        )}

        {/* Wishlist Button */}
        <button className="absolute top-3 right-3 p-2 bg-white rounded-full hover:bg-gray-50 transition-colors shadow-sm z-10">
          <Heart className="w-5 h-5 text-gray-700 stroke-[1.5]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-bold text-[#1a1b1d] text-[16px] leading-[1.4] line-clamp-3 group-hover:text-[#0071eb] transition-colors">
          {product.title}
        </h3>

        <div className="text-sm text-gray-500 font-normal">
          {product.duration}
          {product.features && product.features.length > 0 && (
            <>
              <span className="mx-1">•</span>
              {product.features.join(' • ')}
            </>
          )}
        </div>

        {/* Rating Section - Assuming standard GYG stars if not explicitly hidden, but trying to match screenshot which doesn't show them clearly for all, but typical for GYG */}
        {product.rating && (
           <div className="mt-auto pt-2 flex items-center gap-1">
             <div className="flex text-[#FFC800]">
               {[...Array(5)].map((_, i) => (
                 <svg key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating!) ? 'fill-current' : 'text-gray-300 fill-current'}`} viewBox="0 0 20 20">
                   <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                 </svg>
               ))}
             </div>
             <span className="text-xs text-gray-500 font-medium">{product.rating} ({product.reviews})</span>
           </div>
        )}

        {/* Price Section */}
        <div className="mt-1">
           <span className="text-xs text-gray-500">From </span>
           <span className="font-bold text-[#1a1b1d]">{product.currency}{product.price}</span>
           <span className="text-xs text-gray-500"> per person</span>
        </div>

        {/* "Booked x times" Badge */}
        {product.bookedText && (
          <div className="mt-3 bg-[#f0f6ff] text-[#0071eb] text-xs font-medium px-2 py-1.5 rounded w-fit">
            {product.bookedText}
          </div>
        )}
      </div>
    </div>
  );
}
