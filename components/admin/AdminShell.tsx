"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AddressBook,
  Article,
  ChatCircleDots,
  CurrencyEur,
  Flask,
  House,
  List,
  Package,
  SignOut,
  SquaresFour,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import type { Locale } from "@/i18n/routing";
import { adminLogoutAction } from "@/lib/admin-actions";
import { adminBase, adminHref, type AdminModule } from "@/lib/admin-routing";

type Labels = {
  appName: string;
  menu: string;
  close: string;
  logout: string;
  locale: string;
  nav: Record<Exclude<AdminModule, "login">, string>;
};

const nav: Array<{
  module: Exclude<AdminModule, "login">;
  icon: typeof House;
}> = [
  { module: "dashboard", icon: House },
  { module: "clients", icon: AddressBook },
  { module: "services", icon: SquaresFour },
  { module: "technologies", icon: Flask },
  { module: "content", icon: Article },
  { module: "products", icon: Package },
  { module: "pricing", icon: CurrencyEur },
  { module: "blog", icon: List },
  { module: "chat", icon: ChatCircleDots },
];

export function AdminShell({
  children,
  locale,
  labels,
  user,
}: {
  children: React.ReactNode;
  locale: Locale;
  labels: Labels;
  user: { email: string; name: string | null };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const drawerId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const drawer = drawerRef.current;
    const focusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),select:not([disabled]),input:not([disabled])',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function switchLocale(next: Locale) {
    const unprefixed = pathname.replace(/^\/(en|ru)(?=\/)/, "");
    const nextPath = next === "fi" ? unprefixed : `/${next}${unprefixed}`;
    router.push(`${nextPath}${window.location.search}${window.location.hash}`);
  }

  const sidebar = (
    <aside
      id={drawerId}
      ref={drawerRef}
      aria-label={labels.appName}
      className={`fixed inset-y-0 left-0 z-[70] flex w-[min(88vw,292px)] flex-col border-r border-line-header bg-card shadow-card transition-transform duration-200 motion-reduce:transition-none [@media(min-width:900px)]:translate-x-0 [@media(min-width:900px)]:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex min-h-[76px] items-center justify-between border-b border-line-hair px-[20px]">
        <Link href={adminBase(locale)} className="font-display text-[23px] font-medium">
          {labels.appName}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[4px] hover:bg-btn-fill [@media(min-width:900px)]:hidden"
          aria-label={labels.close}
        >
          <X size={22} weight="thin" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-[12px] py-[16px]">
        {nav.map(({ module, icon: Icon }) => {
          const href = adminHref(locale, module);
          const active =
            module === "dashboard"
              ? pathname === adminBase(locale)
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={module}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`mb-[4px] flex min-h-[44px] items-center gap-[12px] rounded-[6px] px-[12px] font-sans text-[14px] transition-colors ${active ? "bg-btn-fill text-ink" : "text-body hover:bg-page hover:text-ink"}`}
            >
              <Icon size={20} weight="thin" aria-hidden="true" />
              {labels.nav[module]}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line-hair p-[16px]">
        <div className="mb-[12px] flex items-center gap-[10px]">
          <UserCircle size={26} weight="thin" aria-hidden="true" />
          <div className="min-w-0 font-sans">
            <div className="truncate text-[13px] text-ink">{user.name || labels.appName}</div>
            <div className="truncate text-[11px] text-muted">{user.email}</div>
          </div>
        </div>
        <label className="mb-[10px] block font-sans text-[11px] tracking-[.08em] text-muted uppercase">
          {labels.locale}
          <select
            value={locale}
            onChange={(event) => switchLocale(event.target.value as Locale)}
            className="mt-[6px] min-h-[44px] w-full rounded-[4px] border border-line-btn bg-page px-[10px] text-[13px] text-ink"
          >
            <option value="fi">Suomi</option>
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </label>
        <form action={adminLogoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="flex min-h-[44px] w-full items-center gap-[10px] rounded-[4px] px-[10px] font-sans text-[13px] text-body hover:bg-btn-fill hover:text-ink"
          >
            <SignOut size={20} weight="thin" aria-hidden="true" />
            {labels.logout}
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="sticky top-0 z-[50] flex min-h-[64px] items-center border-b border-line-header bg-card/95 px-[16px] backdrop-blur [@media(min-width:900px)]:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={drawerId}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[4px] hover:bg-btn-fill"
          aria-label={labels.menu}
        >
          <List size={23} weight="thin" />
        </button>
        <span className="ml-[10px] font-display text-[22px] font-medium">{labels.appName}</span>
      </header>
      {sidebar}
      {open ? (
        <button
          type="button"
          aria-label={labels.close}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[1px] [@media(min-width:900px)]:hidden"
        />
      ) : null}
      <main className="min-w-0 px-[16px] py-[28px] sm:px-[24px] [@media(min-width:900px)]:ml-[292px] [@media(min-width:900px)]:px-[clamp(28px,4vw,60px)] [@media(min-width:900px)]:py-[42px]">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
