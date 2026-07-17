import { FlowerLotus } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { PUBLIC_PATHS } from "@/lib/public-routes";
import { HeaderCartLink } from "@/components/shop/HeaderCartLink";

export async function Header() {
  const t = await getTranslations("HomeReference");
  const th = await getTranslations("Header");
  const links = [
    { href: "/#treatments", label: t("nav.treatments") },
    { href: "/#technologies", label: t("nav.technologies") },
    { href: "/#products", label: t("nav.products") },
    { href: "/#standard", label: t("nav.standard") },
    { href: "/#booking", label: t("nav.consultation") },
  ];

  return (
    <header className="hr-header">
      <div className="hr-container hr-header-inner">
        <nav className="hr-nav hr-left" aria-label={t("nav.menu")}>
          {links.slice(0, 2).map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link className="hr-brand" href="/#top" aria-label="Mone Beauty Clinic">
          <FlowerLotus weight="thin" />
          <b>MONE</b>
          <span>Beauty Clinic</span>
        </Link>

        <nav className="hr-nav hr-right" aria-label={t("nav.menu")}>
          {links.slice(2, 4).map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link className="hr-btn dark small" href={PUBLIC_PATHS.booking}>
            {t("common.bookOnline")}
          </Link>
          <HeaderCartLink />
          <LanguageSwitcher />
        </nav>

        <MobileMenu
          links={links}
          bookOnline={t("common.bookOnline")}
          openLabel={th("openMenu")}
          closeLabel={th("closeMenu")}
        />
      </div>
    </header>
  );
}
