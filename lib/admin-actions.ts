"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type {
  Locale,
  ProductCategory,
  PublicationStatus,
  ServiceCategory,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  audit,
  createSession,
  currentUser,
  destroySession,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { adminBase, adminHref } from "@/lib/admin-routing";
import type { Locale as AppLocale } from "@/i18n/routing";
import { PUBLIC_PATHS, articlePath, productPath } from "@/lib/public-routes";
import { openSlots } from "@/lib/booking";
import {
  notifyAppointmentChange,
  notifyAppointmentConfirmation,
  notifyOrderCancellation,
  notifyOrderConfirmation,
  retryOutboundMessage,
  sendCustomMessage,
} from "@/lib/notifications";
import { smsSegments } from "@/lib/sms";

const locales: Locale[] = ["fi", "en", "ru"];
const serviceCategories: ServiceCategory[] = [
  "FACE",
  "BODY",
  "HAIR",
  "INJECTABLE",
  "DEVICE",
  "LASER",
  "CONSULTATION",
];
const productCategories: ProductCategory[] = ["AROSHA_BODY", "DIXIDOX_TRICHO"];

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numeric(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(value(formData, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function status(formData: FormData, key: string): PublicationStatus {
  return value(formData, key) === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
}

function mediaPaths(formData: FormData, key = "images") {
  const paths = value(formData, key)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (
    paths.some((path) => !path.startsWith("/media/") || path.includes(".."))
  ) {
    throw new Error("invalid_media_path");
  }
  return paths;
}

function validSlug(slug: string) {
  return /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/.test(slug);
}

function validPublicPath(path: string) {
  return /^\/[a-z0-9][a-z0-9\-/]*$/.test(path) && !path.includes("..");
}

function safeReturnPath(formData: FormData) {
  const path = value(formData, "returnTo");
  return /^\/(?:en\/|ru\/)?admin(?:\/|$)/.test(path) ? path : "/admin";
}

async function requireAdmin(formData: FormData) {
  const user = await currentUser();
  if (user?.role === "ADMIN") return user;
  const returnTo = safeReturnPath(formData);
  const locale: AppLocale = returnTo.startsWith("/en/")
    ? "en"
    : returnTo.startsWith("/ru/")
      ? "ru"
      : "fi";
  redirect(adminHref(locale, "login"));
}

function localizedPublicPath(locale: Locale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return locale === "fi" ? normalized : `/${locale}${normalized}`;
}

function revalidatePublic(publicPath?: string | null) {
  if (!publicPath) return;
  for (const locale of locales)
    revalidatePath(localizedPublicPath(locale, publicPath));
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/ru");
}

async function mutationAudit(action: string, entity: string, entityId: string) {
  const user = await requireUser(["ADMIN"]);
  await audit({ actor: user.email, action, entity, entityId });
  return user;
}

export async function adminLoginAction(formData: FormData) {
  const locale = (value(formData, "locale") || "fi") as AppLocale;
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    !(await verifyPassword(password, user.passwordHash)) ||
    user.role === "CLIENT"
  ) {
    redirect(`${adminHref(locale, "login")}?error=invalid`);
  }
  await createSession(user.id);
  if (user.role === "STAFF")
    redirect(localizedPublicPath(locale, PUBLIC_PATHS.staff));
  redirect(adminBase(locale));
}

export async function adminLogoutAction(formData: FormData) {
  const rawLocale = value(formData, "locale");
  const locale: AppLocale =
    rawLocale === "en" || rawLocale === "ru" ? rawLocale : "fi";
  await destroySession();
  redirect(adminHref(locale, "login"));
}

export async function saveServiceAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const slug = value(formData, "slug");
  const publicPath = value(formData, "publicPath");
  const category = value(formData, "category") as ServiceCategory;
  const returnTo = safeReturnPath(formData);
  if (
    !validSlug(slug) ||
    !validPublicPath(publicPath) ||
    !serviceCategories.includes(category)
  ) {
    redirect(`${returnTo}?error=validation`);
  }
  let images: string[];
  try {
    images = mediaPaths(formData);
  } catch {
    redirect(`${returnTo}?error=media`);
  }
  const data = {
    slug,
    publicPath,
    category,
    durationMin: Math.max(5, Math.round(numeric(formData, "durationMin", 60))),
    bookable: formData.get("bookable") === "on",
    priceFrom: value(formData, "priceFrom")
      ? numeric(formData, "priceFrom")
      : null,
    images,
    order: Math.round(numeric(formData, "order")),
    published: true,
    archivedAt: formData.get("archived") === "on" ? new Date() : null,
  };
  const saved = id
    ? await prisma.service.update({ where: { id }, data })
    : await prisma.service.create({ data });
  for (const locale of locales) {
    const h1 = value(formData, `h1_${locale}`);
    const shortDesc = value(formData, `shortDesc_${locale}`);
    const body = value(formData, `body_${locale}`);
    if (!h1 && !shortDesc && !body) continue;
    await prisma.treatmentContent.upsert({
      where: { serviceId_locale: { serviceId: saved.id, locale } },
      update: {
        h1: h1 || slug,
        shortDesc,
        whatItIs: body,
        imageAlt: value(formData, `imageAlt_${locale}`) || null,
        seoTitle: value(formData, `seoTitle_${locale}`) || h1 || slug,
        seoDescription:
          value(formData, `seoDescription_${locale}`) || shortDesc,
        status: status(formData, `status_${locale}`),
      },
      create: {
        serviceId: saved.id,
        locale,
        h1: h1 || slug,
        shortDesc,
        whatItIs: body,
        suitableFor: [],
        benefits: [],
        processSteps: [],
        safety: "",
        preCare: "",
        postCare: "",
        contraindications: [],
        sessions: "",
        results: "",
        faq: [],
        imageAlt: value(formData, `imageAlt_${locale}`) || null,
        seoTitle: value(formData, `seoTitle_${locale}`) || h1 || slug,
        seoDescription:
          value(formData, `seoDescription_${locale}`) || shortDesc,
        status: status(formData, `status_${locale}`),
      },
    });
  }
  await mutationAudit(
    id ? "service_updated" : "service_created",
    "Service",
    saved.id,
  );
  revalidatePublic(publicPath);
  revalidatePath(returnTo);
  if (!id) redirect(`${returnTo.replace(/\/uusi$/, "")}/${saved.id}?saved=1`);
}

export async function removeServiceAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const returnTo = safeReturnPath(formData);
  const row = await prisma.service.findUnique({
    where: { id },
    select: {
      publicPath: true,
      _count: {
        select: { appointments: true, pricing: true, technologies: true },
      },
    },
  });
  if (!row) return;
  const referenced = Object.values(row._count).some((count) => count > 0);
  if (referenced)
    await prisma.service.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  else await prisma.service.delete({ where: { id } });
  await mutationAudit(
    referenced ? "service_archived_guarded" : "service_deleted",
    "Service",
    id,
  );
  revalidatePublic(row.publicPath);
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function saveTechnologyAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const slug = value(formData, "slug");
  const publicPath = value(formData, "publicPath");
  const returnTo = safeReturnPath(formData);
  if (!validSlug(slug) || !validPublicPath(publicPath))
    redirect(`${returnTo}?error=validation`);
  let images: string[];
  try {
    images = mediaPaths(formData);
  } catch {
    redirect(`${returnTo}?error=media`);
  }
  const saved = id
    ? await prisma.technology.update({
        where: { id },
        data: {
          slug,
          publicPath,
          images,
          order: Math.round(numeric(formData, "order")),
          relatedServiceId: value(formData, "relatedServiceId") || null,
          archivedAt: formData.get("archived") === "on" ? new Date() : null,
        },
      })
    : await prisma.technology.create({
        data: {
          slug,
          publicPath,
          images,
          order: Math.round(numeric(formData, "order")),
          relatedServiceId: value(formData, "relatedServiceId") || null,
        },
      });
  for (const locale of locales) {
    const name = value(formData, `name_${locale}`);
    const body = value(formData, `body_${locale}`);
    const summary = value(formData, `summary_${locale}`);
    if (!name && !body && !summary) continue;
    await prisma.technologyContent.upsert({
      where: { technologyId_locale: { technologyId: saved.id, locale } },
      update: {
        name: name || slug,
        specification: value(formData, `specification_${locale}`) || null,
        summary,
        body,
        imageAlt: value(formData, `imageAlt_${locale}`) || null,
        seoTitle: value(formData, `seoTitle_${locale}`) || null,
        seoDescription: value(formData, `seoDescription_${locale}`) || null,
        status: status(formData, `status_${locale}`),
      },
      create: {
        technologyId: saved.id,
        locale,
        name: name || slug,
        specification: value(formData, `specification_${locale}`) || null,
        summary,
        body,
        imageAlt: value(formData, `imageAlt_${locale}`) || null,
        seoTitle: value(formData, `seoTitle_${locale}`) || null,
        seoDescription: value(formData, `seoDescription_${locale}`) || null,
        status: status(formData, `status_${locale}`),
      },
    });
  }
  await mutationAudit(
    id ? "technology_updated" : "technology_created",
    "Technology",
    saved.id,
  );
  revalidatePublic(publicPath);
  revalidatePath(returnTo);
  if (!id) redirect(`${returnTo.replace(/\/uusi$/, "")}/${saved.id}?saved=1`);
}

