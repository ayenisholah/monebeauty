"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type {
  Locale,
  ProductCategory,
  ProductKind,
  PublicationStatus,
  ServiceCategory,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  audit,
  authRateLimited,
  createSession,
  currentUser,
  destroySession,
  requireUser,
  requestAuditContext,
  verifyPassword,
} from "@/lib/auth";
import { adminBase, adminHref } from "@/lib/admin-routing";
import type { Locale as AppLocale } from "@/i18n/routing";
import { PUBLIC_PATHS, articlePath, productPath } from "@/lib/public-routes";
import { openSlots } from "@/lib/booking";
import { runExternalApiAttempt } from "@/lib/external-api";
import {
  notifyAppointmentChange,
  notifyAppointmentConfirmation,
  notifyOrderCancellation,
  notifyOrderConfirmation,
  notifyOrderPaymentUpdate,
  retryOutboundMessage,
  sendCustomMessage,
} from "@/lib/notifications";
import { smsSegments } from "@/lib/sms";
import { PROCEDURE_MEDIA_SEED } from "@/content/procedure-media";
import { Prisma } from "@prisma/client";
import {
  isAllowedMediaReference,
  isCloudinaryMediaReference,
} from "@/lib/media-reference";
import { eurosToMinor, minorToEuros, stripeClient } from "@/lib/stripe";

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
const productCategories: ProductCategory[] = [
  "AROSHA_BODY",
  "DIXIDOX_TRICHO",
  "GIFT_CARD",
  "TREATMENT",
  "OTHER",
];
const productKinds: ProductKind[] = [
  "PHYSICAL",
  "GIFT_CARD",
  "TREATMENT_VOUCHER",
];

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
  if (paths.some((path) => !isAllowedMediaReference(path))) {
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
  const context = await requestAuditContext();
  const user = await prisma.user.findUnique({ where: { email } });
  const blocked = await authRateLimited(
    email,
    "admin_login",
    context.ipAddress,
  );
  if (
    blocked ||
    !user ||
    !(await verifyPassword(password, user.passwordHash)) ||
    user.role !== "ADMIN" ||
    user.status !== "ACTIVE"
  ) {
    await audit({
      actor: email || "unknown",
      actorUserId: user?.id,
      actorRole: user?.role,
      action: "admin_login",
      outcome: blocked ? "DENIED" : "FAILURE",
      entity: "User",
      entityId: user?.id,
      ...context,
    });
    redirect(`${adminHref(locale, "login")}?error=invalid`);
  }
  await createSession(user.id);
  await audit({
    actor: user.email,
    actorUserId: user.id,
    actorRole: user.role,
    action: "admin_login",
    entity: "User",
    entityId: user.id,
    ...context,
  });
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
  const procedureMediaKeys = formData
    .getAll("procedureMediaKey")
    .filter((item): item is string => typeof item === "string");
  for (const key of procedureMediaKeys) {
    const definition = PROCEDURE_MEDIA_SEED.find(
      (item) => item.serviceSlug === slug && item.key === key,
    );
    if (!definition) redirect(`${returnTo}?error=validation`);
    const image = value(formData, `procedureImage_${key}`);
    if (!image || !isAllowedMediaReference(image))
      redirect(`${returnTo}?error=media`);
    const selectedDefinition = PROCEDURE_MEDIA_SEED.find(
      (item) => item.image === image,
    );
    const uploadedToCloudinary = isCloudinaryMediaReference(image);
    const selectedSourceUrl = uploadedToCloudinary
      ? image
      : (selectedDefinition?.sourceUrl ??
        (image.startsWith("/media/files/") || image.startsWith("/media/images/")
          ? `https://monebeauty.fi${image.replace(/^\/media/, "")}`
          : "https://monebeauty.fi/"));
    const selectedSourceLicense = uploadedToCloudinary
      ? "CLINIC_UPLOAD"
      : (selectedDefinition?.sourceLicense ?? "CLINIC_ARCHIVE");
    await prisma.procedureMedia.upsert({
      where: { serviceId_key: { serviceId: saved.id, key } },
      update: {
        image,
        sourceUrl: selectedSourceUrl,
        sourceLicense: selectedSourceLicense,
      },
      create: {
        serviceId: saved.id,
        key,
        image,
        identities: definition.identities as Prisma.InputJsonValue,
        sourceUrl: selectedSourceUrl,
        sourceLicense: selectedSourceLicense,
      },
    });
  }
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
  const kind = value(formData, "kind") as ProductKind;
  const serviceId = value(formData, "serviceId") || null;
  const voucherValidityDays = Math.round(
    numeric(formData, "voucherValidityDays"),
  );
  const returnTo = safeReturnPath(formData);
  if (
    !validSlug(slug) ||
    !productCategories.includes(category) ||
    !productKinds.includes(kind) ||
    (kind !== "PHYSICAL" &&
      (voucherValidityDays < 1 || voucherValidityDays > 3650)) ||
    (kind === "TREATMENT_VOUCHER" && !serviceId)
  )
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
          kind,
          serviceId: kind === "TREATMENT_VOUCHER" ? serviceId : null,
          voucherValidityDays: kind === "PHYSICAL" ? null : voucherValidityDays,
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
          kind,
          serviceId: kind === "TREATMENT_VOUCHER" ? serviceId : null,
          voucherValidityDays: kind === "PHYSICAL" ? null : voucherValidityDays,
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
  if (coverImage && !isAllowedMediaReference(coverImage))
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
    prisma.savedAddress.deleteMany({ where: { clientId: id } }),
    prisma.client.update({
      where: { id },
      data: {
        userId: null,
        stripeCustomerId: null,
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
  } else if (intent === "ready") {
    const changed = await prisma.order.updateMany({
      where: {
        id,
        status: "CONFIRMED",
        fulfillmentMethod: "PICKUP",
        paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
      },
      data: { status: "READY_FOR_PICKUP", readyAt: new Date() },
    });
    if (!changed.count) redirect(`${returnTo}?error=invalid_status`);
    await audit({
      actor: user.email,
      action: "order_ready_for_pickup",
      entity: "Order",
      entityId: id,
    });
    await notifyOrderPaymentUpdate(
      order,
      order.locale as AppLocale,
      "ready_for_pickup",
      undefined,
      "ready_for_pickup",
      user.email,
    );
  } else if (intent === "ship") {
    const changed = await prisma.order.updateMany({
      where: {
        id,
        status: "CONFIRMED",
        fulfillmentMethod: "SHIPPING",
        paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
      },
      data: { status: "SHIPPED", shippedAt: new Date() },
    });
    if (!changed.count) redirect(`${returnTo}?error=invalid_status`);
    await audit({
      actor: user.email,
      action: "order_shipped",
      entity: "Order",
      entityId: id,
    });
    await notifyOrderPaymentUpdate(
      order,
      order.locale as AppLocale,
      "shipped",
      undefined,
      "shipped",
      user.email,
    );
  } else if (intent === "fulfill") {
    const changed = await prisma.order.updateMany({
      where: {
        id,
        status: { in: ["CONFIRMED", "READY_FOR_PICKUP", "SHIPPED"] },
      },
      data: { status: "FULFILLED", fulfilledAt: new Date() },
    });
    if (!changed.count) redirect(`${returnTo}?error=invalid_status`);
    await audit({
      actor: user.email,
      action: "order_fulfilled",
      entity: "Order",
      entityId: id,
    });
    await notifyOrderPaymentUpdate(
      order,
      order.locale as AppLocale,
      "fulfilled",
      undefined,
      "fulfilled",
      user.email,
    );
  } else if (intent === "cancel") {
    const reason = value(formData, "reason").slice(0, 500);
    if (reason.length < 3) redirect(`${returnTo}?error=reason_required`);
    const changed = await prisma.order.updateMany({
      where: { id, status: "PENDING", paymentStatus: "UNPAID" },
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

export async function refundOrderAction(formData: FormData) {
  const user = await requireAdmin(formData);
  const id = value(formData, "id");
  const reason = value(formData, "reason").slice(0, 500);
  const target = value(formData, "target") || "order";
  const returnTo = safeReturnPath(formData);
  const requestedMinor = eurosToMinor(value(formData, "amount"));
  if (reason.length < 3 || requestedMinor < 1)
    redirect(`${returnTo}?error=validation`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          vouchers: true,
          refundAllocations: { include: { refund: true } },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      refunds: { include: { allocations: true } },
    },
  });
  const payment = order?.payments.find((attempt) =>
    ["PAID", "PARTIALLY_REFUNDED"].includes(attempt.status),
  );
  if (
    !order ||
    order.source !== "WEBSITE_STRIPE" ||
    !payment?.stripePaymentIntentId
  )
    redirect(`${returnTo}?error=invalid_status`);
  const reservedMinor = order.refunds
    .filter((refund) => ["PENDING", "SUCCEEDED"].includes(refund.status))
    .reduce((sum, refund) => sum + eurosToMinor(refund.amount), 0);
  if (requestedMinor > eurosToMinor(payment.amount) - reservedMinor)
    redirect(`${returnTo}?error=invalid_amount`);

  const allocations: Array<{
    orderItemId?: string;
    amount: string;
    shipping?: boolean;
  }> = [];
  let unallocated = requestedMinor;
  const shippingAllocatedMinor = order.refunds
    .filter((refund) => ["PENDING", "SUCCEEDED"].includes(refund.status))
    .flatMap((refund) => refund.allocations)
    .filter((allocation) => allocation.shipping)
    .reduce((sum, allocation) => sum + eurosToMinor(allocation.amount), 0);
  const allocateItem = (item: (typeof order.items)[number]) => {
    const alreadyAllocated = item.refundAllocations
      .filter((allocation) =>
        ["PENDING", "SUCCEEDED"].includes(allocation.refund.status),
      )
      .reduce((sum, allocation) => sum + eurosToMinor(allocation.amount), 0);
    const lineAvailable =
      eurosToMinor(item.unitPrice) * item.qty - alreadyAllocated;
    const voucherAvailable = item.vouchers.reduce(
      (sum, voucher) => sum + eurosToMinor(voucher.remainingValue),
      0,
    );
    const available =
      item.kind === "PHYSICAL"
        ? lineAvailable
        : Math.min(lineAvailable, voucherAvailable);
    const amount = Math.min(unallocated, available);
    if (amount > 0) {
      if (item.kind === "TREATMENT_VOUCHER" && amount !== available)
        redirect(`${returnTo}?error=treatment_refund_must_be_full`);
      allocations.push({ orderItemId: item.id, amount: minorToEuros(amount) });
      unallocated -= amount;
    }
  };

  if (target === "shipping") {
    const available =
      eurosToMinor(order.shippingAmount) - shippingAllocatedMinor;
    const amount = Math.min(unallocated, available);
    if (amount > 0) {
      allocations.push({ amount: minorToEuros(amount), shipping: true });
      unallocated -= amount;
    }
  } else if (target !== "order") {
    const item = order.items.find((candidate) => candidate.id === target);
    if (item) allocateItem(item);
  } else {
    for (const item of order.items) allocateItem(item);
    if (unallocated > 0) {
      const amount = Math.min(
        unallocated,
        eurosToMinor(order.shippingAmount) - shippingAllocatedMinor,
      );
      if (amount > 0) {
        allocations.push({ amount: minorToEuros(amount), shipping: true });
        unallocated -= amount;
      }
    }
  }
  if (unallocated !== 0 || !allocations.length)
    redirect(`${returnTo}?error=invalid_amount`);

  const refund = await prisma.$transaction(async (tx) => {
    const created = await tx.refund.create({
      data: {
        orderId: order.id,
        paymentAttemptId: payment.id,
        idempotencyKey: `refund:${crypto.randomUUID()}`,
        amount: minorToEuros(requestedMinor),
        currency: order.currency,
        reason,
        actor: user.email,
        allocations: { create: allocations },
      },
    });
    const voucherItemIds = allocations
      .map((allocation) => allocation.orderItemId)
      .filter((itemId): itemId is string => Boolean(itemId));
    if (voucherItemIds.length) {
      await tx.voucher.updateMany({
        where: {
          orderItemId: { in: voucherItemIds },
          status: { in: ["ACTIVE", "PARTIALLY_REDEEMED"] },
        },
        data: { status: "REFUND_PENDING" },
      });
    }
    return created;
  });

  try {
    const { value: stripeRefund } = await runExternalApiAttempt({
      provider: "stripe",
      operation: "refunds.create",
      context: { orderId: order.id, correlationId: refund.idempotencyKey },
      requestMetadata: { amount: requestedMinor, currency: order.currency },
      run: () => stripeClient().refunds.create({
        payment_intent: payment.stripePaymentIntentId!,
        amount: requestedMinor,
        reason: "requested_by_customer",
        metadata: { source: "website", orderId: order.id, refundId: refund.id },
      }, { idempotencyKey: refund.idempotencyKey }),
      responseMetadata: (value) => ({ id: value.id, status: value.status }),
    });
    await prisma.refund.update({
      where: { id: refund.id },
      data: { stripeRefundId: stripeRefund.id },
    });
    await audit({
      actor: user.email,
      action: "order_refund_requested",
      entity: "Order",
      entityId: order.id,
      metadata: { refundId: refund.id, amount: minorToEuros(requestedMinor) },
    });
  } catch (error) {
    await prisma.$transaction([
      prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: "FAILED",
          failureReason:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "stripe_error",
        },
      }),
      prisma.voucher.updateMany({
        where: {
          orderItemId: {
            in: allocations
              .map((allocation) => allocation.orderItemId)
              .filter((itemId): itemId is string => Boolean(itemId)),
          },
          status: "REFUND_PENDING",
        },
        data: { status: "ACTIVE" },
      }),
    ]);
    redirect(`${returnTo}?error=refund_failed`);
  }
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=1`);
}

export async function redeemVoucherAction(formData: FormData) {
  const user = await requireAdmin(formData);
  const code = value(formData, "code").toUpperCase();
  const note = value(formData, "note").slice(0, 500) || null;
  const returnTo = safeReturnPath(formData);
  const voucher = await prisma.voucher.findUnique({ where: { code } });
  if (!voucher) redirect(`${returnTo}?error=voucher_not_found`);
  if (voucher.expiresAt <= new Date()) {
    await prisma.voucher.update({
      where: { id: voucher.id },
      data: { status: "EXPIRED" },
    });
    redirect(`${returnTo}?error=voucher_expired`);
  }
  if (!["ACTIVE", "PARTIALLY_REDEEMED"].includes(voucher.status))
    redirect(`${returnTo}?error=voucher_unavailable`);
  const requested =
    voucher.kind === "TREATMENT_SINGLE_USE"
      ? eurosToMinor(voucher.remainingValue)
      : eurosToMinor(value(formData, "amount"));
  const available = eurosToMinor(voucher.remainingValue);
  if (requested < 1 || requested > available)
    redirect(`${returnTo}?error=invalid_amount`);
  const nextMinor = available - requested;
  await prisma.$transaction([
    prisma.voucherRedemption.create({
      data: {
        voucherId: voucher.id,
        amount: minorToEuros(requested),
        actor: user.email,
        note,
      },
    }),
    prisma.voucher.update({
      where: { id: voucher.id },
      data: {
        remainingValue: minorToEuros(nextMinor),
        status: nextMinor === 0 ? "REDEEMED" : "PARTIALLY_REDEEMED",
        redeemedAt: nextMinor === 0 ? new Date() : null,
      },
    }),
  ]);
  await audit({
    actor: user.email,
    action: "voucher_redeemed",
    entity: "Voucher",
    entityId: voucher.id,
    metadata: {
      amount: minorToEuros(requested),
      remaining: minorToEuros(nextMinor),
    },
  });
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
        roomId: slot.roomId,
        deviceId: slot.deviceId,
        version: { increment: 1 },
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
