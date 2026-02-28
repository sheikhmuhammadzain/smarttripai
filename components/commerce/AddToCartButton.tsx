"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowRight, Check } from "lucide-react";
import { useCartState } from "@/components/commerce/cart-client";

interface AddToCartButtonProps {
  productId: string;
}

export default function AddToCartButton({ productId }: AddToCartButtonProps) {
  const { addItem } = useCartState();
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState(false);

  function handleAdd() {
    addItem(productId, quantity);
    setFeedback(true);
    window.setTimeout(() => setFeedback(false), 2000);
  }

  return (
    <div className="space-y-3">
      {/* Quantity + Add */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center rounded-lg border border-border-default overflow-hidden">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 py-2.5 text-sm font-medium text-text-body transition-colors hover:bg-surface-subtle"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[2.5rem] text-center text-sm font-semibold text-text-primary border-x border-border-default py-2.5">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(Math.min(10, quantity + 1))}
            className="px-3 py-2.5 text-sm font-medium text-text-body transition-colors hover:bg-surface-subtle"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          onClick={handleAdd}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          {feedback ? (
            <>
              <Check className="h-4 w-4" />
              Added
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </>
          )}
        </button>
      </div>

      {/* Go to cart link */}
      <Link
        href="/cart"
        className="flex items-center justify-center gap-1.5 rounded-lg border border-border-default px-5 py-2.5 text-sm font-medium text-text-body transition-colors hover:bg-surface-subtle"
      >
        View Cart
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