export async function removeTechnologyAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const returnTo = safeReturnPath(formData);
  const row = await prisma.technology.findUnique({
    where: { id },
    select: { publicPath: true },
  });
  if (!row) return;
  await prisma.technology.delete({ where: { id } });
  await mutationAudit("technology_deleted", "Technology", id);
  revalidatePublic(row.publicPath);
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function saveProductAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const slug = value(formData, "slug");
  const category = value(formData, "category") as ProductCategory;
  const returnTo = safeReturnPath(formData);
  if (!validSlug(slug) || !productCategories.includes(category))
    redirect(`${returnTo}?error=validation`);
  let images: string[];
  try {
    images = mediaPaths(formData);
  } catch {
    redirect(`${returnTo}?error=media`);
  }
  const saved = id
    ? await prisma.product.update({
        where: { id },
        data: {
          slug,
          category,
          size: value(formData, "size") || null,
          price: Math.max(0, numeric(formData, "price")),
          currency: value(formData, "currency") || "EUR",
          images,
          order: Math.round(numeric(formData, "order")),
          published: true,
          archivedAt: formData.get("archived") === "on" ? new Date() : null,
        },
      })
    : await prisma.product.create({
        data: {
          slug,
          category,
          size: value(formData, "size") || null,
          price: Math.max(0, numeric(formData, "price")),
          currency: value(formData, "currency") || "EUR",
          images,
          order: Math.round(numeric(formData, "order")),
          published: true,
        },
      });
  for (const locale of locales) {
    const name = value(formData, `name_${locale}`);
    const description = value(formData, `description_${locale}`);
    if (!name && !description) continue;
    await prisma.productContent.upsert({
      where: { productId_locale: { productId: saved.id, locale } },
      update: {
        name: name || slug,
        description,
        shortDescription: value(formData, `shortDescription_${locale}`) || null,
        imageAlt: value(formData, `imageAlt_${locale}`) || null,
        seoTitle: value(formData, `seoTitle_${locale}`) || null,
        seoDescription: value(formData, `seoDescription_${locale}`) || null,
        status: status(formData, `status_${locale}`),
      },
      create: {
        productId: saved.id,
        locale,
        name: name || slug,
        description,
        shortDescription: value(formData, `shortDescription_${locale}`) || null,
        imageAlt: value(formData, `imageAlt_${locale}`) || null,
        seoTitle: value(formData, `seoTitle_${locale}`) || null,
        seoDescription: value(formData, `seoDescription_${locale}`) || null,
        status: status(formData, `status_${locale}`),
      },
    });
  }
  await mutationAudit(
    id ? "product_updated" : "product_created",
    "Product",
    saved.id,
  );
  revalidatePublic(PUBLIC_PATHS.shop);
  revalidatePublic(productPath(slug));
  revalidatePath(returnTo);
  if (!id) redirect(`${returnTo.replace(/\/uusi$/, "")}/${saved.id}?saved=1`);
}

