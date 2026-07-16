"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  List,
  X,
  FlowerLotus,
  Phone,
  WhatsappLogo,
  EnvelopeSimple,
  LockSimple,
  Flask,
  InstagramLogo,
  FacebookLogo,
  Certificate,
  ShieldCheck,
  TestTube,
  UserFocus,
} from "@phosphor-icons/react";
import { Link, useRouter } from "@/i18n/navigation";
import { HeaderCartLink } from "@/components/shop/HeaderCartLink";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { PRODUCTS } from "@/content/products";
import { CONTACT, SOCIALS } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { cormorant } from "@/lib/fonts";

const services = [
  [
    "facial",
    "60 min",
    "/media/home/unsplash-photo-1643684391140-c5056cfd3436.jpg",
    "/services/face",
  ],
  ["body", "60 min", "/media/home/endospheres.jpg", "/services/body"],
  [
    "endospheres",
    "45 min",
    "/media/files/land/122/262782e883ed1fd7968fd4ed737bb37f.jpeg",
    "/instrumental/endosphere",
  ],
  [
    "laser",
    "30 min",
    "/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg",
    "/services/laser",
  ],
  [
    "rf",
    "60 min",
    "/media/files/land/280/21b80358547be97456baf00ac6a98ac9.jpeg",
    "/services/mikroneulanrf",
  ],
  [
    "trichology",
    "45 min",
    "/media/files/land/303/8b2e9288e47ba7705d700a8d7edb596e.jpeg",
    "/services/tricho",
  ],
  ["brows", "30 min", "/media/home/brows.jpg", "/services/eyebrows"],
  ["packages", "90 min", "/media/home/packages.jpg", "/services/packages"],
] as const;

const tech = [
  [
    "endospheres",
    "/media/files/land/122/262782e883ed1fd7968fd4ed737bb37f.jpeg",
    "/instrumental/endosphere",
  ],
  [
    "laser",
    "/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg",
    "/instrumental/laser",
  ],
  [
    "rf",
    "/media/files/land/268/297aa1aad5ec0dffb2a6e1aad8ff6d76.png",
    "/instrumental/mikroneulanrf",
  ],
  [
    "trichology",
    "/media/files/land/301/a214b208578ca13b2e31ba04ca3074f1.jpg",
    "/trichology",
  ],
] as const;

const productOrder = {
  AROSHA_BODY: [
    "stretch-marks-200ml-1",
    "518-b-tone-100ml-3",
    "cellulite-200ml-4",
    "lipolytic-200ml-5",
    "peeling-120ml-6",
    "nio-drain-9",
    "516-cellunight-200ml-night-10",
    "breast-amp-decollete-11",
  ],
  DIXIDOX_TRICHO: [
    "1-1-dixidox-de-luxe-41",
    "1-3-dixidox-de-luxe-peeling-42",
    "2-1-dixidox-de-luxe-shampoo-43",
    "2-4-dixidox-de-luxe-lotion-44",
    "3-1-dixidox-de-luxe-shampoo-45",
    "3-4-dixidox-de-luxe-lotion-46",
    "3-4-2-crexepil-de-luxe-classic-47",
    "3-4-5-science-7-de-luxe-lotion-48",
  ],
} as const;

