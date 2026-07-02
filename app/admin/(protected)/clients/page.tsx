import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const clients = await prisma.client.findMany({
    where: query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { appointments: true, orders: true } },
    },
  });

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        Clients
      </h1>
      <form className="mt-[22px] flex max-w-[620px] gap-[10px]">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, phone, or email"
          className={inputCls}
        />
        <button className="rounded-[4px] bg-accent px-[18px] font-sans text-[12px] tracking-[.14em] text-page uppercase">
          Search
        </button>
      </form>
      <div className="mt-[24px] overflow-hidden rounded-[8px] border border-line-card bg-card">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/admin/clients/${client.id}`}
            className="grid gap-[8px] border-b border-line-hair px-[16px] py-[14px] font-sans text-[14px] last:border-b-0 hover:bg-btn-fill md:grid-cols-[1.3fr_1fr_1fr_160px]"
          >
            <span className="font-medium text-ink">{client.fullName}</span>
            <span className="text-body">{client.email}</span>
            <span className="text-body">{client.phone}</span>
            <span className="text-muted">
              {client._count.appointments} bookings · {client._count.orders} orders
            </span>
          </Link>
        ))}
        {clients.length === 0 ? (
          <p className="p-[18px] font-sans text-[14px] text-muted">
            No clients found.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const inputCls =
  "min-h-[44px] flex-1 rounded-[4px] border border-line-btn bg-page px-[12px] font-sans text-[14px] text-ink outline-none focus:border-accent";
