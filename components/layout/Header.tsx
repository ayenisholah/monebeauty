import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NAV } from "@/content/site";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

export async function Header() {
  const t = await getTranslations("Nav");
  const th = await getTranslations("Header");

  const links = NAV.map((n) => ({ label: t(n.key), href: n.href }));

  return (
    <header className="sticky top-0 z-50 border-b border-line-header bg-[rgba(251,248,243,.82)] backdrop-blur-[14px]">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-[24px] px-[clamp(20px,5vw,56px)] py-[16px]">
        <Logo />

        {/* Desktop nav (≥900px) */}
        <div className="hidden items-center gap-[clamp(18px,2.4vw,40px)] nav:flex">
          <nav className="flex items-center gap-[clamp(16px,2vw,30px)]">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-sans text-[12px] font-normal tracking-[.13em] text-nav uppercase transition-colors hover:text-accent"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-[18px]">
            <Button href="/booking" size="sm" iconRight={ArrowRight}>
              {t("bookOnline")}
            </Button>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Mobile (<900px) */}
        <div className="nav:hidden">
          <MobileMenu
            links={links}
            bookOnline={t("bookOnline")}
            openLabel={th("openMenu")}
          />
        </div>
      </div>
    </header>
  );
}
