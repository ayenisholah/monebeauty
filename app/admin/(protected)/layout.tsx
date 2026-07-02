import Link from "next/link";
import { requireUser } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/blog", label: "Blog" },
];

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["ADMIN"]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line-header bg-card">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-[16px] px-[20px] py-[16px]">
          <div>
            <div className="font-display text-[24px] font-medium">
              Mone Beauty Admin
            </div>
            <div className="font-sans text-[12px] text-muted">
              {user.email}
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-[8px]">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[4px] border border-line-btn px-[12px] py-[8px] font-sans text-[12px] tracking-[.08em] text-nav uppercase hover:border-line-btn-hover hover:bg-btn-fill"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin/logout"
              className="rounded-[4px] bg-accent px-[12px] py-[8px] font-sans text-[12px] tracking-[.08em] text-page uppercase"
            >
              Logout
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-[20px] py-[clamp(28px,5vw,56px)]">
        {children}
      </main>
    </div>
  );
}