const productDescriptions: Record<Locale, Record<string, string>> = {
  en: {
    "stretch-marks-200ml-1": "Targeted cream for stretch marks.",
    "518-b-tone-100ml-3": "Firming body concentrate.",
    "cellulite-200ml-4": "Anti-cellulite body gel.",
    "lipolytic-200ml-5": "Contouring lipolytic treatment.",
    "peeling-120ml-6": "Exfoliating body peeling.",
    "nio-drain-9": "Draining body concentrate.",
    "516-cellunight-200ml-night-10": "Overnight cellulite treatment.",
    "breast-amp-decollete-11": "Firming décolleté care.",
    "1-1-dixidox-de-luxe-41": "Antiseborrheic scalp shampoo.",
    "1-3-dixidox-de-luxe-peeling-42": "Purifying scalp peeling.",
    "2-1-dixidox-de-luxe-shampoo-43": "Anti-dandruff shampoo.",
    "2-4-dixidox-de-luxe-lotion-44": "Anti-dandruff scalp lotion.",
    "3-1-dixidox-de-luxe-shampoo-45": "Intensive scalp shampoo.",
    "3-4-dixidox-de-luxe-lotion-46": "Fortifying scalp lotion.",
    "3-4-2-crexepil-de-luxe-classic-47": "Classic scalp care lotion.",
    "3-4-5-science-7-de-luxe-lotion-48": "Advanced scalp lotion.",
  },
  fi: {
    "stretch-marks-200ml-1": "Kohdennettu voide raskausarville.",
    "518-b-tone-100ml-3": "Kiinteyttävä vartalotiiviste.",
    "cellulite-200ml-4": "Selluliittia hoitava vartalogeeli.",
    "lipolytic-200ml-5": "Muotoileva lipolyyttinen hoito.",
    "peeling-120ml-6": "Kuoriva vartalokuorinta.",
    "nio-drain-9": "Nestekiertoa tukeva vartalotiiviste.",
    "516-cellunight-200ml-night-10": "Yön yli vaikuttava selluliittihoito.",
    "breast-amp-decollete-11": "Kiinteyttävä dekolteen hoito.",
    "1-1-dixidox-de-luxe-41": "Antiseborrooinen hiuspohjashampoo.",
    "1-3-dixidox-de-luxe-peeling-42": "Puhdistava hiuspohjan kuorinta.",
    "2-1-dixidox-de-luxe-shampoo-43": "Hilsettä ehkäisevä shampoo.",
    "2-4-dixidox-de-luxe-lotion-44":
      "Hilsettä ehkäisevä hiuspohjan hoitoneste.",
    "3-1-dixidox-de-luxe-shampoo-45": "Tehokas hiuspohjashampoo.",
    "3-4-dixidox-de-luxe-lotion-46": "Vahvistava hiuspohjan hoitoneste.",
    "3-4-2-crexepil-de-luxe-classic-47": "Klassinen hiuspohjan hoitoneste.",
    "3-4-5-science-7-de-luxe-lotion-48":
      "Edistyksellinen hiuspohjan hoitoneste.",
  },
  ru: {
    "stretch-marks-200ml-1": "Целевой крем против растяжек.",
    "518-b-tone-100ml-3": "Укрепляющий концентрат для тела.",
    "cellulite-200ml-4": "Антицеллюлитный гель для тела.",
    "lipolytic-200ml-5": "Липолитическое средство для контуров тела.",
    "peeling-120ml-6": "Отшелушивающий пилинг для тела.",
    "nio-drain-9": "Дренирующий концентрат для тела.",
    "516-cellunight-200ml-night-10": "Ночной антицеллюлитный уход.",
    "breast-amp-decollete-11": "Укрепляющий уход за зоной декольте.",
    "1-1-dixidox-de-luxe-41": "Антисеборейный шампунь для кожи головы.",
    "1-3-dixidox-de-luxe-peeling-42": "Очищающий пилинг кожи головы.",
    "2-1-dixidox-de-luxe-shampoo-43": "Шампунь против перхоти.",
    "2-4-dixidox-de-luxe-lotion-44": "Лосьон для кожи головы против перхоти.",
    "3-1-dixidox-de-luxe-shampoo-45": "Интенсивный шампунь для кожи головы.",
    "3-4-dixidox-de-luxe-lotion-46": "Укрепляющий лосьон для кожи головы.",
    "3-4-2-crexepil-de-luxe-classic-47": "Классический лосьон для кожи головы.",
    "3-4-5-science-7-de-luxe-lotion-48":
      "Инновационный лосьон для кожи головы.",
  },
};

function Marker({ children }: { children: React.ReactNode }) {
  return (
    <span className="hr-marker">
      <span>{children}</span>
    </span>
  );
}

