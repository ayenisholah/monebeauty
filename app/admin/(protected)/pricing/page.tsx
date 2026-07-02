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

async function savePricingAction(formData: FormData) {
  "use server";

  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "") || null;
  const category = String(formData.get("category") ?? "") as ServiceCategory | "";
  const data = {
    serviceId,
    category: category || null,
    label: String(formData.get("label") ?? "").trim(),
    price: Number(formData.get("price") || 0),
    unit: String(formData.get("unit") ?? "").trim() || null,
    order: Number(formData.get("order") || 0),
  };

  const saved = id
    ? await prisma.pricingItem.update({ where: { id }, data })
    : await prisma.pricingItem.create({ data });

  await audit({
    actor: user.email,
    action: id ? "pricing_updated" : "pricing_created",
    entity: "PricingItem",
    entityId: saved.id,
  });
  revalidatePath("/admin/pricing");
}

export default async function AdminPricingPage() {
  const [items, services] = await Promise.all([
    prisma.pricingItem.findMany({
      orderBy: [{ order: "asc" }, { label: "asc" }],
      include: { service: { select: { slug: true } } },
    }),
    prisma.service.findMany({ orderBy: { slug: "asc" }, select: { id: true, slug: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-[clamp(34px,5vw,56px)] font-medium">
        Pricing
      </h1>
      <section className="mt-[24px] rounded-[8px] border border-line-card bg-card p-[16px]">
        <h2 className="font-display text-[26px] font-medium">New price item</h2>
        <PriceForm services={services} />
      </section>
      <div className="mt-[20px] grid gap-[14px]">
        {items.map((item) => (
          <section
            key={item.id}
            className="rounded-[8px] border border-line-card bg-card p-[16px]"
          >
            <PriceForm item={item} services={services} />
          </section>
        ))}
      </div>
    </div>
  );
}

function PriceForm({
  item,
  services,
}: {
  item?: {
    id: string;
    serviceId: string | null;
    category: string | null;
    label: string;
    price: unknown;
    unit: string | null;
    order: number;
  };
  services: { id: string; slug: string }[];
}) {
  return (
    <form
      action={savePricingAction}
      className="mt-[12px] grid gap-[12px] lg:grid-cols-[1fr_180px_140px_120px_90px_auto]"
    >
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <Field label="Label">
        <input name="label" defaultValue={item?.label ?? ""} className={inputCls} />
      </Field>
      <Field label="Service">
        <select name="serviceId" defaultValue={item?.serviceId ?? ""} className={inputCls}>
          <option value="">None</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.slug}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Category">
        <select name="category" defaultValue={item?.category ?? ""} className={inputCls}>
          <option value="">None</option>
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
          defaultValue={item ? Number(item.price) : 0}
          className={inputCls}
        />
      </Field>
      <Field label="Order">
        <input
          name="order"
          type="number"
          defaultValue={item?.order ?? 0}
          className={inputCls}
        />
      </Field>
      <Field label="Unit">
        <input name="unit" defaultValue={item?.unit ?? ""} className={inputCls} />
      </Field>
      <button className="rounded-[4px] bg-accent px-[16px] py-[11px] font-sans text-[11px] tracking-[.12em] text-page uppercase lg:col-start-6">
        Save
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
