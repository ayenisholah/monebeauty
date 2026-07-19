"use client";

import { useEffect, useRef, useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { HeaderCartLink } from "@/components/shop/HeaderCartLink";
import { cormorant } from "@/lib/fonts";
import { PUBLIC_PATHS } from "@/lib/public-routes";

type SectionLink = {
  href: string;
  label: string;
};

export function MobileMenu({
  links,
  bookOnline,
  openLabel,
  closeLabel,
  accountLabel,
}: {
  links: SectionLink[];
  bookOnline: string;
  openLabel: string;
  closeLabel: string;
  accountLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const previousOverflow = useRef("");

  useEffect(() => {
    if (open) {
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow.current;
    }

    return () => {
      document.body.style.overflow = previousOverflow.current;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="hr-mobile">
      <HeaderCartLink />
      <LanguageSwitcher />
      <button
        type="button"
        aria-label={open ? closeLabel : openLabel}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X size={22} weight="thin" />
        ) : (
          <List size={22} weight="thin" />
        )}
      </button>

      {open ? (
        <nav className="hr-menu" aria-label={openLabel}>
          {links.map((link, index) => (
            <Link key={link.href} href={link.href} onClick={close}>
              {link.label}
              <span className={cormorant.className}>0{index + 1}</span>
            </Link>
          ))}
          <Link
            href={PUBLIC_PATHS.booking}
            className="hr-btn dark"
            onClick={close}
          >
            {bookOnline}
          </Link>
          <Link href={PUBLIC_PATHS.account} onClick={close}>
            {accountLabel}
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
