import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import type { Product } from "@/content/products";
import { getLiveProduct } from "@/lib/live-content";
import { normalizeQty } from "@/lib/cart";
import { routing, type Locale } from "@/i18n/routing";
import { notifyOrderConfirmation } from "@/lib/notifications";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function ensureProduct(product: Product): Promise<string> {
  const existing = await prisma.product.findUnique({
    where: { slug: product.slug },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.product.create({
    data: {
      slug: product.slug,
      category: product.category,
      size: product.size,
      price: product.price ?? 0,
      images: product.image ? [product.image] : [],
      published: true,
    },
    select: { id: true },
  });
  return created.id;
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const fullName = String(payload.fullName ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const notes = payload.notes ? String(payload.notes).slice(0, 2000) : null;
  const locale = routing.locales.includes(payload.locale as Locale)
    ? (payload.locale as Locale)
    : routing.defaultLocale;
  const consentGdpr = payload.consentGdpr === true;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  if (!fullName) return bad("name_required");
  if (!phone) return bad("phone_required");
  if (!EMAIL_RE.test(email)) return bad("email_required");
  if (!consentGdpr) return bad("consent_required");

  const qtyBySlug = new Map<string, number>();
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const slug = String((item as { slug?: unknown }).slug ?? "");
    if (!slug) continue;
    const qty = normalizeQty(Number((item as { qty?: unknown }).qty));
    qtyBySlug.set(slug, (qtyBySlug.get(slug) ?? 0) + qty);
  }

  const lines: { product: Product; qty: number; lineTotal: number }[] = [];
  for (const [slug, qty] of qtyBySlug.entries()) {
    const product = await getLiveProduct(slug, locale);
    if (!product || product.price == null) continue;
    const normalizedQty = normalizeQty(qty);
    lines.push({
      product,
      qty: normalizedQty,
      lineTotal: product.price * normalizedQty,
    });
  }

  if (lines.length === 0) return bad("empty_cart");

  try {
    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const existing = await prisma.client.findFirst({ where: { email } });
    const client = existing
      ? await prisma.client.update({
          where: { id: existing.id },
          data: { fullName, phone, consentGdpr: true },
        })
      : await prisma.client.create({
          data: { fullName, phone, email, consentGdpr: true },
        });

    const orderItems = [];
    for (const line of lines) {
      const productId = await ensureProduct(line.product);
      const name = line.product.i18n[locale]?.name ?? line.product.slug;
      orderItems.push({
        productId,
        name,
        unitPrice: line.product.price ?? 0,
        qty: line.qty,
      });
    }

    const order = await prisma.order.create({
      data: {
        clientId: client.id,
        locale,
        status: "PENDING",
        subtotal: total,
        total,
        currency: "EUR",
        email,
        phone,
        consentGdpr: true,
        items: { create: orderItems },
      },
      include: {
        items: true,
        client: { select: { fullName: true, email: true, phone: true } },
      },
    });

    await prisma.consent.create({
      data: {
        clientId: client.id,
        type: "gdpr_checkout",
        granted: true,
      },
    });

    if (notes) {
      await prisma.auditLog.create({
        data: {
          actor: email,
          action: "checkout_note_received",
          entity: "Order",
          entityId: order.id,
        },
      });
    }

    try {
      await notifyOrderConfirmation(order, locale);
    } catch {
      await prisma.auditLog.create({
        data: {
          actor: "system",
          action: "order_confirmation_unhandled_error",
          entity: "Order",
          entityId: order.id,
        },
      });
    }

    return NextResponse.json({ id: order.id });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
