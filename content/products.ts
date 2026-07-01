import type { Locale } from "@/i18n/routing";
import productsData from "./generated/products.json";

export type ProductCategory = "AROSHA_BODY" | "DIXIDOX_TRICHO";

export interface Product {
  slug: string;
  category: ProductCategory;
  image: string | null;
  price: number | null;
  size: string | null;
  i18n: Record<Locale, { name: string; description: string }>;
}

export const PRODUCTS = productsData as Product[];
export const PRODUCT_SLUGS = PRODUCTS.map((p) => p.slug);

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

/** The 8 products featured on the homepage (matching the live site). */
export const HOME_PRODUCT_SLUGS = [
  "stretch-marks-200ml-1",
  "518-b-tone-100ml-3",
  "cellulite-200ml-4",
  "lipolytic-200ml-5",
  "peeling-120ml-6",
  "nio-drain-9",
  "516-cellunight-200ml-night-10",
  "breast-amp-decollete-11",
];

export function formatPrice(price: number | null): string {
  if (price == null) return "";
  return `${price.toFixed(2)} €`;
}