export function HomeReference() {
  const t = useTranslations("HomeReference");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState<"AROSHA_BODY" | "DIXIDOX_TRICHO">(
    "AROSHA_BODY",
  );
  const [selected, setSelected] = useState("");
  const products = productOrder[tab]
    .map((slug) => PRODUCTS.find((product) => product.slug === slug))
    .filter((product): product is (typeof PRODUCTS)[number] =>
      Boolean(product),
    );
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      ".home-reference .hr-section-head, .home-reference .hr-care article, .home-reference .hr-services article, .home-reference .hr-tech article, .home-reference .hr-products article, .home-reference .hr-booking > *",
    );
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("hr-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("hr-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [tab]);
  const nav = [
    ["treatments", t("nav.treatments")],
    ["technologies", t("nav.technologies")],
    ["products", t("nav.products")],
    ["standard", t("nav.standard")],
    ["booking", t("nav.consultation")],
  ];
  const choose = (key: string) => {
    setSelected(key);
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const key = String(fd.get("service") || selected || "facial");
    router.push({ pathname: "/booking", query: { service: key } });
  };
  return (
    <div className="home-reference" id="top">
      <header className="hr-header">
        <div className="hr-container hr-header-inner">
          <nav className="hr-nav hr-left">
            <a href="#treatments">{t("nav.treatments")}</a>
            <a href="#technologies">{t("nav.technologies")}</a>
          </nav>
          <a className="hr-brand" href="#top">
            <FlowerLotus weight="thin" />
            <b>MONE</b>
            <span>Beauty Clinic</span>
          </a>
          <nav className="hr-nav hr-right">
            <a href="#products">{t("nav.products")}</a>
            <a href="#standard">{t("nav.standard")}</a>
            <a className="hr-btn dark small" href="#booking">
              {t("common.bookOnline")}
            </a>
            <LanguageSwitcher />
          </nav>
          <div className="hr-mobile">
            <HeaderCartLink />
            <LanguageSwitcher />
            <button
              aria-label={t("nav.menu")}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <List />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="hr-menu">
            {nav.map(([id, label], i) => (
              <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
                {label}
                <span className={cormorant.className}>0{i + 1}</span>
              </a>
            ))}
            <a href="#booking" className="hr-btn dark">
              {t("common.bookOnline")}
            </a>
          </nav>
        )}
      </header>
      <main>
        <section className="hr-hero">
          <div className="hr-container">
            <div className="hr-meta">
              <span>{t("hero.metaLeft")}</span>
              <span>{t("hero.metaRight")}</span>
            </div>
            <div className="hr-hero-copy">
              <h1>{t("hero.title")}</h1>
              <p>{t("hero.lead")}</p>
              <div>
                <a className="hr-btn dark" href="#booking">
                  {t("common.bookOnline")}
                </a>
                <a className="hr-btn ghost" href="#treatments">
                  {t("hero.explore")}
                </a>
              </div>
            </div>
            <div className="hr-hero-image">
              <Image
                src="https://images.unsplash.com/photo-1713085085470-fba013d67e65?auto=format&fit=crop&w=1600&q=80"
                alt={t("hero.imageAlt")}
                fill
                priority
                sizes="100vw"
              />
              <video
                muted
                loop
                autoPlay
                playsInline
                poster="https://images.unsplash.com/photo-1713085085470-fba013d67e65?auto=format&fit=crop&w=1600&q=80"
              >
                <source src="/media/hero.mp4" type="video/mp4" />
              </video>
              <span>{t("hero.tag")}</span>
            </div>
            <dl className="hr-strip">
              {["location", "hours", "telephone"].map((k) => (
                <div key={k}>
                  <dt>{t(`hero.facts.${k}.label`)}</dt>
                  <dd>{t(`hero.facts.${k}.value`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <Section
          id="standard"
          alt
          marker={t("standard.marker")}
          title={t("standard.title")}
          lead={t("standard.lead")}
        >
          <div className="hr-care">
            {["consultation", "diagnosis", "plan", "care"].map((k, i) => (
              <article key={k}>
                <span className={cormorant.className}>0{i + 1}</span>
                <h3>{t(`standard.items.${k}.title`)}</h3>
                <p>{t(`standard.items.${k}.body`)}</p>
              </article>
            ))}
          </div>
          <div className="hr-creds">
            {[
              ["licensed", Certificate],
              ["eu", ShieldCheck],
              ["evidence", TestTube],
              ["personalized", UserFocus],
              ["gdpr", LockSimple],
            ].map(([key, Icon]) => (
              <span key={key as string}>
                <Icon size={17} weight="thin" />
                {t(`standard.credentials.${key as string}`)}
              </span>
            ))}
          </div>
        </Section>
        <Section
          id="treatments"
          marker={t("treatments.marker")}
          title={t("treatments.title")}
          lead={t("treatments.lead")}
        >
          <div className="hr-services">
            {services.map(([key, duration, image, href], i) => (
              <article className={i === 0 ? "featured" : ""} key={key}>
                <div className="hr-card-image">
                  <Image
                    src={image}
                    alt={t(`services.${key}.name`)}
                    fill
                    sizes="(min-width: 900px) 50vw, 100vw"
                  />
                </div>
                <div className="hr-card-body">
                  <span>
                    0{i + 1} · {duration}
                  </span>
                  <h3>{t(`services.${key}.name`)}</h3>
                  <p>{t(`services.${key}.description`)}</p>
                  <div>
                    <button
                      className={`hr-btn ${i === 0 ? "dark" : "ghost"} small`}
                      onClick={() => choose(key)}
                    >
                      {t("common.book")}
                    </button>
                    <Link
                      href={href}
                      className={i === 0 ? "hr-btn ghost small" : "hr-more"}
                    >
                      {t("common.readMore")}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
            {["injectable", "consultation"].map((k) => (
              <article className="soon" key={k}>
                <div className="hr-card-image">
                  <span>{t("treatments.comingSoon")}</span>
                </div>
                <div className="hr-card-body">
                  <h3>{t(`services.${k}.name`)}</h3>
                  <p>{t(`services.${k}.description`)}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>
        <Section
          id="technologies"
          alt
          marker={t("technology.marker")}
          title={t("technology.title")}
          lead={t("technology.lead")}
        >
          <div className="hr-tech">
            {tech.map(([key, image, href], i) => (
              <article key={key} className={i % 2 ? "hr-tech-reverse" : ""}>
                <div className="hr-tech-image">
                  <Image
                    src={image}
                    alt={t(`technology.items.${key}.name`)}
                    fill
                    sizes="(min-width: 860px) 50vw, 100vw"
                  />
                </div>
                <div className="hr-tech-body">
                  <b className={cormorant.className}>0{i + 1}</b>
                  <span className="hr-tech-spec">
                    {t(`technology.items.${key}.spec`)}
                  </span>
                  <h3 className={cormorant.className}>
                    {t(`technology.items.${key}.name`)}
                  </h3>
                  <p className="hr-tech-text">
                    {t(`technology.items.${key}.body`)}
                  </p>
                  <div className="hr-tech-actions">
                    <button
                      className="hr-btn ghost small"
                      onClick={() => choose(key)}
                    >
                      {t("common.book")}
                    </button>
                    <Link href={href} className="hr-more">
                      {t("common.readMore")}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Section>
        <Section
          id="products"
          marker={t("products.marker")}
          title={t("products.title")}
          lead={t("products.lead")}
        >
          <div className="hr-tabs" role="tablist">
            {(["AROSHA_BODY", "DIXIDOX_TRICHO"] as const).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key)}
              >
                {t(`products.tabs.${key}`)}{" "}
                <span>{PRODUCTS.filter((p) => p.category === key).length}</span>
              </button>
            ))}
          </div>
          <div className="hr-products">
            {products.map((p) => (
              <article key={p.slug}>
                <div className="hr-product-image">
                  {p.image && (
                    <Image
                      src={p.image}
                      alt={p.i18n[locale].name}
                      fill
                      sizes="25vw"
                    />
                  )}
                </div>
                <div>
                  <small>{tab === "AROSHA_BODY" ? "AROSHA" : "DIXIDOX"}</small>
                  <h3>{p.i18n[locale].name}</h3>
                  <p>{productDescriptions[locale][p.slug]}</p>
                  <strong>
                    {p.size} <em>{p.price ? `€${p.price}` : ""}</em>
                  </strong>
                  <AddToCartButton
                    slug={p.slug}
                    label={t("products.add")}
                    className="hr-add"
                  />
                  <Link href={`/catalog/${p.slug}`} className="hr-more">
                    {t("common.readMore")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="hr-product-foot">
            <p>
              <Flask /> {t("products.note")}
            </p>
            <Link className="hr-btn ghost small" href="/catalog">
              {t("products.all")}
            </Link>
          </div>
        </Section>
        <Section
          id="booking"
          alt
          marker={t("booking.marker")}
          title={t("booking.title")}
          lead={t("booking.lead")}
        >
          <div className="hr-booking">
            <div>
              <p>{t("booking.intro")}</p>
              {selected && (
                <div className="hr-echo">
                  <span>{t("booking.requested")}</span>
                  <strong>{t(`services.${selected}.name`)}</strong>
                </div>
              )}
              <div className="hr-contact">
                <a href={CONTACT.phoneHref}>
                  <Phone /> {CONTACT.phone}
                </a>
                <a href={SOCIALS.whatsapp}>
                  <WhatsappLogo /> {t("booking.whatsapp")}
                </a>
                <a href={CONTACT.emailHref}>
                  <EnvelopeSimple /> {CONTACT.email}
                </a>
              </div>
              <p className="hr-gdpr">
                <LockSimple /> {t("booking.gdpr")}
              </p>
            </div>
            <form onSubmit={submit}>
              <div className="hr-form-row">
                <Field label={t("booking.fields.name")} name="name" required />
                <Field
                  label={t("booking.fields.phone")}
                  name="phone"
                  type="tel"
                  required
                />
              </div>
              <Field
                label={t("booking.fields.email")}
                name="email"
                type="email"
                required
              />
              <div className="hr-form-row">
                <label>
                  {t("booking.fields.treatment")}
                  <select
                    name="service"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    required
                  >
                    <option value="">{t("booking.select")}</option>
                    {services.map(([k]) => (
                      <option key={k} value={k}>
                        {t(`services.${k}.name`)}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label={t("booking.fields.date")}
                  name="date"
                  type="date"
                />
              </div>
              <label>
                {t("booking.fields.notes")}
                <textarea
                  name="notes"
                  placeholder={t("booking.notesPlaceholder")}
                />
              </label>
              <button className="hr-btn dark" type="submit">
                {t("booking.submit")}
              </button>
            </form>
          </div>
        </Section>
      </main>
      <footer className="hr-footer" id="contact">
        <div className="hr-container hr-footer-grid">
          <div>
            <div className="hr-footer-logo">
              <FlowerLotus />
              <b>MONE</b>
              <span>Beauty Clinic</span>
            </div>
            <p>{t("footer.about")}</p>
            <div className="hr-social">
              <a href={SOCIALS.instagram}>
                <InstagramLogo />
              </a>
              <a href={SOCIALS.facebook}>
                <FacebookLogo />
              </a>
              <a href={SOCIALS.whatsapp}>
                <WhatsappLogo />
              </a>
            </div>
          </div>
          <FooterCol title={t("footer.clinic")}>
            <p>Solvikinkatu 5</p>
            <p>00990 Helsinki</p>
            <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
            <a href={CONTACT.emailHref}>{CONTACT.email}</a>
          </FooterCol>
          <FooterCol title={t("footer.hours")}>
            <p>{t("footer.byAgreement")}</p>
            <p>{t("footer.booking247")}</p>
          </FooterCol>
          <FooterCol title={t("footer.explore")}>
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </FooterCol>
          <FooterCol title={t("footer.legal")}>
            <Link href="/privacy-policy">{t("footer.privacy")}</Link>
            <Link href="/terms-of-use">{t("footer.terms")}</Link>
            <Link href="/cookies-policy">{t("footer.cookies")}</Link>
          </FooterCol>
        </div>
        <div className="hr-footer-bar">
          <div className="hr-container hr-footer-bar-inner">
            <span>© {new Date().getFullYear()} Mone Beauty Clinic</span>
            <div>
              <Link href="/privacy-policy">{t("footer.privacy")}</Link>
              <Link href="/terms-of-use">{t("footer.terms")}</Link>
              <Link href="/cookies-policy">{t("footer.cookies")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({
  id,
  alt = false,
  marker,
  title,
  lead,
  children,
}: {
  id: string;
  alt?: boolean;
  marker: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`hr-section ${alt ? "alt" : ""}`}>
      <div className="hr-container">
        <header className="hr-section-head">
          <Marker>{marker}</Marker>
          <h2 className={cormorant.className}>{title}</h2>
          <p>{lead}</p>
        </header>
        {children}
      </div>
    </section>
  );
}
function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input name={name} type={type} required={required} />
    </label>
  );
}
function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hr-footer-col">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
