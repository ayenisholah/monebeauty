import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit, requireUser } from "@/lib/auth";

async function updateContentAction(formData: FormData) {
  "use server";

  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const page = await prisma.contentPage.update({
    where: { id },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      hero: String(formData.get("hero") ?? "").trim() || null,
      body: String(formData.get("body") ?? "").trim(),
      seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
      seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
    },
  });
  await audit({
    actor: user.email,
    action: "content_page_updated",
    entity: "ContentPage",
    entityId: id,
  });
  revalidatePath(`/admin/content/${id}`);
  revalidatePath(`/${page.slug}`);
}

export default async function AdminContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await prisma.contentPage.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        {page.slug} · {page.locale}
      </h1>
      <form
        action={updateContentAction}
        className="mt-[24px] rounded-[8px] border border-line-card bg-card p-[18px]"
      >
        <input type="hidden" name="id" value={page.id} />
        <div className="grid gap-[14px] md:grid-cols-2">
          <Field label="Title">
            <input name="title" defaultValue={page.title} className={inputCls} />
          </Field>
          <Field label="Hero image">
            <input name="hero" defaultValue={page.hero ?? ""} className={inputCls} />
          </Field>
          <Field label="SEO title">
            <input name="seoTitle" defaultValue={page.seoTitle ?? ""} className={inputCls} />
          </Field>
          <Field label="SEO description">
            <input
              name="seoDescription"
              defaultValue={page.seoDescription ?? ""}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Markdown body">
          <textarea
            name="body"
            defaultValue={page.body}
            rows={24}
            className={inputCls}
          />
        </Field>
        <button className="mt-[18px] rounded-[4px] bg-accent px-[18px] py-[12px] font-sans text-[12px] tracking-[.14em] text-page uppercase">
          Save content
        </button>
      </form>
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
      <span className="mb-[6px] block font-sans text-[11px] tracking-[.08em] text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-page px-[10px] py-[9px] font-sans text-[13px] text-ink outline-none focus:border-accent";
