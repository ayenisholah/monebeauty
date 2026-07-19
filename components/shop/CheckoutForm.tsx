"use client";

import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/shop/CartProvider";
import { ButtonAction } from "@/components/ui/Button";
import { formatPrice } from "@/content/products";
import { cn } from "@/lib/cn";
import { PUBLIC_PATHS } from "@/lib/public-routes";

type CheckoutAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  isDefault: boolean;
};

export function CheckoutForm({
  initialDetails,
  addresses = [],
  verifiedEmail = false,
}: {
  initialDetails?: { fullName: string; phone: string; email: string };
  addresses?: CheckoutAddress[];
  verifiedEmail?: boolean;
}) {
  const t = useTranslations("Checkout");
  const tb = useTranslations("Basket");
  const locale = useLocale();
  const cart = useCart();
  const [form, setForm] = useState({
    fullName: initialDetails?.fullName ?? "",
    phone: initialDetails?.phone ?? "",
    email: initialDetails?.email ?? "",
    notes: "",
  });
  const defaultAddress = addresses.find((address) => address.isDefault);
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "new");
  const [saveAddress, setSaveAddress] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    label: "Home",
    recipientName: initialDetails?.fullName ?? "",
    phone: initialDetails?.phone ?? "",
    line1: "",
    line2: "",
    postalCode: "",
    city: "",
  });
  const [consent, setConsent] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<
    "PICKUP" | "SHIPPING"
  >("PICKUP");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPhysical = cart.lines.some(
    (line) => (line.product.kind ?? "PHYSICAL") === "PHYSICAL",
  );

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
          fulfillmentMethod: hasPhysical ? fulfillmentMethod : "DIGITAL",
          ...(hasPhysical && fulfillmentMethod === "SHIPPING"
            ? {
                savedAddressId: addressId === "new" ? null : addressId,
                shippingAddress:
                  addressId === "new" ? shippingAddress : undefined,
                saveAddress: addressId === "new" && saveAddress,
              }
            : {}),
          items: cart.items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const key = String(data?.error ?? "generic");
        setError(
          t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.generic"),
        );
        return;
      }
      if (!data.checkoutUrl) {
        setError(t("errors.generic"));
        return;
      }
      window.location.assign(data.checkoutUrl);
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
              placeholder="+358 40 123 4567"
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
              readOnly={verifiedEmail}
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

        {hasPhysical ? (
          <fieldset className="mt-[20px]">
            <legend className="font-sans text-label tracking-[.04em] text-muted uppercase">
              {t("fulfillment.heading")}
            </legend>
            <div className="mt-[9px] grid gap-[10px] sm:grid-cols-2">
              {(["PICKUP", "SHIPPING"] as const).map((method) => (
                <label
                  key={method}
                  className={cn(
                    "flex min-h-[54px] cursor-pointer items-center gap-[10px] rounded-[4px] border px-[14px] font-sans text-[14px]",
                    fulfillmentMethod === method
                      ? "border-accent bg-btn-fill text-ink"
                      : "border-line-btn bg-page text-body",
                  )}
                >
                  <input
                    type="radio"
                    name="fulfillmentMethod"
                    value={method}
                    checked={fulfillmentMethod === method}
                    onChange={() => setFulfillmentMethod(method)}
                    className="h-[18px] w-[18px] accent-[var(--accent)]"
                  />
                  <span>{t(`fulfillment.${method.toLowerCase()}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {hasPhysical && fulfillmentMethod === "SHIPPING" ? (
          <fieldset className="mt-[20px] border-t border-line-hair pt-[18px]">
            <legend className="font-sans text-label tracking-[.04em] text-muted uppercase">
              {t("address.heading")}
            </legend>
            {addresses.length ? (
              <div className="mt-3 grid gap-2">
                {addresses.map((address) => (
                  <label key={address.id} className="flex cursor-pointer items-start gap-3 rounded border border-line-btn bg-page p-3 font-sans text-sm">
                    <input type="radio" checked={addressId === address.id} onChange={() => setAddressId(address.id)} className="mt-1 accent-[var(--accent)]" />
                    <span><strong>{address.label}</strong>{address.isDefault ? ` · ${t("address.default")}` : ""}<br />{address.line1}, {address.postalCode} {address.city}</span>
                  </label>
                ))}
              </div>
            ) : null}
            <label className="mt-2 flex cursor-pointer items-center gap-3 rounded border border-line-btn bg-page p-3 font-sans text-sm">
              <input type="radio" checked={addressId === "new"} onChange={() => setAddressId("new")} className="accent-[var(--accent)]" />
              {t("address.new")}
            </label>
            {addressId === "new" ? (
              <div className="mt-4 grid gap-3">
                <Field label={t("address.label")} required><input required value={shippingAddress.label} onChange={(e) => setShippingAddress({ ...shippingAddress, label: e.target.value })} className={inputCls} /></Field>
                <Field label={t("address.recipient")} required><input required autoComplete="name" value={shippingAddress.recipientName} onChange={(e) => setShippingAddress({ ...shippingAddress, recipientName: e.target.value })} className={inputCls} /></Field>
                <Field label={t("fields.phone")} required><input required type="tel" autoComplete="tel" value={shippingAddress.phone} onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })} className={inputCls} /></Field>
                <Field label={t("address.line1")} required><input required autoComplete="address-line1" value={shippingAddress.line1} onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })} className={inputCls} /></Field>
                <Field label={t("address.line2")}><input autoComplete="address-line2" value={shippingAddress.line2} onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })} className={inputCls} /></Field>
                <div className="grid gap-3 sm:grid-cols-2"><Field label={t("address.postalCode")} required><input required pattern="[0-9]{5}" autoComplete="postal-code" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })} className={inputCls} /></Field><Field label={t("address.city")} required><input required autoComplete="address-level2" value={shippingAddress.city} onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })} className={inputCls} /></Field></div>
                {verifiedEmail ? <label className="flex items-center gap-2 font-sans text-sm text-body"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-[var(--accent)]" />{t("address.save")}</label> : null}
              </div>
            ) : null}
            <p className="mt-3 font-sans text-xs leading-5 text-muted">{t("address.stripeConfirm")}</p>
          </fieldset>
        ) : null}

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
