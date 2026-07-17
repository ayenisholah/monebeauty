import "server-only";

import { prisma } from "@/lib/db";
import { excerpt } from "@/lib/seo";
import { resolveProcedure } from "@/lib/procedures";
import type { Locale } from "@/i18n/routing";
import { PUBLIC_PATHS } from "@/lib/public-routes";

export type BookingServiceOption = {
  key: string;
  name: string;
  image: string | null;
  shortDescription: string;
  durationMin: number;
  priceFrom: number | null;
  publicPath: string;
};

export type BookingProcedureContext = {
  index: number;
  title: string;
  description: string;
  price: string;
};

export type BookingContext = {
  service: BookingServiceOption;
  procedure: BookingProcedureContext | null;
};

export async function getBookingServiceOptions(
  locale: Locale,
): Promise<BookingServiceOption[]> {
  const services = await prisma.service.findMany({
    where: {
      bookable: true,
      archivedAt: null,
      published: true,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
    include: {
      contents: { where: { locale, status: "PUBLISHED" }, take: 1 },
    },
  });

  return services.flatMap((service) => {
    const content = service.contents[0];
    if (!content) return [];
    return [
      {
        key: service.slug,
        name: content.h1,
        image: service.images[0] ?? null,
        shortDescription: excerpt(content.shortDesc || content.whatItIs, 180),
        durationMin: service.durationMin,
        priceFrom:
          service.priceFrom === null ? null : Number(service.priceFrom),
        publicPath: service.publicPath || PUBLIC_PATHS.services,
      },
    ];
  });
}

/** Resolve only published, localized content and discard all unvalidated URL context. */
export async function getBookingContext(
  locale: Locale,
  serviceSlug: string | undefined,
  procedureIndex?: string | number,
): Promise<BookingContext | null> {
  if (!serviceSlug) return null;
  const service = await prisma.service.findFirst({
    where: {
      slug: serviceSlug,
      bookable: true,
      archivedAt: null,
      published: true,
      contents: { some: { locale, status: "PUBLISHED" } },
    },
    include: {
      contents: { where: { locale, status: "PUBLISHED" }, take: 1 },
    },
  });
  const content = service?.contents[0];
  if (!service || !content) return null;

  const resolved = resolveProcedure(content.whatItIs, procedureIndex);
  return {
    service: {
      key: service.slug,
      name: content.h1,
      image: service.images[0] ?? null,
      shortDescription: excerpt(content.shortDesc || content.whatItIs, 180),
      durationMin: service.durationMin,
      priceFrom: service.priceFrom === null ? null : Number(service.priceFrom),
      publicPath: service.publicPath || PUBLIC_PATHS.services,
    },
    procedure: resolved
      ? {
          index: resolved.index,
          title: resolved.procedure.title,
          description: excerpt(resolved.procedure.description, 210),
          price: resolved.procedure.price,
        }
      : null,
  };
}
