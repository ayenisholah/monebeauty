import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, type Locale, type ProductCategory, type ServiceCategory } from "@prisma/client";

const prisma = new PrismaClient();
const root = process.cwd();
const force = process.argv.includes("--force");

type PageContent = { title: string; hero: string | null; body: string };
type ProductContent = { name: string; description: string };
type Product = { slug: string; category: ProductCategory; image: string | null; price: number | null; size: string | null; i18n: Partial<Record<Locale, ProductContent>> };

const SERVICES: Array<{ slug: string; page: string; publicPath: string; category: ServiceCategory; durationMin: number; bookable: boolean; images: string[] }> = [
  { slug: "facial", page: "services/face", publicPath: "/services/face", category: "FACE", durationMin: 60, bookable: true, images: ["/media/home/facial.jpg"] },
  { slug: "body", page: "services/body", publicPath: "/services/body", category: "BODY", durationMin: 60, bookable: true, images: ["/media/home/endospheres.jpg"] },
  { slug: "endospheres", page: "instrumental/endosphere", publicPath: "/services/endospheres", category: "DEVICE", durationMin: 45, bookable: true, images: ["/media/files/land/122/262782e883ed1fd7968fd4ed737bb37f.jpeg"] },
  { slug: "laser", page: "services/laser", publicPath: "/services/laser", category: "LASER", durationMin: 30, bookable: true, images: ["/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg"] },
  { slug: "rf", page: "services/mikroneulanrf", publicPath: "/services/mikroneulanrf", category: "DEVICE", durationMin: 60, bookable: true, images: ["/media/files/land/280/21b80358547be97456baf00ac6a98ac9.jpeg"] },
  { slug: "trichology", page: "services/tricho", publicPath: "/services/tricho", category: "HAIR", durationMin: 45, bookable: true, images: ["/media/files/land/303/8b2e9288e47ba7705d700a8d7edb596e.jpeg"] },
  { slug: "brows", page: "services/eyebrows", publicPath: "/services/eyebrows", category: "FACE", durationMin: 30, bookable: true, images: ["/media/home/brows.jpg"] },
  { slug: "packages", page: "services/packages", publicPath: "/services/packages", category: "BODY", durationMin: 90, bookable: true, images: ["/media/home/packages.jpg"] },
  { slug: "injectable", page: "", publicPath: "/services/injectable", category: "INJECTABLE", durationMin: 45, bookable: false, images: [] },
  { slug: "consultation", page: "", publicPath: "/services/consultation", category: "CONSULTATION", durationMin: 30, bookable: false, images: [] },
];

const TECHNOLOGIES = [
  { slug: "endospheres", page: "instrumental/endosphere", publicPath: "/instrumental/endosphere", service: "endospheres", images: ["/media/files/land/122/262782e883ed1fd7968fd4ed737bb37f.jpeg"] },
  { slug: "laser", page: "instrumental/laser", publicPath: "/instrumental/laser", service: "laser", images: ["/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg"] },
  { slug: "rf", page: "instrumental/mikroneulanrf", publicPath: "/instrumental/mikroneulanrf", service: "rf", images: ["/media/files/land/280/21b80358547be97456baf00ac6a98ac9.jpeg"] },
  { slug: "trichology", page: "trichology", publicPath: "/trichology", service: "trichology", images: ["/media/files/land/301/a214b208578ca13b2e31ba04ca3074f1.jpg"] },
];