export async function removeProductAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const returnTo = safeReturnPath(formData);
  const row = await prisma.product.findUnique({
    where: { id },
    select: { slug: true, _count: { select: { orderItems: true } } },
  });
  if (!row) return;
  if (row._count.orderItems > 0) {
    await prisma.product.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await mutationAudit("product_archived_guarded", "Product", id);
  } else {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
    await mutationAudit("product_deleted", "Product", id);
  }
  revalidatePublic(PUBLIC_PATHS.shop);
  revalidatePublic(productPath(row.slug));
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function saveContentPageAction(formData: FormData) {
  await requireAdmin(formData);
  const originalSlug = value(formData, "originalSlug");
  const slug = value(formData, "slug").replace(/^\/+|\/+$/g, "");
  const returnTo = safeReturnPath(formData);
  if (!/^[a-z0-9][a-z0-9\-/]*$/.test(slug) || slug.includes("..")) {
    redirect(`${returnTo}?error=validation`);
  }
  if (originalSlug && originalSlug !== slug) {
    await prisma.contentPage.updateMany({
      where: { slug: originalSlug },
      data: { slug },
    });
  }
  const ids: string[] = [];
  for (const locale of locales) {
    const title = value(formData, `title_${locale}`);
    const body = value(formData, `body_${locale}`);
    if (!title && !body) continue;
    const row = await prisma.contentPage.upsert({
      where: { slug_locale: { slug, locale } },
      update: {
        title: title || slug,
        hero: value(formData, `hero_${locale}`) || null,
        body,
        seoTitle: value(formData, `seoTitle_${locale}`) || null,
        seoDescription: value(formData, `seoDescription_${locale}`) || null,
        status: status(formData, `status_${locale}`),
      },
      create: {
        slug,
        locale,
        title: title || slug,
        hero: value(formData, `hero_${locale}`) || null,
        body,
        seoTitle: value(formData, `seoTitle_${locale}`) || null,
        seoDescription: value(formData, `seoDescription_${locale}`) || null,
        status: status(formData, `status_${locale}`),
      },
    });
    ids.push(row.id);
  }
  const entityId = ids[0] ?? slug;
  await mutationAudit(
    originalSlug ? "content_updated" : "content_created",
    "ContentPage",
    entityId,
  );
  revalidatePublic(`/${slug}`);
  revalidatePath(returnTo);
  if (!originalSlug)
    redirect(
      `${returnTo.replace(/\/uusi$/, "")}/${encodeURIComponent(slug)}?saved=1`,
    );
}

