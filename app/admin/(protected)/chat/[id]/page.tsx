import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit, requireUser } from "@/lib/auth";

async function updateStatusAction(formData: FormData) {
  "use server";

  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status")) === "RESOLVED" ? "RESOLVED" : "OPEN";
  await prisma.chatSession.update({ where: { id }, data: { status } });
  await audit({
    actor: user.email,
    action: status === "RESOLVED" ? "chat_handoff_resolved" : "chat_handoff_reopened",
    entity: "ChatSession",
    entityId: id,
  });
  revalidatePath(`/admin/chat/${id}`);
  revalidatePath("/admin/chat");
}

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session) notFound();

  const messages = Array.isArray(session.messages)
    ? (session.messages as { role?: string; content?: string; handoff?: boolean }[])
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-[16px]">
        <div>
          <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
            Chat handoff
          </h1>
          <p className="mt-[8px] font-sans text-[14px] text-body">
            {session.locale} · {session.status} · {session.updatedAt.toISOString()}
          </p>
        </div>
        <form action={updateStatusAction}>
          <input type="hidden" name="id" value={session.id} />
          <input
            type="hidden"
            name="status"
            value={session.status === "OPEN" ? "RESOLVED" : "OPEN"}
          />
          <button className="rounded-[4px] bg-accent px-[16px] py-[11px] font-sans text-[11px] tracking-[.12em] text-page uppercase">
            {session.status === "OPEN" ? "Resolve" : "Reopen"}
          </button>
        </form>
      </div>

      <section className="mt-[24px] rounded-[8px] border border-line-card bg-card p-[18px]">
        <h2 className="font-display text-[26px] font-medium">Contact</h2>
        <dl className="mt-[12px] grid gap-[10px] font-sans text-[14px] md:grid-cols-3">
          <ContactItem label="Name" value={session.contactName} />
          <ContactItem label="Email" value={session.contactEmail} />
          <ContactItem label="Phone" value={session.contactPhone} />
        </dl>
      </section>

      <section className="mt-[24px] rounded-[8px] border border-line-card bg-card p-[18px]">
        <h2 className="font-display text-[26px] font-medium">Transcript</h2>
        <div className="mt-[14px] grid gap-[10px]">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className="rounded-[8px] border border-line-hair bg-page p-[12px] font-sans text-[14px]"
            >
              <div className="mb-[6px] text-[11px] tracking-[.12em] text-muted uppercase">
                {message.handoff ? "handoff" : message.role ?? "message"}
              </div>
              <p className="whitespace-pre-wrap text-body">{message.content}</p>
            </div>
          ))}
          {messages.length === 0 ? (
            <p className="font-sans text-[14px] text-muted">No transcript stored.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ContactItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-[3px] text-ink">{value || "Not provided"}</dd>
    </div>
  );
}
