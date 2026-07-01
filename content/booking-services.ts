import type { Locale } from "@/i18n/routing";
import { getPageContent } from "@/content/pages";

/**
 * Bookable-services registry — the single source of truth for what can be booked.
 * Derived from the existing real service/content pages (SCOPE.md keeps the real service
 * set). `category` mirrors the Prisma `ServiceCategory` enum. SCOPE's aesthetic-medicine
 * additions that have no scraped copy yet are `bookable: false` ([CLINIC TO PROVIDE]).
 */

/** Mirrors the `ServiceCategory` enum in prisma/schema.prisma. */
export type ServiceCategory =
  "FACE" | "BODY" | "HAIR" | "INJECTABLE" | "DEVICE" | "LASER" | "CONSULTATION";

export interface BookingService {
  /** Stable key used in `?service=` and as the DB `Service.slug`. */
  key: string;
  /** Existing content-page slug (for `getPageContent` / deep-links), or null for stubs. */
  contentSlug: string | null;
  category: ServiceCategory;
  durationMin: number;
  image: string | null;
  /** false = [CLINIC TO PROVIDE] stub, not offered in the picker yet. */
  bookable: boolean;
}

export const BOOKING_SERVICES: BookingService[] = [
  {
    key: "facial",
    contentSlug: "services/face",
    category: "FACE",
    durationMin: 60,
    image: "/media/home/facial.jpg",
    bookable: true,
  },
  {
    key: "body",
    contentSlug: "services/body",
    category: "BODY",
    durationMin: 60,
    image: "/media/home/endospheres.jpg",
    bookable: true,
  },
  {
    key: "endospheres",
    contentSlug: "instrumental/endosphere",
    category: "DEVICE",
    durationMin: 45,
    image: "/media/files/land/122/262782e883ed1fd7968fd4ed737bb37f.jpeg",
    bookable: true,
  },
  {
    key: "laser",
    contentSlug: "services/laser",
    category: "LASER",
    durationMin: 30,
    image: "/media/files/land/252/c653b8462c5d40c9d6e4d5dae5b575e8.jpeg",
    bookable: true,
  },
  {
    key: "rf",
    contentSlug: "services/mikroneulanrf",
    category: "DEVICE",
    durationMin: 60,
    image: "/media/files/land/280/21b80358547be97456baf00ac6a98ac9.jpeg",
    bookable: true,
  },
  {
    key: "trichology",
    contentSlug: "services/tricho",
    category: "HAIR",
    durationMin: 45,
    image: "/media/files/land/303/8b2e9288e47ba7705d700a8d7edb596e.jpeg",
    bookable: true,
  },
  {
    key: "brows",
    contentSlug: "services/eyebrows",
    category: "FACE",
    durationMin: 30,
    image: "/media/home/brows.jpg",
    bookable: true,
  },
  {
    key: "packages",
    contentSlug: "services/packages",
    category: "BODY",
    durationMin: 90,
    image: "/media/home/packages.jpg",
    bookable: true,
  },
  // [CLINIC TO PROVIDE] — SCOPE.md aesthetic-medicine services not yet in scraped content.
  {
    key: "injectable",
    contentSlug: null,
    category: "INJECTABLE",
    durationMin: 45,
    image: null,
    bookable: false,
  },
  {
    key: "consultation",
    contentSlug: null,
    category: "CONSULTATION",
    durationMin: 30,
    image: null,
    bookable: false,
  },
];

const BY_KEY = new Map(BOOKING_SERVICES.map((s) => [s.key, s]));

export function getBookingService(key: string): BookingService | undefined {
  return BY_KEY.get(key);
}

/** Services offered in the picker (excludes [CLINIC TO PROVIDE] stubs). */
export function bookableServices(): BookingService[] {
  return BOOKING_SERVICES.filter((s) => s.bookable);
}

/** Booking key for an existing service content-page slug (for "Book this treatment"). */
export function bookingKeyForContentSlug(
  contentSlug: string,
): string | undefined {
  return BOOKING_SERVICES.find(
    (s) => s.contentSlug === contentSlug && s.bookable,
  )?.key;
}

/** Human title for a service key — prefers the real content-page title. */
export function bookingServiceTitle(
  key: string,
  locale: Locale,
): string | null {
  const s = BY_KEY.get(key);
  if (!s?.contentSlug) return null;
  return getPageContent(s.contentSlug, locale)?.title ?? null;
}
