"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AddressBook,
  Article,
  CalendarCheck,
  CalendarBlank,
  ChatCircleDots,
  CurrencyEur,
  Flask,
  House,
  List,
  Package,
  ShoppingBag,
  SignOut,
  SquaresFour,
  UserCircle,
  UsersThree,
  ShieldCheck,
  SidebarSimple,
  PlugsConnected,
  X,
} from "@phosphor-icons/react";
import type { Locale } from "@/i18n/routing";
import { adminLogoutAction } from "@/lib/admin-actions";
import { adminBase, adminHref, type AdminModule } from "@/lib/admin-routing";
import {
  ADMIN_SIDEBAR_COOKIE,
  ADMIN_SIDEBAR_COOKIE_MAX_AGE,
} from "@/lib/admin-sidebar";
import { ThemedSelect } from "@/components/ui/ThemedSelect";

type Labels = {
  appName: string;
  menu: string;
  close: string;
  expandSidebar: string;
  collapseSidebar: string;
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
  { module: "staff", icon: UsersThree },
  { module: "audit", icon: ShieldCheck },
  { module: "integrations", icon: PlugsConnected },
  { module: "calendar", icon: CalendarBlank },
  { module: "appointments", icon: CalendarCheck },
  { module: "orders", icon: ShoppingBag },
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
  initialCollapsed,
  wide = false,
}: {
  children: React.ReactNode;
  locale: Locale;
  labels: Labels;
  user: { email: string; name: string | null };
  initialCollapsed: boolean;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
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
          "a[href],button:not([disabled]),select:not([disabled]),input:not([disabled])",
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

  function setSidebarCollapsed(next: boolean) {
    setCollapsed(next);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ADMIN_SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; Max-Age=${ADMIN_SIDEBAR_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  }

  const sidebar = (
    <aside
      id={drawerId}
      ref={drawerRef}
      aria-label={labels.appName}
      className={`fixed inset-y-0 left-0 z-[70] flex w-[min(88vw,292px)] flex-col border-r border-line-header bg-card shadow-card transition-[transform,width] duration-200 motion-reduce:transition-none [@media(min-width:900px)]:translate-x-0 [@media(min-width:900px)]:shadow-none ${collapsed ? "[@media(min-width:900px)]:w-[76px]" : "[@media(min-width:900px)]:w-[292px]"} ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div
        className={`flex min-h-[76px] items-center justify-between border-b border-line-hair px-[16px] ${collapsed ? "[@media(min-width:900px)]:justify-center" : ""}`}
      >
        <Link
          href={adminBase(locale)}
          className={`font-display text-[23px] font-medium ${collapsed ? "[@media(min-width:900px)]:hidden" : ""}`}
        >
          {labels.appName}
        </Link>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-controls={drawerId}
          aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar}
          title={collapsed ? labels.expandSidebar : labels.collapseSidebar}
          className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-[4px] hover:bg-btn-fill focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none [@media(min-width:900px)]:inline-flex"
        >
          <SidebarSimple
            size={22}
            weight="thin"
            aria-hidden="true"
            className={`transition-transform duration-200 motion-reduce:transition-none ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
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
              aria-label={collapsed ? labels.nav[module] : undefined}
              title={collapsed ? labels.nav[module] : undefined}
              className={`mb-[4px] flex min-h-[44px] items-center gap-[12px] rounded-[6px] px-[12px] font-sans text-[14px] transition-[color,background-color,padding] ${collapsed ? "[@media(min-width:900px)]:justify-center [@media(min-width:900px)]:gap-0 [@media(min-width:900px)]:px-0" : ""} ${active ? "bg-btn-fill text-ink" : "text-body hover:bg-page hover:text-ink"}`}
            >
              <Icon
                size={20}
                weight="thin"
                aria-hidden="true"
                className="shrink-0"
              />
              <span
                className={
                  collapsed ? "[@media(min-width:900px)]:sr-only" : undefined
                }
              >
                {labels.nav[module]}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line-hair p-[16px]">
        <div
          className={`mb-[12px] flex items-center gap-[10px] ${collapsed ? "[@media(min-width:900px)]:hidden" : ""}`}
        >
          <UserCircle size={26} weight="thin" aria-hidden="true" />
          <div className="min-w-0 font-sans">
            <div className="truncate text-[14px] text-ink">
              {user.name || labels.appName}
            </div>
            <div className="truncate text-label text-muted">{user.email}</div>
          </div>
        </div>
        <label
          className={`mb-[10px] block font-sans text-label tracking-[.08em] text-muted uppercase ${collapsed ? "[@media(min-width:900px)]:hidden" : ""}`}
        >
          {labels.locale}
          <ThemedSelect
            value={locale}
            onValueChange={(next) => switchLocale(next as Locale)}
            options={[
              { value: "fi", label: "Suomi" },
              { value: "en", label: "English" },
              { value: "ru", label: "Русский" },
            ]}
            className="mt-[6px] w-full tracking-normal normal-case"
          />
        </label>
        <form action={adminLogoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            aria-label={collapsed ? labels.logout : undefined}
            title={collapsed ? labels.logout : undefined}
            className={`flex min-h-[44px] w-full items-center gap-[10px] rounded-[4px] px-[10px] font-sans text-[14px] text-body hover:bg-btn-fill hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${collapsed ? "[@media(min-width:900px)]:justify-center [@media(min-width:900px)]:gap-0 [@media(min-width:900px)]:px-0" : ""}`}
          >
            <SignOut size={20} weight="thin" aria-hidden="true" />
            <span
              className={
                collapsed ? "[@media(min-width:900px)]:sr-only" : undefined
              }
            >
              {labels.logout}
            </span>
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
        <span className="ml-[10px] font-display text-[22px] font-medium">
          {labels.appName}
        </span>
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
      <main
        className={`min-w-0 px-[16px] py-[28px] transition-[margin-left] duration-200 motion-reduce:transition-none sm:px-[24px] [@media(min-width:900px)]:px-[clamp(28px,4vw,60px)] [@media(min-width:900px)]:py-[42px] ${collapsed ? "[@media(min-width:900px)]:ml-[76px]" : "[@media(min-width:900px)]:ml-[292px]"}`}
      >
        <div
          className={wide ? "mx-auto max-w-[1800px]" : "mx-auto max-w-[1280px]"}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
