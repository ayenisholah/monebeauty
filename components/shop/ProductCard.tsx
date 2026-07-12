import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { formatPrice, type Product } from "@/content/products";
import type { Locale } from "@/i18n/routing";

/** AROSHA / DIXIDOX product card (image, name, size, price, basket button). */
export function ProductCard({
  product,
  locale,
  intoBasket,
}: {
  product: Product;
  locale: Locale;
  intoBasket: string;
}) {
  const localized = product.i18n[locale] ?? Object.values(product.i18n)[0];
  const name = localized?.name ?? product.slug;
  const href = `/catalog/${product.slug}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-line-card bg-card transition-all duration-300 hover:-translate-y-[4px] hover:border-line-card-hover hover:shadow-[var(--shadow-card)]">
      <Link
        href={href}
        className="relative flex h-[240px] items-center justify-center bg-page"
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={name}
            fill
            className="object-contain p-[22px]"
            sizes="(max-width: 640px) 50vw, (max-width: 900px) 33vw, 25vw"
          />
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col items-center px-[16px] pt-[14px] pb-[20px] text-center">
        <Link
          href={href}
          className="font-display text-[16px] leading-[1.25] font-medium text-ink uppercase transition-colors group-hover:text-accent"
        >
          {name}
        </Link>
        {product.size ? (
          <div className="mt-[6px] font-sans text-[12px] tracking-[.06em] text-muted">
            {product.size}
          </div>
        ) : null}
        <div className="mt-[8px] font-sans text-[15px] text-ink">
          {formatPrice(product.price)}
        </div>
        <AddToCartButton slug={product.slug} label={intoBasket} />
      </div>
    </div>
  );
}
