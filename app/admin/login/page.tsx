import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, currentUser, verifyPassword } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/admin/login?error=invalid");
  }
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    redirect("/admin/login?error=forbidden");
  }
  await createSession(user.id);
  redirect(user.role === "STAFF" ? "/fi/staff" : "/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await currentUser();
  if (user?.role === "ADMIN") redirect("/admin");
  if (user?.role === "STAFF") redirect("/fi/staff");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-[20px] py-[48px]">
      <form
        action={loginAction}
        className="w-full max-w-[420px] rounded-[var(--radius)] border border-line-card bg-card p-[clamp(22px,4vw,36px)] shadow-card"
      >
        <div className="font-sans text-[12px] tracking-[.16em] text-muted uppercase">
          Mone Beauty Clinic
        </div>
        <h1 className="mt-[10px] font-display text-[clamp(34px,5vw,48px)] leading-[1.05] font-medium">
          Admin sign in
        </h1>
        {error ? (
          <p className="mt-[18px] rounded-[4px] border border-line-btn bg-btn-fill px-[12px] py-[10px] font-sans text-[13px] text-ink">
            The email or password is not valid for admin access.
          </p>
        ) : null}
        <label className="mt-[24px] block">
          <span className="mb-[7px] block font-sans text-[12px] tracking-[.08em] text-muted uppercase">
            Email
          </span>
          <input name="email" type="email" required className={inputCls} />
        </label>
        <label className="mt-[14px] block">
          <span className="mb-[7px] block font-sans text-[12px] tracking-[.08em] text-muted uppercase">
            Password
          </span>
          <input name="password" type="password" required className={inputCls} />
        </label>
        <button className="mt-[24px] inline-flex min-h-[48px] w-full items-center justify-center rounded-[4px] bg-accent px-[24px] font-sans text-[12px] font-medium tracking-[.16em] text-page uppercase">
          Sign in
        </button>
      </form>
    </main>
  );
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-page px-[12px] py-[11px] font-sans text-[14px] text-ink outline-none focus:border-accent";