export async function removeContentPageAction(formData: FormData) {
  await requireAdmin(formData);
  const slug = value(formData, "slug");
  const returnTo = safeReturnPath(formData);
  await prisma.contentPage.deleteMany({ where: { slug } });
  await mutationAudit("content_deleted", "ContentPage", slug);
  revalidatePublic(`/${slug}`);
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function savePricingAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const returnTo = safeReturnPath(formData);
  const categoryRaw = value(formData, "category") as ServiceCategory;
  const category = serviceCategories.includes(categoryRaw) ? categoryRaw : null;
  const saved = id
    ? await prisma.pricingItem.update({
        where: { id },
        data: {
          serviceId: value(formData, "serviceId") || null,
          category,
          price: Math.max(0, numeric(formData, "price")),
          order: Math.round(numeric(formData, "order")),
          archivedAt: formData.get("archived") === "on" ? new Date() : null,
        },
      })
    : await prisma.pricingItem.create({
        data: {
          serviceId: value(formData, "serviceId") || null,
          category,
          label:
            value(formData, "label_fi") ||
            value(formData, "label_en") ||
            "Price",
          unit: value(formData, "unit_fi") || null,
          price: Math.max(0, numeric(formData, "price")),
          order: Math.round(numeric(formData, "order")),
        },
      });
  for (const locale of locales) {
    const label = value(formData, `label_${locale}`);
    if (!label) continue;
    await prisma.pricingContent.upsert({
      where: { pricingItemId_locale: { pricingItemId: saved.id, locale } },
      update: {
        label,
        unit: value(formData, `unit_${locale}`) || null,
        status: status(formData, `status_${locale}`),
      },
      create: {
        pricingItemId: saved.id,
        locale,
        label,
        unit: value(formData, `unit_${locale}`) || null,
        status: status(formData, `status_${locale}`),
      },
    });
  }
  await mutationAudit(
    id ? "pricing_updated" : "pricing_created",
    "PricingItem",
    saved.id,
  );
  revalidatePublic(PUBLIC_PATHS.pricing);
  revalidatePath(returnTo);
  if (!id) redirect(`${returnTo.replace(/\/uusi$/, "")}/${saved.id}?saved=1`);
}

