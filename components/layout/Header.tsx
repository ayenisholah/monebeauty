import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { HeaderCartLink } from "@/components/shop/HeaderCartLink";
import { NAV } from "@/content/site";
import { Logo } from "./Logo";
import { NavDropdown } from "./NavDropdown";
import { MobileMenu } from "./MobileMenu";

export async function Header() {
  const t = await getTranslations("Nav");
  const th = await getTranslations("Header");

  // Resolve the nav tree (labels) once for desktop + mobile.
  type NavTreeItem = {
    label: string;
    href?: string;
    children?: { label: string; href: string }[];
  };
  const tree: NavTreeItem[] = NAV.map((item) =>
    "children" in item
      ? {
          label: t(item.key),
          children: item.children.map((c) => ({
            label: t(c.key),
            href: c.href,
          })),
        }
      : { label: t(item.key), href: item.href },
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line-header bg-[rgba(251,248,243,.82)] backdrop-blur-[14px]">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-[20px] px-[clamp(20px,5vw,56px)] py-[14px]">
        <Logo />

        {/* Desktop nav (≥900px) */}
        <div className="hidden items-center gap-[clamp(14px,1.6vw,26px)] nav:flex">
          <nav className="flex items-center gap-[clamp(12px,1.4vw,22px)]">
            {tree.map((item) =>
              item.children ? (
                <NavDropdown
                  key={item.label}
                  label={item.label}
                  items={item.children}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  className="font-sans text-[12px] tracking-[.13em] text-nav uppercase transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="flex items-center gap-[16px]">
            <HeaderCartLink />
            <LanguageSwitcher />
            <Button href="/booking" size="sm">
              {t("bookTime")}
            </Button>
          </div>
        </div>

        {/* Mobile (<900px) */}
        <div className="nav:hidden">
          <MobileMenu
            tree={tree}
            bookTime={t("bookTime")}
            openLabel={th("openMenu")}
          />
        </div>
      </div>
    </header>
  );
}
