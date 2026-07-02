import Link from "next/link";
import { prisma } from "@/lib/db";

const cards = [
  { key: "clients", label: "Clients", href: "/admin/clients" },
  { key: "appointments", label: "Appointments", href: "/fi/staff" },
  { key: "orders", label: "Orders", href: "/admin/clients" },
  { key: "products", label: "Products", href: "/admin/products" },
  { key: "services", label: "Services", href: "/admin/services" },
  { key: "articles", label: "Articles", href: "/admin/blog" },
  { key: "handoffs", label: "Chat handoffs", href: "/admin/chat" },
] as const;

export default async function AdminDashboardPage() {
  const [clients, appointments, orders, products, services, articles, handoffs, audits] =
    await Promise.all([
      prisma.client.count(),
      prisma.appointment.count(),
      prisma.order.count(),
      prisma.product.count(),
      prisma.service.count(),
      prisma.article.count(),
      prisma.chatSession.count({
        where: { handoffRequested: true, status: "OPEN" },
      }),
      prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 8 }),
    ]);
  const counts = {
    clients,
    appointments,
    orders,
    products,
    services,
    articles,
    handoffs,
  };

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        Operations dashboard
      </h1>
      <div className="mt-[28px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[16px]">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-[8px] border border-line-card bg-card p-[18px] transition hover:-translate-y-[2px] hover:shadow-card"
          >
            <div className="font-sans text-[12px] tracking-[.12em] text-muted uppercase">
              {card.label}
            </div>
            <div className="mt-[12px] font-display text-[38px] leading-none">
              {counts[card.key]}
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-[34px] rounded-[8px] border border-line-card bg-card p-[20px]">
        <h2 className="font-display text-[28px] font-medium">Recent audit log</h2>
        <div className="mt-[16px] grid gap-[10px]">
          {audits.length === 0 ? (
            <p className="font-sans text-[14px] text-muted">No audit events yet.</p>
          ) : (
            audits.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-[8px] border-t border-line-hair pt-[10px] font-sans text-[13px] md:grid-cols-[180px_1fr_180px]"
              >
                <span className="text-muted">{entry.at.toISOString()}</span>
                <span>{entry.action}</span>
                <span className="text-muted">
                  {entry.entity}
                  {entry.entityId ? `:${entry.entityId.slice(0, 8)}` : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
