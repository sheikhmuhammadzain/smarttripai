"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";

interface WishlistButtonProps {
  productId: string;
  productTitle: string;
}

export default function WishlistButton({ productId, productTitle }: WishlistButtonProps) {
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(productId);

  return (
    <button
      type="button"
      onClick={() => void toggle(productId)}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        wishlisted
          ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-border-default bg-surface-base text-text-body hover:border-red-300 hover:text-red-600"
      }`}
      aria-label={wishlisted ? `Remove ${productTitle} from wishlist` : `Save ${productTitle} to wishlist`}
    >
      <Heart className={`h-4 w-4 stroke-2 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
      {wishlisted ? "Saved" : "Save"}
    </button>
  );
}
