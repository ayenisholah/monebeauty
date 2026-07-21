import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

async function admin() {
  return requireApiUser(["ADMIN"]);
}

export async function GET() {
  if (!(await admin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [practitioners, rooms, devices, services, staffUsers, templates] =
    await Promise.all([
      prisma.practitioner.findMany({
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { staff: { select: { userId: true } } },
      }),
      prisma.room.findMany({
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      prisma.device.findMany({
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      prisma.service.findMany({
        where: { archivedAt: null },
        orderBy: [{ order: "asc" }, { slug: "asc" }],
        include: {
          contents: {
            where: { locale: "fi" },
            select: { h1: true },
            take: 1,
          },
          practitioners: { select: { id: true } },
          rooms: { select: { id: true } },
          devices: { select: { id: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: "STAFF" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          staff: { select: { practitionerId: true } },
        },
      }),
      prisma.calendarBlockTemplate.findMany({
        orderBy: [{ displayOrder: "asc" }, { key: "asc" }],
      }),
    ]);
  return NextResponse.json({
    practitioners,
    rooms,
    devices,
    staffUsers,
    templates,
    services: services.map((service) => ({
      id: service.id,
      slug: service.slug,
      name: service.contents[0]?.h1 ?? service.slug,
      bookable: service.bookable,
      primaryPractitionerId: service.primaryPractitionerId,
      qualifiedPractitionerIds: service.practitioners.map((item) => item.id),
      roomIds: service.rooms.map((item) => item.id),
      deviceIds: service.devices.map((item) => item.id),
      requiresDevice: service.requiresDevice,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const payload = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!payload) return bad("invalid_json");
  const action = String(payload.action ?? "");

  if (action === "saveBlockTemplate") {
    const id = String(payload.id ?? "");
    const labelFi = String(payload.labelFi ?? "").trim().slice(0, 80);
    const labelEn = String(payload.labelEn ?? "").trim().slice(0, 80);
    const labelRu = String(payload.labelRu ?? "").trim().slice(0, 80);
    const color = String(payload.color ?? "#B89B72");
    const defaultDurationMin = Number(payload.defaultDurationMin);
    if (!id || !labelFi || !labelEn || !labelRu || !/^#[0-9A-F]{6}$/i.test(color) || !Number.isInteger(defaultDurationMin) || defaultDurationMin < 15 || defaultDurationMin > 1440 || defaultDurationMin % 15)
      return bad("invalid_template");
    const row = await prisma.calendarBlockTemplate.update({
      where: { id },
      data: { labelFi, labelEn, labelRu, color, defaultDurationMin, active: payload.active !== false, displayOrder: Math.round(Number(payload.displayOrder) || 0) },
    });
    await prisma.auditLog.create({ data: { actor: user.email, actorUserId: user.id, actorRole: user.role, action: "calendar_block_template_updated", entity: "CalendarBlockTemplate", entityId: row.id } });
    return NextResponse.json({ id: row.id });
  }

  if (action === "savePractitioner") {
    const id = String(payload.id ?? "");
    const name = String(payload.name ?? "").trim();
    const role = String(payload.role ?? "").trim();
    const calendarColor = String(payload.calendarColor ?? "#B89B72");
    if (!name || !role || !/^#[0-9A-F]{6}$/i.test(calendarColor))
      return bad("invalid_practitioner");
    const data = {
      name,
      role,
      calendarColor,
      displayOrder: Math.round(Number(payload.displayOrder) || 0),
      active: payload.active !== false,
    };
    if (!id) return bad("employee_accounts_only");
    const row = await prisma.practitioner.update({ where: { id }, data });
    const userId = String(payload.userId ?? "");
    if (userId) {
      await prisma.staffUser.upsert({
        where: { userId },
        update: { practitionerId: row.id },
        create: { userId, practitionerId: row.id, daysOff: [] },
      });
    }
    await prisma.auditLog.create({
      data: {
        actor: user.email,
        action: "calendar_employee_updated",
        entity: "Practitioner",
        entityId: row.id,
      },
    });
    return NextResponse.json({ id: row.id });
  }

  if (action === "saveRoom" || action === "saveDevice") {
    const id = String(payload.id ?? "");
    const name = String(payload.name ?? "").trim();
    if (!name) return bad("name_required");
    const data = {
      name,
      displayOrder: Math.round(Number(payload.displayOrder) || 0),
      active: payload.active !== false,
    };
    const delegate = action === "saveRoom" ? prisma.room : prisma.device;
    const row = id
      ? await (delegate.update as typeof prisma.room.update)({
          where: { id },
          data,
        })
      : await (delegate.create as typeof prisma.room.create)({ data });
    await prisma.auditLog.create({
      data: {
        actor: user.email,
        action:
          action === "saveRoom"
            ? "calendar_room_saved"
            : "calendar_device_saved",
        entity: action === "saveRoom" ? "Room" : "Device",
        entityId: row.id,
      },
    });
    return NextResponse.json({ id: row.id });
  }

  if (action === "configureService") {
    const serviceId = String(payload.serviceId ?? "");
    const primaryPractitionerId =
      String(payload.primaryPractitionerId ?? "") || null;
    const ids = (key: string) =>
      Array.isArray(payload[key])
        ? (payload[key] as unknown[]).map(String).filter(Boolean)
        : [];
    const qualified = ids("qualifiedPractitionerIds");
    if (primaryPractitionerId && !qualified.includes(primaryPractitionerId))
      qualified.unshift(primaryPractitionerId);
    const row = await prisma.service.update({
      where: { id: serviceId },
      data: {
        primaryPractitionerId,
        requiresDevice: payload.requiresDevice === true,
        practitioners: { set: qualified.map((id) => ({ id })) },
        rooms: { set: ids("roomIds").map((id) => ({ id })) },
        devices: { set: ids("deviceIds").map((id) => ({ id })) },
      },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: {
        actor: user.email,
        action: "calendar_service_configured",
        entity: "Service",
        entityId: row.id,
      },
    });
    return NextResponse.json({ id: row.id });
  }

  return bad("unknown_action");
}
