import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient, type ServiceCategory } from "@prisma/client";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);
const DEFAULT_BOOKING_PRACTITIONER_NAME = "Mone Beauty Clinic";

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

const CALENDAR_BLOCK_TEMPLATES = [
  { key: "lunch", labelFi: "Lounastauko", labelEn: "Lunch break", labelRu: "Обеденный перерыв", color: "#D8C5A8" },
  { key: "personal", labelFi: "Oma aika", labelEn: "Personal time", labelRu: "Личное время", color: "#CBB8A6" },
  { key: "errand", labelFi: "Työasia", labelEn: "Work errand", labelRu: "Рабочее поручение", color: "#B7C7BD" },
  { key: "sick", labelFi: "Sairausloma", labelEn: "Sick leave", labelRu: "Больничный", color: "#D6AAA0" },
  { key: "vacation", labelFi: "Loma", labelEn: "Vacation", labelRu: "Отпуск", color: "#B8C5D1" },
] as const;

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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function main() {
  for (const [displayOrder, template] of CALENDAR_BLOCK_TEMPLATES.entries()) {
    await prisma.calendarBlockTemplate.upsert({
      where: { key: template.key },
      update: {},
      create: { ...template, displayOrder, defaultDurationMin: 60 },
    });
  }

  let practitioner = await prisma.practitioner.findFirst({
    where: { name: DEFAULT_BOOKING_PRACTITIONER_NAME },
    orderBy: { id: "asc" },
  });
  if (!practitioner) {
    practitioner = await prisma.practitioner.create({
      data: {
        name: DEFAULT_BOOKING_PRACTITIONER_NAME,
        role: "Specialist",
        calendarColor: "#B89B72",
      },
    });
  }

  const serviceIds: string[] = [];
  const treatmentRoom = await prisma.room.upsert({
    where: { name: "Treatment room 1" },
    update: { active: true },
    create: { name: "Treatment room 1", active: true, displayOrder: 1 },
  });
  const deviceByService = new Map<string, string>();
  for (const [slug, name] of [
    ["endospheres", "Endospheres"],
    ["laser", "Laser"],
    ["rf", "MicroRF"],
  ] as const) {
    const device = await prisma.device.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
    deviceByService.set(slug, device.id);
  }
  for (const s of SERVICES) {
    const deviceId = deviceByService.get(s.slug);
    const service = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        category: s.category,
        published: s.bookable,
        primaryPractitionerId: s.bookable ? practitioner.id : null,
        requiresDevice: Boolean(deviceId),
        rooms: s.bookable ? { connect: { id: treatmentRoom.id } } : undefined,
        devices: deviceId ? { connect: { id: deviceId } } : undefined,
      },
      create: {
        slug: s.slug,
        category: s.category,
        published: s.bookable,
        primaryPractitionerId: s.bookable ? practitioner.id : null,
        requiresDevice: Boolean(deviceId),
        rooms: s.bookable ? { connect: { id: treatmentRoom.id } } : undefined,
        devices: deviceId ? { connect: { id: deviceId } } : undefined,
      },
    });
    if (s.bookable) serviceIds.push(service.id);
  }

  await prisma.practitioner.update({
    where: { id: practitioner.id },
    data: {
      services: { connect: serviceIds.map((id) => ({ id })) },
    },
  });

  for (const [index, amount] of [50, 100, 350, 650, 1000].entries()) {
    const product = await prisma.product.upsert({
      where: { slug: `gift-card-${amount}` },
      update: {},
      create: {
        slug: `gift-card-${amount}`,
        category: "GIFT_CARD",
        kind: "GIFT_CARD",
        voucherValidityDays: 365,
        price: amount,
        currency: "EUR",
        order: 1000 + index,
        images: ["/media/images/photo/5.jpg"],
        published: true,
      },
    });
    for (const content of [
      {
        locale: "fi" as const,
        name: `Lahjakortti ${amount} €`,
        description:
          "Lahjakortti Mone Beauty Clinicin valikoimaan. Koodi toimitetaan sähköpostitse maksun jälkeen.",
      },
      {
        locale: "en" as const,
        name: `Gift card €${amount}`,
        description:
          "A gift card for the Mone Beauty Clinic selection. The code is delivered by email after payment.",
      },
      {
        locale: "ru" as const,
        name: `Подарочная карта ${amount} €`,
        description:
          "Подарочная карта на услуги Mone Beauty Clinic. Код отправляется по электронной почте после оплаты.",
      },
    ]) {
      await prisma.productContent.upsert({
        where: {
          productId_locale: { productId: product.id, locale: content.locale },
        },
        update: {},
        create: {
          productId: product.id,
          locale: content.locale,
          name: content.name,
          description: content.description,
          status: "PUBLISHED",
        },
      });
    }
  }

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

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: process.env.ADMIN_NAME?.trim() || "Mone Beauty Admin",
        passwordHash: await hashPassword(adminPassword),
        role: "ADMIN",
        status: "ACTIVE",
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      },
      create: {
        email: adminEmail,
        name: process.env.ADMIN_NAME?.trim() || "Mone Beauty Admin",
        passwordHash: await hashPassword(adminPassword),
        role: "ADMIN",
        status: "ACTIVE",
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      },
    });
    console.log(`Seeded admin user ${adminEmail}.`);
  }

  console.log(
    `Seeded default practitioner + ${SERVICES.length} services + gift cards + ${BUSINESS_HOURS.daysAhead} days of availability.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
