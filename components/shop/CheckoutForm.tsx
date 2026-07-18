"use client";

import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/shop/CartProvider";
import { ButtonAction } from "@/components/ui/Button";
import { formatPrice } from "@/content/products";
import { localizedPath } from "@/lib/seo";
import { cn } from "@/lib/cn";
import { PUBLIC_PATHS, orderPath } from "@/lib/public-routes";

export function CheckoutForm() {
  const t = useTranslations("Checkout");
  const tb = useTranslations("Basket");
  const locale = useLocale();
  const cart = useCart();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          locale,
          consentGdpr: consent,
          items: cart.items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t(`errors.${data?.error ?? "generic"}`));
        return;
      }
      cart.clear();
      window.location.assign(localizedPath(orderPath(data.id), locale));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-[480px] rounded-[var(--radius)] border border-line-card bg-card p-[clamp(24px,4vw,40px)] text-center">
        <p className="font-sans text-[15px] text-body">{tb("empty")}</p>
        <Link
          href={PUBLIC_PATHS.shop}
          className="mt-[22px] inline-flex min-h-[44px] items-center rounded-[4px] bg-accent px-[24px] font-sans text-[12px] font-medium tracking-[.16em] text-page uppercase"
        >
          {tb("browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-[clamp(24px,4vw,48px)] lg:grid-cols-[1fr_360px]">
      <form
        className="rounded-[var(--radius)] border border-line-card bg-card p-[clamp(22px,3vw,36px)]"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {error ? (
          <p
            role="alert"
            className="mb-[18px] rounded-[4px] border border-line-btn bg-btn-fill px-[14px] py-[10px] font-sans text-[14px] text-ink"
          >
            {error}
          </p>
        ) : null}
        <div className="grid gap-[14px]">
          <Field label={t("fields.name")} required>
            <input
              required
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label={t("fields.phone")} required>
            <input
              required
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label={t("fields.email")} required>
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label={t("fields.notes")}>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={cn(inputCls, "resize-y")}
            />
          </Field>
        </div>

        <label className="mt-[18px] flex items-start gap-[10px] font-sans text-[14px] leading-[1.6] text-body">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-[3px] h-[18px] w-[18px] accent-[var(--accent)]"
          />
          <span>{t("fields.consent")}</span>
        </label>

        <div className="mt-[24px]">
          <ButtonAction
            type="submit"
            iconRight={ArrowRight}
            disabled={submitting || !consent}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t("submitting") : t("submit")}
          </ButtonAction>
        </div>
      </form>

      <aside className="h-fit rounded-[var(--radius)] border border-line-card bg-card p-[clamp(20px,3vw,28px)]">
        <h2 className="font-display text-[26px] font-medium text-ink">
          {t("summary")}
        </h2>
        <div className="mt-[18px] space-y-[12px]">
          {cart.lines.map((line) => {
            const name =
              line.product.i18n[locale as "fi" | "en" | "ru"]?.name ??
              line.product.slug;
            return (
              <div
                key={line.product.slug}
                className="flex justify-between gap-[14px] border-b border-line-hair pb-[12px] font-sans text-[14px]"
              >
                <span className="text-body">
                  {line.qty} x {name}
                </span>
                <span className="shrink-0 text-ink">
                  {formatPrice(line.lineTotal)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-[16px] flex justify-between gap-[16px] font-sans text-[15px] font-medium text-ink">
          <span>{tb("subtotal")}</span>
          <span>{formatPrice(cart.subtotal)}</span>
        </div>
      </aside>
    </div>
  );
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-page px-[14px] py-[11px] font-sans text-copy text-ink outline-none focus:border-accent";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[6px] block font-sans text-label tracking-[.04em] text-muted uppercase">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
