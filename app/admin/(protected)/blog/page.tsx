import { revalidatePath } from "next/cache";
import type { Locale } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, requireUser } from "@/lib/auth";

const locales: Locale[] = ["en", "fi", "ru"];

async function saveArticleAction(formData: FormData) {
  "use server";

  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "").trim();
  const published = formData.get("published") === "on";
  const article = id
    ? await prisma.article.update({
        where: { id },
        data: {
          slug,
          published,
          publishedAt: published ? new Date() : null,
          coverAlt: String(formData.get("coverAlt") ?? "").trim() || null,
        },
      })
    : await prisma.article.create({
        data: {
          slug,
          published,
          publishedAt: published ? new Date() : null,
          coverAlt: String(formData.get("coverAlt") ?? "").trim() || null,
        },
      });

  for (const locale of locales) {
    const title = String(formData.get(`title_${locale}`) ?? "").trim();
    const body = String(formData.get(`body_${locale}`) ?? "").trim();
    if (!title && !body) continue;
    await prisma.articleContent.upsert({
      where: { articleId_locale: { articleId: article.id, locale } },
      update: {
        title: title || slug,
        excerpt: String(formData.get(`excerpt_${locale}`) ?? "").trim() || null,
        body,
      },
      create: {
        articleId: article.id,
        locale,
        title: title || slug,
        excerpt: String(formData.get(`excerpt_${locale}`) ?? "").trim() || null,
        body,
      },
    });
  }

  await audit({
    actor: user.email,
    action: id ? "article_updated" : "article_created",
    entity: "Article",
    entityId: article.id,
  });
  revalidatePath("/admin/blog");
}

export default async function AdminBlogPage() {
  const articles = await prisma.article.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { contents: true },
  });

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        Blog
      </h1>
      <section className="mt-[24px] rounded-[8px] border border-line-card bg-card p-[16px]">
        <h2 className="font-display text-[26px] font-medium">New article</h2>
        <ArticleForm />
      </section>
      <div className="mt-[20px] grid gap-[18px]">
        {articles.map((article) => (
          <section
            key={article.id}
            className="rounded-[8px] border border-line-card bg-card p-[16px]"
          >
            <ArticleForm article={article} />
          </section>
        ))}
      </div>
    </div>
  );
}

function ArticleForm({
  article,
}: {
  article?: {
    id: string;
    slug: string;
    published: boolean;
    coverAlt: string | null;
    contents: {
      locale: Locale;
      title: string;
      excerpt: string | null;
      body: string;
    }[];
  };
}) {
  const byLocale = new Map(article?.contents.map((c) => [c.locale, c]) ?? []);
  return (
    <form action={saveArticleAction} className="mt-[12px] grid gap-[12px]">
      <input type="hidden" name="id" value={article?.id ?? ""} />
      <div className="grid gap-[12px] md:grid-cols-[1fr_1fr_auto]">
        <Field label="Slug">
          <input name="slug" defaultValue={article?.slug ?? ""} required className={inputCls} />
        </Field>
        <Field label="Cover alt">
          <input name="coverAlt" defaultValue={article?.coverAlt ?? ""} className={inputCls} />
        </Field>
        <label className="flex items-end gap-[8px] font-sans text-[13px] text-body">
          <input
            name="published"
            type="checkbox"
            defaultChecked={article?.published ?? false}
          />
          Published
        </label>
      </div>
      <div className="grid gap-[12px] lg:grid-cols-3">
        {locales.map((locale) => {
          const content = byLocale.get(locale);
          return (
            <div key={locale} className="rounded-[6px] border border-line-hair p-[12px]">
              <Field label={`${locale} title`}>
                <input
                  name={`title_${locale}`}
                  defaultValue={content?.title ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={`${locale} excerpt`}>
                <textarea
                  name={`excerpt_${locale}`}
                  rows={2}
                  defaultValue={content?.excerpt ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label={`${locale} body`}>
                <textarea
                  name={`body_${locale}`}
                  rows={7}
                  defaultValue={content?.body ?? ""}
                  className={inputCls}
                />
              </Field>
            </div>
          );
        })}
      </div>
      <button className="w-fit rounded-[4px] bg-accent px-[16px] py-[11px] font-sans text-[11px] tracking-[.12em] text-page uppercase">
        Save article
      </button>
    </form>
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
    <label className="block">
      <span className="mb-[6px] block font-sans text-[11px] tracking-[.08em] text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-page px-[10px] py-[9px] font-sans text-[13px] text-ink outline-none focus:border-accent";
