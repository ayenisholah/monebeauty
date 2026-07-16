"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CART_STORAGE_KEY,
  cartSubtotal,
  normalizeQty,
  resolveCartLines,
  type CartItemInput,
  type CartLine,
} from "@/lib/cart";
import type { Product } from "@/content/products";

type CartContextValue = {
  items: CartItemInput[];
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItemInput[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => typeof item?.slug === "string")
      .map((item) => ({ slug: item.slug, qty: normalizeQty(Number(item.qty)) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children, products }: { children: ReactNode; products: Product[] }) {
  const [items, setItems] = useState<CartItemInput[]>(readStoredCart);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const lines = resolveCartLines(items, products);
    return {
      items,
      lines,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      subtotal: cartSubtotal(lines),
      add(slug, qty = 1) {
        setItems((current) => {
          const existing = current.find((item) => item.slug === slug);
          if (existing) {
            return current.map((item) =>
              item.slug === slug
                ? { ...item, qty: normalizeQty(item.qty + qty) }
                : item,
            );
          }
          return [...current, { slug, qty: normalizeQty(qty) }];
        });
      },
      setQty(slug, qty) {
        setItems((current) =>
          current.map((item) =>
            item.slug === slug ? { ...item, qty: normalizeQty(qty) } : item,
          ),
        );
      },
      remove(slug) {
        setItems((current) => current.filter((item) => item.slug !== slug));
      },
      clear() {
        setItems([]);
      },
    };
  }, [items, products]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
