import { revalidatePath } from "next/cache";
import type { Locale, ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, requireUser } from "@/lib/auth";

const categories: ProductCategory[] = ["AROSHA_BODY", "DIXIDOX_TRICHO"];
const locales: Locale[] = ["en", "fi", "ru"];

async function updateProductAction(formData: FormData) {
  "use server";

  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const images = String(formData.get("images") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  await prisma.product.update({
    where: { id },
    data: {
      category: String(formData.get("category")) as ProductCategory,
      size: String(formData.get("size") ?? "").trim() || null,
      price: Number(formData.get("price") || 0),
      order: Number(formData.get("order") || 0),
      images,
      published: formData.get("published") === "on",
    },
  });

  for (const locale of locales) {
    const name = String(formData.get(`name_${locale}`) ?? "").trim();
    const description = String(
      formData.get(`description_${locale}`) ?? "",
    ).trim();
    if (!name && !description) continue;
    await prisma.productContent.upsert({
      where: { productId_locale: { productId: id, locale } },
      update: { name: name || slug, description },
      create: { productId: id, locale, name: name || slug, description },
    });
  }

  await audit({
    actor: user.email,
    action: "product_updated",
    entity: "Product",
    entityId: id,
  });
  revalidatePath("/admin/products");
  revalidatePath("/fi/catalog");
  revalidatePath(`/fi/catalog/${slug}`);
}

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ order: "asc" }, { slug: "asc" }],
    include: { contents: true },
  });

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        Products
      </h1>
      <div className="mt-[24px] grid gap-[18px]">
        {products.map((product) => {
          const byLocale = new Map(product.contents.map((c) => [c.locale, c]));
          return (
            <form
              key={product.id}
              action={updateProductAction}
              className="rounded-[8px] border border-line-card bg-card p-[16px]"
            >
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="slug" value={product.slug} />
              <div className="grid gap-[12px] lg:grid-cols-[1fr_180px_120px_100px]">
                <Field label={product.slug}>
                  <input
                    name="size"
                    defaultValue={product.size ?? ""}
                    placeholder="Size"
                    className={inputCls}
                  />
                </Field>
                <Field label="Category">
                  <select
                    name="category"
                    defaultValue={product.category}
                    className={inputCls}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Price">
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={Number(product.price)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Order">
                  <input
                    name="order"
                    type="number"
                    defaultValue={product.order}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Images">
                <textarea
                  name="images"
                  rows={2}
                  defaultValue={product.images.join("\n")}
                  className={inputCls}
                />
              </Field>
              <div className="mt-[12px] grid gap-[12px] lg:grid-cols-3">
                {locales.map((locale) => {
                  const content = byLocale.get(locale);
                  return (
                    <div key={locale} className="rounded-[6px] border border-line-hair p-[12px]">
                      <Field label={`${locale} name`}>
                        <input
                          name={`name_${locale}`}
                          defaultValue={content?.name ?? ""}
                          className={inputCls}
                        />
                      </Field>
                      <Field label={`${locale} description`}>
                        <textarea
                          name={`description_${locale}`}
                          rows={5}
                          defaultValue={content?.description ?? ""}
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  );
                })}
              </div>
              <div className="mt-[14px] flex items-center gap-[14px]">
                <label className="flex items-center gap-[8px] font-sans text-[13px] text-body">
                  <input
                    name="published"
                    type="checkbox"
                    defaultChecked={product.published}
                  />
                  Published
                </label>
                <button className="rounded-[4px] bg-accent px-[16px] py-[11px] font-sans text-[11px] tracking-[.12em] text-page uppercase">
                  Save product
                </button>
              </div>
            </form>
          );
        })}
      </div>
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
