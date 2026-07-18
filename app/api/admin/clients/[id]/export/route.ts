import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit, requireApiUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      appointments: {
        include: {
          service: { select: { slug: true, category: true } },
          practitioner: { select: { name: true, role: true } },
          events: true,
          messages: { include: { attempts: true } },
        },
      },
      orders: {
        include: { items: true, messages: { include: { attempts: true } } },
      },
      carts: { include: { items: true } },
      chatSessions: true,
    },
  });
  if (!client)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const consents = await prisma.consent.findMany({
    where: { clientId: id },
    orderBy: { at: "desc" },
  });

  await audit({
    actor: user.email,
    action: "client_data_exported",
    entity: "Client",
    entityId: id,
  });

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      client,
      consents,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="monebeauty-client-${id}.json"`,
      },
    },
  );
}