export async function removePricingAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const returnTo = safeReturnPath(formData);
  await prisma.pricingItem.delete({ where: { id } });
  await mutationAudit("pricing_deleted", "PricingItem", id);
  revalidatePublic(PUBLIC_PATHS.pricing);
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function saveArticleAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const slug = value(formData, "slug");
  const returnTo = safeReturnPath(formData);
  if (!validSlug(slug)) redirect(`${returnTo}?error=validation`);
  const coverImage = value(formData, "coverImage");
  if (
    coverImage &&
    (!coverImage.startsWith("/media/") || coverImage.includes(".."))
  )
    redirect(`${returnTo}?error=media`);
  const saved = id
    ? await prisma.article.update({
        where: { id },
        data: {
          slug,
          coverImage: coverImage || null,
          coverAlt: value(formData, "coverAlt") || null,
          order: Math.round(numeric(formData, "order")),
          archivedAt: formData.get("archived") === "on" ? new Date() : null,
        },
      })
    : await prisma.article.create({
        data: {
          slug,
          coverImage: coverImage || null,
          coverAlt: value(formData, "coverAlt") || null,
          order: Math.round(numeric(formData, "order")),
        },
      });
  let hasPublished = false;
  for (const locale of locales) {
    const title = value(formData, `title_${locale}`);
    const body = value(formData, `body_${locale}`);
    if (!title && !body) continue;
    const publication = status(formData, `status_${locale}`);
    hasPublished ||= publication === "PUBLISHED";
    await prisma.articleContent.upsert({
      where: { articleId_locale: { articleId: saved.id, locale } },
      update: {
        title: title || slug,
        excerpt: value(formData, `excerpt_${locale}`) || null,
        body,
        seoTitle: value(formData, `seoTitle_${locale}`) || null,
        seoDescription: value(formData, `seoDescription_${locale}`) || null,
        status: publication,
      },
      create: {
        articleId: saved.id,
        locale,
        title: title || slug,
        excerpt: value(formData, `excerpt_${locale}`) || null,
        body,
        seoTitle: value(formData, `seoTitle_${locale}`) || null,
        seoDescription: value(formData, `seoDescription_${locale}`) || null,
        status: publication,
      },
    });
  }
  await prisma.article.update({
    where: { id: saved.id },
    data: {
      published: hasPublished,
      publishedAt: hasPublished ? new Date() : null,
    },
  });
  await mutationAudit(
    id ? "article_updated" : "article_created",
    "Article",
    saved.id,
  );
  revalidatePublic(articlePath(slug));
  revalidatePublic(PUBLIC_PATHS.articles);
  revalidatePath(returnTo);
  if (!id) redirect(`${returnTo.replace(/\/uusi$/, "")}/${saved.id}?saved=1`);
}

