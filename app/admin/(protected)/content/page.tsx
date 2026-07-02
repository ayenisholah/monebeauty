import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminContentIndexPage() {
  const pages = await prisma.contentPage.findMany({
    orderBy: [{ slug: "asc" }, { locale: "asc" }],
    select: { id: true, slug: true, locale: true, title: true, updatedAt: true },
  });

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        Content pages
      </h1>
      <p className="mt-[10px] max-w-[720px] font-sans text-[14px] text-body">
        Run npm run db:sync-content after migrations to seed this editor from
        committed generated content.
      </p>
      <div className="mt-[24px] overflow-hidden rounded-[8px] border border-line-card bg-card">
        {pages.map((page) => (
          <Link
            key={page.id}
            href={`/admin/content/${page.id}`}
            className="grid gap-[8px] border-b border-line-hair px-[16px] py-[14px] font-sans text-[14px] last:border-b-0 hover:bg-btn-fill md:grid-cols-[1fr_80px_1.2fr_220px]"
          >
            <span className="font-medium">{page.slug}</span>
            <span className="text-muted">{page.locale}</span>
            <span>{page.title}</span>
            <span className="text-muted">{page.updatedAt.toISOString()}</span>
          </Link>
        ))}
        {pages.length === 0 ? (
          <p className="p-[18px] font-sans text-[14px] text-muted">
            No content pages have been synced yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
