import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminChatQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "OPEN" } = await searchParams;
  const sessions = await prisma.chatSession.findMany({
    where: {
      handoffRequested: true,
      status: status === "RESOLVED" ? "RESOLVED" : "OPEN",
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-[14px]">
        <div>
          <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
            Chat handoffs
          </h1>
          <p className="mt-[8px] font-sans text-[14px] text-body">
            Human follow-up requests from the public chatbot.
          </p>
        </div>
        <div className="flex gap-[8px]">
          <Link href="/admin/chat" className={tabCls(status !== "RESOLVED")}>
            Open
          </Link>
          <Link
            href="/admin/chat?status=RESOLVED"
            className={tabCls(status === "RESOLVED")}
          >
            Resolved
          </Link>
        </div>
      </div>

      <div className="mt-[24px] overflow-hidden rounded-[8px] border border-line-card bg-card">
        {sessions.map((session) => {
          const messages = Array.isArray(session.messages)
            ? (session.messages as { content?: unknown }[])
            : [];
          const preview = String(messages.at(-1)?.content ?? "").slice(0, 140);
          return (
            <Link
              key={session.id}
              href={`/admin/chat/${session.id}`}
              className="grid gap-[8px] border-b border-line-hair px-[16px] py-[14px] font-sans text-[14px] last:border-b-0 hover:bg-btn-fill md:grid-cols-[150px_1fr_220px]"
            >
              <span className="font-medium">{session.locale}</span>
              <span>{preview || "No message preview"}</span>
              <span className="text-muted">{session.updatedAt.toISOString()}</span>
            </Link>
          );
        })}
        {sessions.length === 0 ? (
          <p className="p-[18px] font-sans text-[14px] text-muted">
            No chat handoffs in this queue.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function tabCls(active: boolean) {
  return active
    ? "rounded-[4px] bg-accent px-[13px] py-[9px] font-sans text-[12px] tracking-[.1em] text-page uppercase"
    : "rounded-[4px] border border-line-btn px-[13px] py-[9px] font-sans text-[12px] tracking-[.1em] text-ink uppercase";
}
