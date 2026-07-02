"use client";

import { ShoppingCartSimple } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/shop/CartProvider";

export function HeaderCartLink() {
  const t = useTranslations("Cart");
  const { count } = useCart();

  return (
    <Link
      href="/basket"
      aria-label={t("openBasket", { count })}
      className="relative text-nav transition-colors hover:text-accent"
    >
      <ShoppingCartSimple size={22} weight="thin" />
      {count > 0 ? (
        <span className="absolute -top-[9px] -right-[10px] grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-[5px] font-sans text-[10px] leading-none font-medium text-page">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
