"use client"

import {useCallback, useMemo, useState} from "react"
import {getProductById} from "@/lib/data"
import {
  CART_STORAGE_KEY,
  type CartItem,
  sanitizeCartItems,
} from "@/modules/commerce/cart"

function readCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    return sanitizeCartItems(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

export function useCartState() {
  const [items, setItems] = useState<CartItem[]>(() => readCart())

  const setAndPersist = useCallback(
    (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
      setItems(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater
        writeCart(next)
        const itemCount = next.reduce((sum, item) => sum + item.quantity, 0)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cart:changed", {detail: {itemCount}}),
          )
        }
        return next
      })
    },
    [],
  )

  const addItem = useCallback(
    (productId: string, quantity = 1) => {
      if (!getProductById(productId)) return
      const safeQuantity = Math.max(1, Math.min(10, quantity))
      setAndPersist(prev => {
        const existing = prev.find(item => item.productId === productId)
        if (!existing) {
          return [...prev, {productId, quantity: safeQuantity}]
        }
        return prev.map(item =>
          item.productId === productId
            ? {
                ...item,
                quantity: Math.max(
                  1,
                  Math.min(10, item.quantity + safeQuantity),
                ),
              }
            : item,
        )
      })
    },
    [setAndPersist],
  )

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const safeQuantity = Math.max(1, Math.min(10, Math.round(quantity)))
      setAndPersist(prev =>
        prev.map(item =>
          item.productId === productId
            ? {...item, quantity: safeQuantity}
            : item,
        ),
      )
    },
    [setAndPersist],
  )

  const removeItem = useCallback(
    (productId: string) => {
      setAndPersist(prev => prev.filter(item => item.productId !== productId))
    },
    [setAndPersist],
  )

  const clearCart = useCallback(() => {
    setAndPersist([])
  }, [setAndPersist])

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  )

  return {
    items,
    itemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }
}