export async function removeArticleAction(formData: FormData) {
  await requireAdmin(formData);
  const id = value(formData, "id");
  const returnTo = safeReturnPath(formData);
  const row = await prisma.article.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!row) return;
  await prisma.article.delete({ where: { id } });
  await mutationAudit("article_deleted", "Article", id);
  revalidatePublic(articlePath(row.slug));
  revalidatePublic(PUBLIC_PATHS.articles);
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function saveClientAction(formData: FormData) {
  const id = value(formData, "id");
  const returnTo = safeReturnPath(formData);
  const user = await requireAdmin(formData);
  await prisma.client.update({
    where: { id },
    data: {
      fullName: value(formData, "fullName"),
      phone: value(formData, "phone"),
      email: value(formData, "email").toLowerCase(),
      notes: value(formData, "notes") || null,
      contraindications: value(formData, "contraindications") || null,
      consentMarketing: formData.get("consentMarketing") === "on",
      archivedAt: formData.get("archived") === "on" ? new Date() : null,
    },
  });
  await audit({
    actor: user.email,
    action: "client_updated_sensitive",
    entity: "Client",
    entityId: id,
  });
  revalidatePath(returnTo);
}

export async function anonymizeClientAction(formData: FormData) {
  const id = value(formData, "id");
  const returnTo = safeReturnPath(formData);
  const user = await requireAdmin(formData);
  await prisma.$transaction([
    prisma.chatSession.updateMany({
      where: { clientId: id },
      data: {
        clientId: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        messages: [],
        anonymizedAt: new Date(),
      },
    }),
    prisma.order.updateMany({
      where: { clientId: id },
      data: {
        email: `anonymized-${id}@privacy.local`,
        phone: null,
        notes: null,
        cancellationReason: null,
      },
    }),
    prisma.appointment.updateMany({
      where: { clientId: id },
      data: { notes: null, cancellationReason: null },
    }),
    prisma.appointmentEvent.updateMany({
      where: { appointment: { clientId: id } },
      data: { reason: null, actor: "privacy-anonymized" },
    }),
    prisma.outboundMessage.updateMany({
      where: {
        OR: [{ order: { clientId: id } }, { appointment: { clientId: id } }],
      },
      data: {
        recipient: "privacy-anonymized",
        subject: null,
        body: "[redacted]",
        html: null,
        actor: "privacy-anonymized",
      },
    }),
    prisma.cart.deleteMany({ where: { clientId: id } }),
    prisma.client.update({
      where: { id },
      data: {
        userId: null,
        fullName: "Anonymized client",
        phone: `anonymized-${id}`,
        email: `anonymized-${id}@privacy.local`,
        notes: null,
        contraindications: null,
        consentGdpr: false,
        consentMarketing: false,
        archivedAt: new Date(),
      },
    }),
  ]);
  await audit({
    actor: user.email,
    action: "client_anonymized",
    entity: "Client",
    entityId: id,
  });
  revalidatePath(returnTo);
}

export async function updateChatAction(formData: FormData) {
  const id = value(formData, "id");
  const intent = value(formData, "intent");
  const returnTo = safeReturnPath(formData);
  const user = await requireAdmin(formData);
  const data =
    intent === "resolve"
      ? { status: "RESOLVED" as const }
      : intent === "reopen"
        ? { status: "OPEN" as const, archivedAt: null }
        : intent === "archive"
          ? { archivedAt: new Date() }
          : {
              contactName: null,
              contactEmail: null,
              contactPhone: null,
              clientId: null,
              messages: [],
              anonymizedAt: new Date(),
            };
  await prisma.chatSession.update({ where: { id }, data });
  await audit({
    actor: user.email,
    action: `chat_${intent}`,
    entity: "ChatSession",
    entityId: id,
  });
  revalidatePath(returnTo);
}

const appointmentInclude = {
  client: { select: { fullName: true, email: true, phone: true } },
  service: { select: { slug: true } },
} as const;

const orderInclude = {
  items: true,
  client: { select: { fullName: true, email: true, phone: true } },
} as const;

