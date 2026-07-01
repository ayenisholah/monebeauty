import { PrismaClient, type ServiceCategory } from "@prisma/client";

const prisma = new PrismaClient();

// Keep in sync with content/booking-services.ts (kept inline so `prisma db seed` via tsx
// needs no path-alias resolution). The booking API also self-heals these rows if missing.
const SERVICES: {
  slug: string;
  category: ServiceCategory;
  bookable: boolean;
}[] = [
  { slug: "facial", category: "FACE", bookable: true },
  { slug: "body", category: "BODY", bookable: true },
  { slug: "endospheres", category: "DEVICE", bookable: true },
  { slug: "laser", category: "LASER", bookable: true },
  { slug: "rf", category: "DEVICE", bookable: true },
  { slug: "trichology", category: "HAIR", bookable: true },
  { slug: "brows", category: "FACE", bookable: true },
  { slug: "packages", category: "BODY", bookable: true },
  { slug: "injectable", category: "INJECTABLE", bookable: false },
  { slug: "consultation", category: "CONSULTATION", bookable: false },
];

async function main() {
  const practitioner = await prisma.practitioner.findFirst();
  if (!practitioner) {
    await prisma.practitioner.create({
      data: { name: "Mone Beauty Clinic", role: "Specialist" },
    });
  }

  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: { category: s.category, published: s.bookable },
      create: { slug: s.slug, category: s.category, published: s.bookable },
    });
  }

  console.log(`Seeded default practitioner + ${SERVICES.length} services.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
