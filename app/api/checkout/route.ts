import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeQty } from "@/lib/cart";
import { routing, type Locale } from "@/i18n/routing";
import { normalizeInternationalPhone } from "@/lib/phone";
import { localizedPath, siteUrl } from "@/lib/seo";
import { orderPath, PUBLIC_PATHS } from "@/lib/public-routes";
import {
  eurosToMinor,
  minorToEuros,
  stripeClient,
  stripeShippingRateId,
} from "@/lib/stripe";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function absoluteImage(path: string) {
  if (/^https:\/\//i.test(path)) return path;
  const origin = siteUrl();
  if (!origin.startsWith("https://")) return undefined;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const fullName = String(payload.fullName ?? "")
    .trim()
    .slice(0, 180);
  const phone = normalizeInternationalPhone(String(payload.phone ?? ""));
  const email = String(payload.email ?? "")
    .trim()
    .toLowerCase();
  const notes = payload.notes ? String(payload.notes).slice(0, 2000) : null;
  const locale = routing.locales.includes(payload.locale as Locale)
    ? (payload.locale as Locale)
    : routing.defaultLocale;
  const consentGdpr = payload.consentGdpr === true;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const requestedFulfillment = String(
    payload.fulfillmentMethod ?? "",
  ).toUpperCase();

  if (!fullName) return bad("name_required");
  if (!phone) return bad("phone_invalid");
  if (!EMAIL_RE.test(email)) return bad("email_required");
  if (!consentGdpr) return bad("consent_required");

  const qtyBySlug = new Map<string, number>();
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const slug = String((item as { slug?: unknown }).slug ?? "");
    if (!slug) continue;
    const qty = normalizeQty(Number((item as { qty?: unknown }).qty));
    qtyBySlug.set(slug, normalizeQty((qtyBySlug.get(slug) ?? 0) + qty));
  }
  if (!qtyBySlug.size) return bad("empty_cart");

  const products = await prisma.product.findMany({
    where: {
      slug: { in: [...qtyBySlug.keys()] },
      published: true,
      archivedAt: null,
    },
    include: {
      contents: { where: { locale, status: "PUBLISHED" }, take: 1 },
    },
  });
  if (products.length !== qtyBySlug.size) return bad("product_unavailable");
  if (products.some((product) => product.currency.toUpperCase() !== "EUR")) {
    return bad("currency_unavailable");
  }
  if (products.some((product) => !product.contents[0])) {
    return bad("product_unavailable");
  }

  const hasPhysical = products.some((product) => product.kind === "PHYSICAL");
  const fulfillmentMethod = hasPhysical
    ? requestedFulfillment === "SHIPPING"
      ? "SHIPPING"
      : requestedFulfillment === "PICKUP"
        ? "PICKUP"
        : null
    : "DIGITAL";
  if (!fulfillmentMethod) return bad("fulfillment_required");

  const lineItems = products.map((product) => ({
    quantity: qtyBySlug.get(product.slug)!,
    price_data: {
      currency: "eur",
      unit_amount: eurosToMinor(product.price),
      product_data: {
        name: product.contents[0].name,
        ...(product.contents[0].shortDescription
          ? { description: product.contents[0].shortDescription.slice(0, 500) }
          : {}),
        ...(() => {
          const image = product.images[0] && absoluteImage(product.images[0]);
          return image ? { images: [image] } : {};
        })(),
        metadata: { productId: product.id, productKind: product.kind },
      },
    },
  }));
  const subtotalMinor = lineItems.reduce(
    (sum, item) =>
      sum +
      Number(item.price_data?.unit_amount ?? 0) * Number(item.quantity ?? 1),
    0,
  );

  let orderId: string | undefined;
  try {
    const existing = await prisma.client.findFirst({ where: { email } });
    const client = existing
      ? await prisma.client.update({
          where: { id: existing.id },
          data: { fullName, phone, consentGdpr: true },
        })
      : await prisma.client.create({
          data: { fullName, phone, email, consentGdpr: true },
        });

    const order = await prisma.order.create({
      data: {
        clientId: client.id,
        locale,
        source: "WEBSITE_STRIPE",
        paymentStatus: "UNPAID",
        fulfillmentMethod,
        subtotal: minorToEuros(subtotalMinor),
        total: minorToEuros(subtotalMinor),
        currency: "EUR",
        email,
        phone,
        notes,
        consentGdpr: true,
        items: {
          create: products.map((product) => ({
            productId: product.id,
            name: product.contents[0].name,
            unitPrice: product.price,
            qty: qtyBySlug.get(product.slug)!,
            kind: product.kind,
            voucherValidityDays: product.voucherValidityDays,
          })),
        },
        payments: {
          create: {
            idempotencyKey: `checkout:${crypto.randomUUID()}`,
            amount: minorToEuros(subtotalMinor),
            currency: "EUR",
          },
        },
      },
      include: { payments: true },
    });
    orderId = order.id;
    const attempt = order.payments[0];
    const successUrl = `${siteUrl()}${localizedPath(orderPath(order.id), locale)}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl()}${localizedPath(PUBLIC_PATHS.checkout, locale)}?payment=cancelled`;
    const metadata = {
      source: "website",
      orderId: order.id,
      locale,
      fulfillmentMethod,
    };
    const session = await stripeClient().checkout.sessions.create(
      {
        mode: "payment",
        locale,
        client_reference_id: order.id,
        customer_email: email,
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        payment_intent_data: { metadata },
        ...(fulfillmentMethod === "SHIPPING"
          ? {
              shipping_address_collection: { allowed_countries: ["FI"] },
              shipping_options: [{ shipping_rate: stripeShippingRateId() }],
            }
          : {}),
      },
      { idempotencyKey: attempt.idempotencyKey },
    );
    if (!session.url || session.amount_total == null) {
      throw new Error("stripe_session_incomplete");
    }
    await prisma.$transaction([
      prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "PROCESSING",
          stripeCheckoutSessionId: session.id,
          amount: minorToEuros(session.amount_total),
          expiresAt: new Date(session.expires_at * 1000),
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PROCESSING",
          total: minorToEuros(session.amount_total),
          shippingAmount: minorToEuros(
            session.total_details?.amount_shipping ?? 0,
          ),
        },
      }),
      prisma.consent.create({
        data: { clientId: client.id, type: "gdpr_checkout", granted: true },
      }),
    ]);
    return NextResponse.json({ orderId: order.id, checkoutUrl: session.url });
  } catch {
    if (orderId) {
      await prisma.order
        .update({
          where: { id: orderId },
          data: {
            paymentStatus: "FAILED",
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: "stripe_session_creation_failed",
          },
        })
        .catch(() => undefined);
    }
    return NextResponse.json({ error: "payment_unavailable" }, { status: 503 });
  }
}
