"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  CheckCircle,
  Phone,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { ButtonAction } from "@/components/ui/Button";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { cn } from "@/lib/cn";

type ServiceOption = { key: string; image: string | null };
type Slot = { start: string; label: string };
type Fallback = {
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
};

type Step = 1 | 2 | 3;

export function BookingWizard({
  services,
  initialService,
  fallback,
}: {
  services: ServiceOption[];
  initialService?: string;
  fallback: Fallback;
}) {
  const t = useTranslations("Booking");
  const locale = useLocale();

  const [step, setStep] = useState<Step>(initialService ? 2 : 1);
  const [service, setService] = useState<string | null>(initialService ?? null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsDegraded, setSlotsDegraded] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    id: string;
    start: string;
  } | null>(null);

  const dateTimeFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const loadSlots = useCallback(async (d: string, svc: string) => {
    setSlotsLoading(true);
    setSlotsDegraded(false);
    setSlots([]);
    try {
      const res = await fetch(
        `/api/booking/slots?date=${encodeURIComponent(d)}&service=${encodeURIComponent(svc)}`,
      );
      const data = await res.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
      setSlotsDegraded(Boolean(data.degraded));
    } catch {
      setSlotsDegraded(true);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  function pickService(key: string) {
    setService(key);
    setSlot(null);
    setDate(null);
    setSlots([]);
    setStep(2);
  }

  function pickDate(value: string) {
    setDate(value);
    setSlot(null);
    if (service) void loadSlots(value, service);
  }

  function pickSlot(s: Slot) {
    setSlot(s);
    setError(null);
    setStep(3);
  }

  async function submit() {
    if (!service || !slot) return;
    setSubmitting(true);
    setError(null);
    setShowFallback(false);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          start: slot.start,
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          notes: form.notes,
          consentGdpr: consent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmation({ id: data.id, start: data.start });
        return;
      }
      if (res.status === 409) {
        setError(t("errors.slotTaken"));
        setStep(2);
        if (date && service) loadSlots(date, service);
        return;
      }
      if (data?.degraded) {
        setShowFallback(true);
        setError(t("errors.unavailable"));
        return;
      }
      setError(t("errors.generic"));
    } catch {
      setShowFallback(true);
      setError(t("errors.unavailable"));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setConfirmation(null);
    setStep(1);
    setService(null);
    setDate(null);
    setSlot(null);
    setForm({ fullName: "", phone: "", email: "", notes: "" });
    setConsent(false);
    setError(null);
    setShowFallback(false);
  }

  const chip =
    "min-h-[44px] rounded-[4px] border px-[16px] py-[10px] font-sans text-[13px] transition-colors";
  const chipIdle =
    "border-line-btn text-ink hover:border-line-btn-hover hover:bg-btn-fill";

  // ---- Confirmation view ------------------------------------------------------
  if (confirmation) {
    const label = service ? t(`services.${service}`) : "";
    return (
      <div className="mt-[clamp(28px,4vw,44px)] rounded-[var(--radius)] border border-line-card bg-card p-[clamp(24px,4vw,44px)] text-center">
        <CheckCircle size={48} weight="thin" className="mx-auto text-accent" />
        <h2 className="mt-[16px] font-display text-[clamp(26px,3.4vw,40px)] leading-[1.1] font-medium text-ink">
          {t("confirmed.title")}
        </h2>
        <p className="mx-auto mt-[12px] max-w-[440px] font-sans text-[14px] leading-[1.7] font-light text-body">
          {t("confirmed.body")}
        </p>
        <dl className="mx-auto mt-[24px] max-w-[360px] space-y-[10px] text-left font-sans text-[14px] text-ink">
          <div className="flex justify-between gap-[16px] border-b border-line-hair pb-[10px]">
            <dt className="text-muted">{t("summary.service")}</dt>
            <dd className="text-right font-medium">{label}</dd>
          </div>
          <div className="flex justify-between gap-[16px] border-b border-line-hair pb-[10px]">
            <dt className="text-muted">{t("summary.time")}</dt>
            <dd className="text-right font-medium">
              {dateTimeFmt.format(new Date(confirmation.start))}
            </dd>
          </div>
          <div className="flex justify-between gap-[16px]">
            <dt className="text-muted">{t("summary.reference")}</dt>
            <dd className="text-right font-mono text-[12px] tracking-[.06em] uppercase">
              {confirmation.id.slice(-8)}
            </dd>
          </div>
        </dl>
        <div className="mt-[28px]">
          <ButtonAction variant="outline" onClick={reset}>
            {t("confirmed.again")}
          </ButtonAction>
        </div>
      </div>
    );
  }

  // ---- Wizard -----------------------------------------------------------------
  const stepLabels = [t("steps.service"), t("steps.time"), t("steps.you")];

  return (
    <div>
      {/* Progress */}
      <ol className="flex flex-wrap items-center gap-[8px] font-sans text-[12px] tracking-[.06em] uppercase">
        {stepLabels.map((label, i) => {
          const n = (i + 1) as Step;
          const done = n < step;
          const active = n === step;
          return (
            <li key={label} className="flex items-center gap-[8px]">
              <button
                type="button"
                disabled={n >= step}
                onClick={() => setStep(n)}
                className={cn(
                  "flex min-h-[36px] items-center gap-[8px] rounded-[4px] px-[10px]",
                  active
                    ? "text-ink"
                    : done
                      ? "text-accent hover:underline"
                      : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "grid h-[24px] w-[24px] place-items-center rounded-full border text-[12px]",
                    active
                      ? "border-accent bg-accent text-page"
                      : done
                        ? "border-accent text-accent"
                        : "border-line-btn text-muted",
                  )}
                >
                  {n}
                </span>
                {label}
              </button>
              {i < 2 && <span className="text-line-btn">·</span>}
            </li>
          );
        })}
      </ol>

      {error && (
        <p
          role="alert"
          className="mt-[16px] rounded-[4px] border border-line-btn bg-btn-fill px-[14px] py-[10px] font-sans text-[13px] text-ink"
        >
          {error}
        </p>
      )}

      {/* Step 1 — Service */}
      {step === 1 && (
        <div className="mt-[clamp(20px,3vw,32px)] grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[14px]">
          {services.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => pickService(s.key)}
              className="group flex min-h-[44px] flex-col overflow-hidden rounded-[var(--radius)] border border-line-card bg-card text-left transition-all hover:-translate-y-[3px] hover:border-line-card-hover hover:shadow-card"
            >
              {s.image && (
                <span className="relative block h-[128px] w-full overflow-hidden">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    sizes="200px"
                  />
                </span>
              )}
              <span className="flex min-h-[70px] flex-1 items-center justify-between gap-[12px] px-[16px] py-[14px] font-sans text-[14px] leading-[1.35] font-medium text-ink">
                {t(`services.${s.key}`)}
                <ArrowRight size={15} weight="thin" className="text-accent" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Time */}
      {step === 2 && (
        <div className="mt-[clamp(20px,3vw,32px)] flex flex-col gap-[28px] md:flex-row md:gap-[32px]">
          <div>
            <p className="mb-[12px] font-sans text-[13px] font-medium tracking-[.04em] text-muted uppercase">
              {t("pickDate")}
            </p>
            <BookingCalendar value={date} onSelect={pickDate} />
          </div>

          <div className="flex-1">
            <p className="mb-[12px] font-sans text-[13px] font-medium tracking-[.04em] text-muted uppercase">
              {t("pickTime")}
            </p>
            {!date ? (
              <p className="font-sans text-[13px] text-muted">
                {t("pickDateFirst")}
              </p>
            ) : slotsLoading ? (
              <p className="font-sans text-[13px] text-muted">{t("loading")}</p>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-[8px]">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => pickSlot(s)}
                    className={cn(chip, "text-center", chipIdle)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            ) : slotsDegraded ? (
              <FallbackBlock t={t} fallback={fallback} />
            ) : (
              <p className="font-sans text-[13px] text-muted">{t("noTimes")}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3 — You */}
      {step === 3 && slot && (
        <form
          className="mt-[clamp(20px,3vw,32px)] max-w-[520px]"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="mb-[20px] font-sans text-[14px] text-body">
            {t("summary.time")}:{" "}
            <span className="font-medium text-ink">
              {dateTimeFmt.format(new Date(slot.start))}
            </span>
          </p>

          <div className="grid gap-[14px]">
            <Field label={t("fields.name")} required>
              <input
                type="text"
                required
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label={t("fields.phone")} required>
              <input
                type="tel"
                required
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label={t("fields.email")} required>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label={t("fields.notes")}>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={cn(inputCls, "resize-y")}
              />
            </Field>
          </div>

          <label className="mt-[18px] flex items-start gap-[10px] font-sans text-[13px] leading-[1.6] text-body">
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

          {showFallback && <FallbackBlock t={t} fallback={fallback} />}
        </form>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-[4px] border border-line-btn bg-page px-[14px] py-[11px] font-sans text-[14px] text-ink outline-none focus:border-accent";

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
      <span className="mb-[6px] block font-sans text-[12px] tracking-[.04em] text-muted uppercase">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
    </label>
  );
}

function FallbackBlock({
  t,
  fallback,
}: {
  t: ReturnType<typeof useTranslations>;
  fallback: Fallback;
}) {
  return (
    <div className="mt-[16px] rounded-[var(--radius)] border border-line-card bg-card p-[18px]">
      <p className="font-sans text-[13px] leading-[1.7] text-body">
        {t("fallback")}
      </p>
      <div className="mt-[12px] flex flex-wrap gap-[10px]">
        <a
          href={fallback.phoneHref}
          className="inline-flex min-h-[44px] items-center gap-[8px] rounded-[4px] bg-accent px-[18px] font-sans text-[12px] tracking-[.14em] text-page uppercase"
        >
          <Phone size={16} weight="thin" /> {fallback.phone}
        </a>
        <a
          href={fallback.emailHref}
          className="inline-flex min-h-[44px] items-center gap-[8px] rounded-[4px] border border-line-btn px-[18px] font-sans text-[12px] tracking-[.14em] text-ink uppercase"
        >
          <EnvelopeSimple size={16} weight="thin" /> {fallback.email}
        </a>
      </div>
    </div>
  );
}