export async function updateOrderAction(formData: FormData) {
  const user = await requireAdmin(formData);
  const id = value(formData, "id");
  const intent = value(formData, "intent");
  const returnTo = safeReturnPath(formData);
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });
  if (!order) redirect(`${returnTo}?error=not_found`);

  if (intent === "confirm") {
    const changed = await prisma.order.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    if (!changed.count) redirect(`${returnTo}?error=invalid_status`);
    await audit({
      actor: user.email,
      action: "order_confirmed",
      entity: "Order",
      entityId: id,
    });
    await notifyOrderConfirmation(order, order.locale as AppLocale, user.email);
  } else if (intent === "fulfill") {
    const changed = await prisma.order.updateMany({
      where: { id, status: { in: ["CONFIRMED", "PAID"] } },
      data: { status: "FULFILLED", fulfilledAt: new Date() },
    });
    if (!changed.count) redirect(`${returnTo}?error=invalid_status`);
    await audit({
      actor: user.email,
      action: "order_fulfilled",
      entity: "Order",
      entityId: id,
    });
  } else if (intent === "cancel") {
    const reason = value(formData, "reason").slice(0, 500);
    if (reason.length < 3) redirect(`${returnTo}?error=reason_required`);
    const changed = await prisma.order.updateMany({
      where: { id, status: { in: ["PENDING", "CONFIRMED", "PAID"] } },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
    if (!changed.count) redirect(`${returnTo}?error=invalid_status`);
    await audit({
      actor: user.email,
      action: "order_cancelled",
      entity: "Order",
      entityId: id,
    });
    await notifyOrderCancellation(
      order,
      order.locale as AppLocale,
      reason,
      user.email,
    );
  } else {
    redirect(`${returnTo}?error=invalid_action`);
  }
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=1`);
}

export async function updateAppointmentAction(formData: FormData) {
  const user = await requireAdmin(formData);
  const id = value(formData, "id");
  const intent = value(formData, "intent");
  const returnTo = safeReturnPath(formData);
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
  if (!appointment) redirect(`${returnTo}?error=not_found`);

  if (intent === "confirm") {
    const changed = await prisma.appointment.updateMany({
      where: { id, status: { in: ["BOOKED", "RESCHEDULED"] } },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    if (!changed.count) redirect(`${returnTo}?error=invalid_status`);
    await prisma.appointmentEvent.create({
      data: {
        appointmentId: id,
        kind: "CONFIRMED",
        actor: user.email,
        previousStatus: appointment.status,
        nextStatus: "CONFIRMED",
      },
    });
    await audit({
      actor: user.email,
      action: "appointment_confirmed",
      entity: "Appointment",
      entityId: id,
    });
    await notifyAppointmentConfirmation(
      appointment,
      appointment.locale as AppLocale,
      user.email,
    );
  } else if (intent === "complete") {
    if (appointment.status !== "CONFIRMED" || appointment.end > new Date())
      redirect(`${returnTo}?error=invalid_status`);
    await prisma.appointment.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.appointmentEvent.create({
      data: {
        appointmentId: id,
        kind: "COMPLETED",
        actor: user.email,
        previousStatus: appointment.status,
        nextStatus: "COMPLETED",
      },
    });
    await audit({
      actor: user.email,
      action: "appointment_completed",
      entity: "Appointment",
      entityId: id,
    });
  } else if (intent === "cancel") {
    const reason = value(formData, "reason").slice(0, 500);
    if (reason.length < 3) redirect(`${returnTo}?error=reason_required`);
    const changed = await prisma.appointment.updateMany({
      where: { id, status: { in: ["BOOKED", "CONFIRMED", "RESCHEDULED"] } },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
    if (!changed.count) redirect(`${returnTo}?error=invalid_status`);
    await prisma.appointmentEvent.create({
      data: {
        appointmentId: id,
        kind: "CANCELLED",
        actor: user.email,
        previousStatus: appointment.status,
        nextStatus: "CANCELLED",
        reason,
      },
    });
    await audit({
      actor: user.email,
      action: "appointment_cancelled",
      entity: "Appointment",
      entityId: id,
    });
    await notifyAppointmentChange(
      appointment,
      "cancellation",
      appointment.locale as AppLocale,
      reason,
      user.email,
    );
  } else if (intent === "reschedule") {
    if (!["BOOKED", "CONFIRMED", "RESCHEDULED"].includes(appointment.status))
      redirect(`${returnTo}?error=invalid_status`);
    const start = value(formData, "start");
    if (!start || Number.isNaN(Date.parse(start)))
      redirect(`${returnTo}?error=invalid_time`);
    const available = await openSlots({
      dateStr: start.slice(0, 10),
      serviceKey: appointment.service.slug,
    });
    const slot = available.find((candidate) => candidate.start === start);
    if (!slot) redirect(`${returnTo}?error=slot_taken`);
    const overlap = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        practitionerId: slot.practitionerId,
        status: { not: "CANCELLED" },
        start: { lt: new Date(slot.end) },
        end: { gt: new Date(slot.start) },
      },
      select: { id: true },
    });
    if (overlap) redirect(`${returnTo}?error=slot_taken`);
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        start: new Date(slot.start),
        end: new Date(slot.end),
        practitionerId: slot.practitionerId,
        status: "RESCHEDULED",
        confirmedAt: null,
      },
      include: appointmentInclude,
    });
    await prisma.appointmentEvent.create({
      data: {
        appointmentId: id,
        kind: "RESCHEDULED",
        actor: user.email,
        previousStatus: appointment.status,
        nextStatus: updated.status,
        previousStart: appointment.start,
        previousEnd: appointment.end,
        nextStart: updated.start,
        nextEnd: updated.end,
      },
    });
    await audit({
      actor: user.email,
      action: "appointment_rescheduled",
      entity: "Appointment",
      entityId: id,
    });
    await notifyAppointmentChange(
      updated,
      "rescheduled",
      updated.locale as AppLocale,
      null,
      user.email,
    );
  } else {
    redirect(`${returnTo}?error=invalid_action`);
  }
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=1`);
}

