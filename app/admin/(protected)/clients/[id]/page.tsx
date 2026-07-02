import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { audit, requireUser } from "@/lib/auth";

async function updateClientAction(formData: FormData) {
  "use server";

  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) notFound();

  const contraindications = String(
    formData.get("contraindications") ?? "",
  ).trim();
  await prisma.client.update({
    where: { id },
    data: {
      fullName: String(formData.get("fullName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim() || null,
      contraindications: contraindications || null,
      consentMarketing: formData.get("consentMarketing") === "on",
    },
  });

  await audit({
    actor: user.email,
    action: "client_profile_updated",
    entity: "Client",
    entityId: id,
  });
  if ((existing.contraindications ?? "") !== contraindications) {
    await audit({
      actor: user.email,
      action: "client_contraindications_updated",
      entity: "Client",
      entityId: id,
    });
  }
  revalidatePath(`/admin/clients/${id}`);
}

async function eraseClientAction(formData: FormData) {
  "use server";

  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (String(formData.get("confirm") ?? "") !== "ERASE") return;
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) notFound();

  await prisma.$transaction([
    prisma.chatSession.updateMany({
      where: { clientId: id },
      data: {
        clientId: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        messages: [],
      },
    }),
    prisma.order.updateMany({
      where: { clientId: id },
      data: {
        email: `erased-${id}@privacy.local`,
        phone: null,
      },
    }),
    prisma.appointment.updateMany({
      where: { clientId: id },
      data: { notes: null },
    }),
    prisma.cart.deleteMany({ where: { clientId: id } }),
    prisma.consent.create({
      data: { clientId: id, type: "gdpr_erasure", granted: true },
    }),
    prisma.client.update({
      where: { id },
      data: {
        userId: null,
        fullName: "Erased client",
        phone: `erased-${id}`,
        email: `erased-${id}@privacy.local`,
        notes: null,
        contraindications: null,
        consentGdpr: false,
        consentMarketing: false,
      },
    }),
  ]);

  await audit({
    actor: user.email,
    action: "client_data_erased",
    entity: "Client",
    entityId: id,
  });
  revalidatePath(`/admin/clients/${id}`);
}

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(["ADMIN"]);
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { start: "desc" },
        take: 20,
        include: {
          service: { select: { slug: true } },
          practitioner: { select: { name: true } },
        },
      },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!client) notFound();

  if (client.contraindications) {
    await audit({
      actor: user.email,
      action: "client_contraindications_viewed",
      entity: "Client",
      entityId: client.id,
    });
  }

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        {client.fullName}
      </h1>
      <div className="mt-[24px] grid gap-[20px] lg:grid-cols-[1fr_360px]">
        <form
          action={updateClientAction}
          className="rounded-[8px] border border-line-card bg-card p-[20px]"
        >
          <input type="hidden" name="id" value={client.id} />
          <div className="grid gap-[14px] md:grid-cols-2">
            <Field label="Full name">
              <input name="fullName" defaultValue={client.fullName} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={client.phone} className={inputCls} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={client.email} className={inputCls} />
            </Field>
            <label className="flex items-end gap-[8px] font-sans text-[14px] text-body">
              <input
                name="consentMarketing"
                type="checkbox"
                defaultChecked={client.consentMarketing}
              />
              Marketing consent
            </label>
          </div>
          <Field label="Internal notes">
            <textarea name="notes" defaultValue={client.notes ?? ""} rows={5} className={inputCls} />
          </Field>
          <Field label="Flagged contraindications / special-category data">
            <textarea
              name="contraindications"
              defaultValue={client.contraindications ?? ""}
              rows={5}
              className={inputCls}
            />
          </Field>
          <button className="mt-[18px] rounded-[4px] bg-accent px-[18px] py-[12px] font-sans text-[12px] tracking-[.14em] text-page uppercase">
            Save profile
          </button>
        </form>

        <aside className="rounded-[8px] border border-line-card bg-card p-[20px]">
          <h2 className="font-display text-[26px] font-medium">Consent</h2>
          <dl className="mt-[14px] grid gap-[10px] font-sans text-[14px]">
            <div>
              <dt className="text-muted">GDPR</dt>
              <dd>{client.consentGdpr ? "Granted" : "Not granted"}</dd>
            </div>
            <div>
              <dt className="text-muted">Created</dt>
              <dd>{client.createdAt.toISOString()}</dd>
            </div>
          </dl>
          <div className="mt-[18px] border-t border-line-hair pt-[16px]">
            <h3 className="font-sans text-[12px] tracking-[.12em] text-muted uppercase">
              GDPR tools
            </h3>
            <Link
              href={`/api/admin/clients/${client.id}/export`}
              className="mt-[10px] inline-flex min-h-[40px] items-center rounded-[4px] border border-line-btn px-[12px] font-sans text-[11px] tracking-[.12em] text-ink uppercase"
            >
              Export client data
            </Link>
            <form
              action={eraseClientAction}
              className="mt-[14px]"
            >
              <input type="hidden" name="id" value={client.id} />
              <label className="block">
                <span className="mb-[6px] block font-sans text-[11px] tracking-[.08em] text-muted uppercase">
                  Type ERASE to anonymize
                </span>
                <input name="confirm" className={inputCls} />
              </label>
              <button className="mt-[10px] min-h-[40px] rounded-[4px] bg-accent px-[12px] font-sans text-[11px] tracking-[.12em] text-page uppercase">
                Erase personal data
              </button>
            </form>
          </div>
        </aside>
      </div>

      <History title="Appointments">
        {client.appointments.map((appt) => (
          <div key={appt.id} className={rowCls}>
            <span>{appt.start.toISOString()}</span>
            <span>{appt.service.slug}</span>
            <span>{appt.practitioner.name}</span>
            <span>{appt.status}</span>
          </div>
        ))}
      </History>

      <History title="Orders">
        {client.orders.map((order) => (
          <div key={order.id} className={rowCls}>
            <span>{order.createdAt.toISOString()}</span>
            <span>{order.status}</span>
            <span>{Number(order.total).toFixed(2)} {order.currency}</span>
            <span>{order.id.slice(0, 8)}</span>
          </div>
        ))}
      </History>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-[14px] block">
      <span className="mb-[6px] block font-sans text-[12px] tracking-[.08em] text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function History({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-[24px] rounded-[8px] border border-line-card bg-card p-[20px]">
      <h2 className="font-display text-[26px] font-medium">{title}</h2>
      <div className="mt-[12px] grid gap-[8px]">{children}</div>
    </section>
  );
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-page px-[12px] py-[10px] font-sans text-[14px] text-ink outline-none focus:border-accent";
const rowCls =
  "grid gap-[8px] border-t border-line-hair pt-[8px] font-sans text-[13px] md:grid-cols-4";
