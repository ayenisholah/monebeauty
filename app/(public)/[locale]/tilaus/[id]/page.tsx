import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react/ssr";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/content/products";
import { PUBLIC_PATHS } from "@/lib/public-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Order" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Order");
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <section className="bg-page py-[clamp(60px,8vw,120px)]">
      <Container className="max-w-[760px]">
        <div className="rounded-[var(--radius)] border border-line-card bg-card p-[clamp(24px,4vw,48px)] text-center">
          <CheckCircle
            size={52}
            weight="thin"
            className="mx-auto text-accent"
          />
          <h1 className="mt-[16px] font-display text-h2 leading-[1.06] font-medium text-ink">
            {t(`states.${order.status}`)}
          </h1>
          <p className="mx-auto mt-[14px] max-w-[520px] font-sans text-[15px] leading-[1.75] font-light text-body">
            {t(`stateDescriptions.${order.status}`)}
          </p>
          <div className="mx-auto mt-[24px] max-w-[520px] text-left">
            <dl className="space-y-[12px] font-sans text-[14px]">
              <div className="flex justify-between gap-[16px] border-b border-line-hair pb-[12px]">
                <dt className="text-muted">{t("reference")}</dt>
                <dd className="font-mono text-[12px] tracking-[.06em] text-ink uppercase">
                  {order.id.slice(-8)}
                </dd>
              </div>
              <div className="flex justify-between gap-[16px] border-b border-line-hair pb-[12px]">
                <dt className="text-muted">{t("status")}</dt>
                <dd className="font-medium text-ink">
                  {t(`states.${order.status}`)}
                </dd>
              </div>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-[16px] border-b border-line-hair pb-[12px]"
                >
                  <dt className="text-body">
                    {item.qty} x {item.name}
                  </dt>
                  <dd className="shrink-0 text-ink">
                    {formatPrice(Number(item.unitPrice) * item.qty)}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-[16px] pt-[4px] font-medium text-ink">
                <dt>{t("total")}</dt>
                <dd>{formatPrice(Number(order.total))}</dd>
              </div>
              {order.cancellationReason ? (
                <div className="mt-[14px] rounded-[4px] bg-btn-fill p-[14px]">
                  <dt className="text-muted">{t("cancellationReason")}</dt>
                  <dd className="mt-[4px] text-ink">
                    {order.cancellationReason}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="mt-[30px]">
            <Button href={PUBLIC_PATHS.shop} variant="outline">
              {t("backToCatalog")}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