export async function sendAdminCommunicationAction(formData: FormData) {
  const user = await requireAdmin(formData);
  const entity = value(formData, "entity");
  const id = value(formData, "id");
  const channel = value(formData, "channel") === "SMS" ? "SMS" : "EMAIL";
  const subject = value(formData, "subject").slice(0, 160);
  const body = value(formData, "body").slice(0, 5000);
  const returnTo = safeReturnPath(formData);
  if (!body || (channel === "EMAIL" && !subject))
    redirect(`${returnTo}?error=validation`);
  if (channel === "SMS" && smsSegments(body).segments > 3)
    redirect(`${returnTo}?error=sms_too_long`);

  if (entity === "Order") {
    const row = await prisma.order.findUnique({
      where: { id },
      select: { email: true, phone: true, locale: true },
    });
    if (!row) redirect(`${returnTo}?error=not_found`);
    await sendCustomMessage({
      parent: { orderId: id },
      channel,
      locale: row.locale as AppLocale,
      recipient: channel === "EMAIL" ? row.email : (row.phone ?? ""),
      subject,
      body,
      actor: user.email,
      reference: id.slice(-8).toUpperCase(),
    });
  } else if (entity === "Appointment") {
    const row = await prisma.appointment.findUnique({
      where: { id },
      select: {
        locale: true,
        client: { select: { email: true, phone: true } },
      },
    });
    if (!row) redirect(`${returnTo}?error=not_found`);
    await sendCustomMessage({
      parent: { appointmentId: id },
      channel,
      locale: row.locale as AppLocale,
      recipient: channel === "EMAIL" ? row.client.email : row.client.phone,
      subject,
      body,
      actor: user.email,
      reference: id.slice(-8).toUpperCase(),
    });
  } else redirect(`${returnTo}?error=invalid_action`);
  await audit({
    actor: user.email,
    action: `custom_${channel.toLowerCase()}_sent`,
    entity,
    entityId: id,
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=1`);
}

export async function retryCommunicationAction(formData: FormData) {
  const user = await requireAdmin(formData);
  const id = value(formData, "messageId");
  const returnTo = safeReturnPath(formData);
  try {
    await retryOutboundMessage(id, user.email);
  } catch {
    redirect(`${returnTo}?error=retry_failed`);
  }
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=1`);
}

export async function redirectAuthenticatedAdmin(locale: AppLocale) {
  const user = await currentUser();
  if (user?.role === "ADMIN") redirect(adminBase(locale));
}
