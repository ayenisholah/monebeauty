import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient, type ServiceCategory } from "@prisma/client";
import { INTERNAL_CALENDAR_SERVICES } from "../lib/internal-calendar-services";
import { workdaySlots } from "../lib/staff-schedule";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);
const CALENDAR_STAFF = [
  { name: "Ilona Bagaturija", color: "#D5897E" },
  { name: "Irene", color: "#9B9BEF" },
  { name: "Vladislava", color: "#7F83D8" },
  { name: "Inna", color: "#A9B88E" },
] as const;

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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function main() {
  for (const template of INTERNAL_CALENDAR_SERVICES) {
    const data = {
      key: template.key,
      labelFi: template.labelFi,
      labelEn: template.labelEn,
      labelRu: template.labelRu,
      color: template.color,
      displayOrder: template.displayOrder,
      defaultDurationMin: template.defaultDurationMin,
      active: true,
    };
    await prisma.calendarBlockTemplate.upsert({
      where: { key: template.key },
      update: data,
      create: data,
    });
  }

  const practitioners: Array<{ id: string }> = [];
  for (const [displayOrder, staff] of CALENDAR_STAFF.entries()) {
    const aliases =
      staff.name === "Ilona Bagaturija" ? [staff.name, "Ilona"] : [staff.name];
    const existing = await prisma.practitioner.findFirst({
      where: { name: { in: aliases, mode: "insensitive" } },
      orderBy: { id: "asc" },
    });
    practitioners.push(
      existing
        ? await prisma.practitioner.update({
            where: { id: existing.id },
            data: {
              name: staff.name,
              active: true,
              role: "Specialist",
              displayOrder,
              calendarColor: staff.color,
            },
          })
        : await prisma.practitioner.create({
            data: {
              name: staff.name,
              role: "Specialist",
              active: true,
              displayOrder,
              calendarColor: staff.color,
            },
          }),
    );
  }

  const serviceIds: string[] = [];
  const serviceDeviceById = new Map<string, string>();
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
        primaryPractitionerId: null,
        requiresDevice: Boolean(deviceId),
        rooms: s.bookable ? { connect: { id: treatmentRoom.id } } : undefined,
        devices: deviceId ? { connect: { id: deviceId } } : undefined,
      },
      create: {
        slug: s.slug,
        category: s.category,
        published: s.bookable,
        primaryPractitionerId: null,
        requiresDevice: Boolean(deviceId),
        rooms: s.bookable ? { connect: { id: treatmentRoom.id } } : undefined,
        devices: deviceId ? { connect: { id: deviceId } } : undefined,
      },
    });
    if (s.bookable) serviceIds.push(service.id);
    if (deviceId) serviceDeviceById.set(service.id, deviceId);
  }

  const seedDemoScheduling = process.env.SEED_DEMO_SCHEDULING === "true";
  if (seedDemoScheduling) {
    for (const practitioner of practitioners) {
      for (const serviceId of serviceIds) {
        const deviceId = serviceDeviceById.get(serviceId);
        await prisma.practitionerServiceCapability.upsert({
          where: {
            practitionerId_serviceId_roomId: {
              practitionerId: practitioner.id,
              serviceId,
              roomId: treatmentRoom.id,
            },
          },
          update: {},
          create: {
            practitionerId: practitioner.id,
            serviceId,
            roomId: treatmentRoom.id,
            ...(deviceId ? { devices: { create: { deviceId } } } : {}),
          },
        });
      }
    }
  }

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

  if (seedDemoScheduling) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i <= BUSINESS_HOURS.daysAhead; i++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + i);
      if (!BUSINESS_HOURS.openDays.includes(date.getUTCDay())) continue;
      const dateStr = date.toISOString().slice(0, 10);
      for (const practitioner of practitioners) {
        await prisma.availability.upsert({
          where: {
            practitionerId_date: { practitionerId: practitioner.id, date },
          },
          update: {},
          create: {
            practitionerId: practitioner.id,
            date,
            slots: workdaySlots(
              dateStr,
              BUSINESS_HOURS.startHour * 60,
              BUSINESS_HOURS.endHour * 60,
            ),
          },
        });
      }
    }
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
    `Seeded ${practitioners.length} calendar employees + ${SERVICES.length} services + gift cards${seedDemoScheduling ? ` + ${BUSINESS_HOURS.daysAhead} days of demo availability` : " (scheduling assignments require admin configuration)"}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