function readJson<T>(path: string): T { return JSON.parse(readFileSync(join(root, path), "utf8")) as T; }
function excerpt(markdown: string, max = 240) { return markdown.replace(/!\[[^\]]*\]\([^)]*\)|[#*_>`~-]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }

async function syncPages(pages: Record<string, Partial<Record<Locale, PageContent>>>) {
  let count = 0;
  for (const [slug, localized] of Object.entries(pages)) for (const [locale, content] of Object.entries(localized) as [Locale, PageContent][]) {
    const existing = await prisma.contentPage.findUnique({ where: { slug_locale: { slug, locale } }, select: { id: true } });
    if (!existing) await prisma.contentPage.create({ data: { slug, locale, title: content.title, hero: content.hero, body: content.body, status: "PUBLISHED" } });
    else if (force) await prisma.contentPage.update({ where: { id: existing.id }, data: { title: content.title, hero: content.hero, body: content.body, status: "PUBLISHED" } });
    count += !existing || force ? 1 : 0;
  }
  return count;
}

async function syncServices(pages: Record<string, Partial<Record<Locale, PageContent>>>) {
  let count = 0;
  for (const definition of SERVICES) {
    const existing = await prisma.service.findUnique({ where: { slug: definition.slug } });
    const service = existing
      ? await prisma.service.update({ where: { id: existing.id }, data: force ? { publicPath: definition.publicPath, category: definition.category, durationMin: definition.durationMin, bookable: definition.bookable, images: definition.images } : { publicPath: existing.publicPath ?? definition.publicPath, images: existing.images.length ? existing.images : definition.images } })
      : await prisma.service.create({ data: { slug: definition.slug, publicPath: definition.publicPath, category: definition.category, durationMin: definition.durationMin, bookable: definition.bookable, images: definition.images, published: true } });
    if (!definition.page) continue;
    for (const [locale, content] of Object.entries(pages[definition.page] ?? {}) as [Locale, PageContent][]) {
      const localized = await prisma.treatmentContent.findUnique({ where: { serviceId_locale: { serviceId: service.id, locale } }, select: { id: true } });
      const data = { h1: content.title, shortDesc: excerpt(content.body), whatItIs: content.body, suitableFor: [], benefits: [], processSteps: [], safety: "", preCare: "", postCare: "", contraindications: [], sessions: "", results: "", faq: [], seoTitle: content.title, seoDescription: excerpt(content.body, 160), imageAlt: content.title, status: "PUBLISHED" as const };
      if (!localized) await prisma.treatmentContent.create({ data: { serviceId: service.id, locale, ...data } });
      else if (force) await prisma.treatmentContent.update({ where: { id: localized.id }, data });
    }
    count += !existing || force ? 1 : 0;
  }
  return count;
}

async function syncTechnologies(pages: Record<string, Partial<Record<Locale, PageContent>>>) {
  let count = 0;
  for (const definition of TECHNOLOGIES) {
    const related = await prisma.service.findUnique({ where: { slug: definition.service }, select: { id: true } });
    const existing = await prisma.technology.findUnique({ where: { slug: definition.slug } });
    const technology = existing
      ? force ? await prisma.technology.update({ where: { id: existing.id }, data: { publicPath: definition.publicPath, images: definition.images, relatedServiceId: related?.id ?? null } }) : existing
      : await prisma.technology.create({ data: { slug: definition.slug, publicPath: definition.publicPath, images: definition.images, relatedServiceId: related?.id ?? null } });
    for (const [locale, content] of Object.entries(pages[definition.page] ?? {}) as [Locale, PageContent][]) {
      const localized = await prisma.technologyContent.findUnique({ where: { technologyId_locale: { technologyId: technology.id, locale } }, select: { id: true } });
      const data = { name: content.title, specification: null, summary: excerpt(content.body), body: content.body, imageAlt: content.title, seoTitle: content.title, seoDescription: excerpt(content.body, 160), status: "PUBLISHED" as const };
      if (!localized) await prisma.technologyContent.create({ data: { technologyId: technology.id, locale, ...data } });
      else if (force) await prisma.technologyContent.update({ where: { id: localized.id }, data });
    }
    count += !existing || force ? 1 : 0;
  }
  return count;
}

async function syncProducts(products: Product[]) {
  let count = 0;
  for (const product of products) {
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    const saved = existing
      ? force ? await prisma.product.update({ where: { id: existing.id }, data: { category: product.category, size: product.size, price: product.price ?? 0, images: product.image ? [product.image] : [] } }) : existing
      : await prisma.product.create({ data: { slug: product.slug, category: product.category, size: product.size, price: product.price ?? 0, images: product.image ? [product.image] : [], published: true } });
    for (const [locale, content] of Object.entries(product.i18n) as [Locale, ProductContent][]) {
      const localized = await prisma.productContent.findUnique({ where: { productId_locale: { productId: saved.id, locale } }, select: { id: true } });
      const data = { name: content.name, description: content.description, shortDescription: excerpt(content.description), imageAlt: content.name, seoTitle: content.name, seoDescription: excerpt(content.description, 160), status: "PUBLISHED" as const };
      if (!localized) await prisma.productContent.create({ data: { productId: saved.id, locale, ...data } });
      else if (force) await prisma.productContent.update({ where: { id: localized.id }, data });
    }
    count += !existing || force ? 1 : 0;
  }
  return count;
}

async function main() {
  const pages = readJson<Record<string, Partial<Record<Locale, PageContent>>>>("content/generated/pages.json");
  const products = readJson<Product[]>("content/generated/products.json");
  const pageCount = await syncPages(pages);
  const serviceCount = await syncServices(pages);
  const technologyCount = await syncTechnologies(pages);
  const productCount = await syncProducts(products);
  console.log(`${force ? "Force-refreshed" : "Created missing"}: ${pageCount} pages, ${serviceCount} services, ${technologyCount} technologies, ${productCount} products.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

