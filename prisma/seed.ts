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

const BUSINESS_HOURS = {
  openDays: [1, 2, 3, 4, 5, 6],
  startHour: 10,
  endHour: 19,
  stepMin: 30,
  daysAhead: 30,
};

function slotsForDate(date: Date) {
  const slots = [];
  for (
    let t = BUSINESS_HOURS.startHour * 60;
    t + 30 <= BUSINESS_HOURS.endHour * 60;
    t += BUSINESS_HOURS.stepMin
  ) {
    const start = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        Math.floor(t / 60),
        t % 60,
      ),
    );
    const end = new Date(start.getTime() + BUSINESS_HOURS.stepMin * 60000);
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      status: "open",
    });
  }
  return slots;
}

async function main() {
  let practitioner = await prisma.practitioner.findFirst();
  if (!practitioner) {
    practitioner = await prisma.practitioner.create({
      data: { name: "Mone Beauty Clinic", role: "Specialist" },
    });
  }

  const serviceIds: string[] = [];
  for (const s of SERVICES) {
    const service = await prisma.service.upsert({
      where: { slug: s.slug },
      update: { category: s.category, published: s.bookable },
      create: { slug: s.slug, category: s.category, published: s.bookable },
    });
    if (s.bookable) serviceIds.push(service.id);
  }

  await prisma.practitioner.update({
    where: { id: practitioner.id },
    data: {
      services: { connect: serviceIds.map((id) => ({ id })) },
    },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i <= BUSINESS_HOURS.daysAhead; i++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + i);
    if (!BUSINESS_HOURS.openDays.includes(date.getUTCDay())) continue;
    await prisma.availability.upsert({
      where: {
        practitionerId_date: {
          practitionerId: practitioner.id,
          date,
        },
      },
      update: {},
      create: {
        practitionerId: practitioner.id,
        date,
        slots: slotsForDate(date),
      },
    });
  }

  console.log(
    `Seeded default practitioner + ${SERVICES.length} services + ${BUSINESS_HOURS.daysAhead} days of availability.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
