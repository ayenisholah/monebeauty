import { revalidatePath } from "next/cache";
import type { ServiceCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, requireUser } from "@/lib/auth";

const categories: ServiceCategory[] = [
  "FACE",
  "BODY",
  "HAIR",
  "INJECTABLE",
  "DEVICE",
  "LASER",
  "CONSULTATION",
];

async function updateServiceAction(formData: FormData) {
  "use server";

  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  await prisma.service.update({
    where: { id },
    data: {
      category: String(formData.get("category")) as ServiceCategory,
      priceFrom: Number(formData.get("priceFrom") || 0),
      order: Number(formData.get("order") || 0),
      published: formData.get("published") === "on",
      heroImageAlt: String(formData.get("heroImageAlt") ?? "").trim() || null,
    },
  });
  await audit({
    actor: user.email,
    action: "service_updated",
    entity: "Service",
    entityId: id,
  });
  revalidatePath("/admin/services");
}

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ order: "asc" }, { slug: "asc" }],
  });

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        Services
      </h1>
      <div className="mt-[24px] grid gap-[16px]">
        {services.map((service) => (
          <form
            key={service.id}
            action={updateServiceAction}
            className="grid gap-[12px] rounded-[8px] border border-line-card bg-card p-[16px] lg:grid-cols-[1fr_180px_130px_120px_120px]"
          >
            <input type="hidden" name="id" value={service.id} />
            <Field label={service.slug}>
              <input
                name="heroImageAlt"
                defaultValue={service.heroImageAlt ?? ""}
                placeholder="Hero image alt text"
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <select name="category" defaultValue={service.category} className={inputCls}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price from">
              <input
                name="priceFrom"
                type="number"
                step="0.01"
                defaultValue={service.priceFrom ? Number(service.priceFrom) : 0}
                className={inputCls}
              />
            </Field>
            <Field label="Order">
              <input
                name="order"
                type="number"
                defaultValue={service.order}
                className={inputCls}
              />
            </Field>
            <div className="flex items-end gap-[12px]">
              <label className="flex min-h-[42px] items-center gap-[8px] font-sans text-[13px] text-body">
                <input
                  name="published"
                  type="checkbox"
                  defaultChecked={service.published}
                />
                Published
              </label>
              <button className="rounded-[4px] bg-accent px-[14px] py-[11px] font-sans text-[11px] tracking-[.12em] text-page uppercase">
                Save
              </button>
            </div>
          </form>
        ))}
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
    <label>
      <span className="mb-[6px] block font-sans text-[11px] tracking-[.08em] text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-page px-[10px] py-[9px] font-sans text-[13px] text-ink outline-none focus:border-accent";
