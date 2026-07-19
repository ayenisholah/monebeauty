"use client";

import { useEffect, useMemo, useState } from "react";
import { DatePicker } from "@/components/ui/CalendarPicker";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { TimePicker } from "@/components/ui/TimePicker";

type Locale = "en" | "fi" | "ru";
type Named = { id: string; name: string };
type Client = { id: string; fullName: string; phone: string; email: string };
type Service = {
  id: string;
  title: string;
  durationMin: number;
  requiresDevice: boolean;
  qualifiedPractitionerIds: string[];
  roomIds: string[];
  deviceIds: string[];
  procedures: Array<{ index: number; title: string; price: string }>;
};
type Options = {
  services: Service[];
  practitioners: Named[];
  rooms: Named[];
  devices: Named[];
  clients: Client[];
};
export type AppointmentDetail = {
  id: string;
  version: number;
  status: string;
  client: Client & { contraindications: string | null };
  clientId: string;
  serviceId: string;
  procedureIndex: number | null;
  start: string;
  end: string;
  notes: string | null;
  practitionerId: string;
  roomId: string | null;
  deviceId: string | null;
  locale: Locale;
};

const copy = {
  en: {
    create: "Create appointment",
    edit: "Edit appointment",
    client: "Client",
    search: "Search clients",
    searchAction: "Search",
    addClient: "Add a new client",
    existingClient: "Choose an existing client",
    name: "Full name",
    phone: "Phone",
    email: "Email",
    service: "Service",
    procedure: "Procedure",
    employee: "Employee",
    room: "Room",
    device: "Device",
    date: "Date",
    time: "Time",
    notes: "Booking notes",
    language: "Notification language",
    consent: "The client has accepted the privacy notice for this booking.",
    save: "Save appointment",
    cancel: "Close",
    confirm: "Confirm",
    complete: "Complete",
    cancelAppointment: "Cancel appointment",
    reason: "Cancellation reason",
    required: "Complete the required fields and try again.",
    conflict:
      "The appointment could not be saved. Refresh and choose another time or resource.",
  },
  fi: {
    create: "Luo ajanvaraus",
    edit: "Muokkaa ajanvarausta",
    client: "Asiakas",
    search: "Hae asiakkaita",
    searchAction: "Hae",
    addClient: "Lisää uusi asiakas",
    existingClient: "Valitse olemassa oleva asiakas",
    name: "Koko nimi",
    phone: "Puhelin",
    email: "Sähköposti",
    service: "Palvelu",
    procedure: "Toimenpide",
    employee: "Työntekijä",
    room: "Huone",
    device: "Laite",
    date: "Päivä",
    time: "Aika",
    notes: "Varausmuistiinpanot",
    language: "Ilmoitusten kieli",
    consent: "Asiakas on hyväksynyt tämän varauksen tietosuojailmoituksen.",
    save: "Tallenna ajanvaraus",
    cancel: "Sulje",
    confirm: "Vahvista",
    complete: "Merkitse valmiiksi",
    cancelAppointment: "Peru ajanvaraus",
    reason: "Peruutuksen syy",
    required: "Täytä pakolliset kentät ja yritä uudelleen.",
    conflict:
      "Ajanvarausta ei voitu tallentaa. Päivitä ja valitse toinen aika tai resurssi.",
  },
  ru: {
    create: "Создать запись",
    edit: "Изменить запись",
    client: "Клиент",
    search: "Поиск клиентов",
    searchAction: "Найти",
    addClient: "Добавить нового клиента",
    existingClient: "Выбрать существующего клиента",
    name: "Полное имя",
    phone: "Телефон",
    email: "Эл. почта",
    service: "Услуга",
    procedure: "Процедура",
    employee: "Сотрудник",
    room: "Кабинет",
    device: "Аппарат",
    date: "Дата",
    time: "Время",
    notes: "Примечания к записи",
    language: "Язык уведомлений",
    consent: "Клиент принял уведомление о конфиденциальности для этой записи.",
    save: "Сохранить запись",
    cancel: "Закрыть",
    confirm: "Подтвердить",
    complete: "Завершить",
    cancelAppointment: "Отменить запись",
    reason: "Причина отмены",
    required: "Заполните обязательные поля и повторите попытку.",
    conflict:
      "Не удалось сохранить запись. Обновите календарь и выберите другое время или ресурс.",
  },
} as const;

function ymd(value: string) {
  return value.slice(0, 10);
}

function hm(value: string) {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function AppointmentForm({
  locale,
  initialStart,
  initialPractitionerId,
  detail,
  onClose,
  onSaved,
}: {
  locale: Locale;
  initialStart: string;
  initialPractitionerId: string;
  detail?: AppointmentDetail | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const t = copy[locale];
  const [options, setOptions] = useState<Options | null>(null);
  const [search, setSearch] = useState("");
  const [newClient, setNewClient] = useState(!detail);
  const [clientId, setClientId] = useState(detail?.clientId ?? "");
  const [client, setClient] = useState({ fullName: "", phone: "", email: "" });
  const [serviceId, setServiceId] = useState(detail?.serviceId ?? "");
  const [procedureIndex, setProcedureIndex] = useState(
    detail?.procedureIndex ? String(detail.procedureIndex) : "",
  );
  const [practitionerId, setPractitionerId] = useState(
    detail?.practitionerId ?? initialPractitionerId,
  );
  const [roomId, setRoomId] = useState(detail?.roomId ?? "");
  const [deviceId, setDeviceId] = useState(detail?.deviceId ?? "");
  const [date, setDate] = useState(ymd(detail?.start ?? initialStart));
  const [time, setTime] = useState(hm(detail?.start ?? initialStart));
  const [notificationLocale, setNotificationLocale] = useState<Locale>(
    detail?.locale ?? locale,
  );
  const [notes, setNotes] = useState(detail?.notes ?? "");
  const [consent, setConsent] = useState(Boolean(detail));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load(q = "", nextLocale = notificationLocale) {
    const params = new URLSearchParams({ locale: nextLocale });
    if (q.trim()) params.set("q", q.trim());
    const response = await fetch(`/api/calendar/appointments?${params}`);
    if (!response.ok) throw new Error("load");
    setOptions((await response.json()) as Options);
  }

  useEffect(() => {
    const timer = window.setTimeout(
      () => void load().catch(() => setMessage(t.conflict)),
      0,
    );
    return () => window.clearTimeout(timer);
    // Initial option load only; searches and locale changes are explicit actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedService = options?.services.find(
    (item) => item.id === serviceId,
  );
  const employees =
    options?.practitioners.filter((item) =>
      selectedService?.qualifiedPractitionerIds.includes(item.id),
    ) ?? [];
  const rooms =
    options?.rooms.filter((item) =>
      selectedService?.roomIds.includes(item.id),
    ) ?? [];
  const devices =
    options?.devices.filter((item) =>
      selectedService?.deviceIds.includes(item.id),
    ) ?? [];
  const timeOptions = useMemo(
    () =>
      Array.from({ length: 65 }, (_, index) => {
        const minutes = 6 * 60 + index * 15;
        const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        return { value, label: value };
      }),
    [],
  );

  function pickService(value: string) {
    const next = options?.services.find((item) => item.id === value);
    setServiceId(value);
    setProcedureIndex("");
    if (next && !next.qualifiedPractitionerIds.includes(practitionerId))
      setPractitionerId(next.qualifiedPractitionerIds[0] ?? "");
    if (next && !next.roomIds.includes(roomId))
      setRoomId(next.roomIds[0] ?? "");
    if (next && !next.deviceIds.includes(deviceId))
      setDeviceId(next.deviceIds[0] ?? "");
  }

  async function save() {
    if (
      !serviceId ||
      !practitionerId ||
      !roomId ||
      (!clientId && !newClient) ||
      (!detail && !consent)
    ) {
      setMessage(t.required);
      return;
    }
    setSaving(true);
    setMessage(null);
    const start = `${date}T${time}:00.000Z`;
    const response = await fetch(
      detail
        ? `/api/calendar/appointments/${detail.id}`
        : "/api/calendar/appointments",
      {
        method: detail ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(detail ? { intent: "details", version: detail.version } : {}),
          clientId: newClient ? undefined : clientId,
          newClient: newClient ? client : undefined,
          serviceId,
          procedureIndex: procedureIndex || null,
          practitionerId,
          roomId,
          deviceId: deviceId || null,
          start,
          notes,
          locale: notificationLocale,
          consentGdpr: consent,
        }),
      },
    );
    setSaving(false);
    if (!response.ok) {
      setMessage(t.conflict);
      return;
    }
    await onSaved();
    onClose();
  }

  async function lifecycle(intent: "confirm" | "complete" | "cancel") {
    if (!detail) return;
    if (intent === "cancel" && reason.trim().length < 3) {
      setMessage(t.required);
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/calendar/appointments/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent, version: detail.version, reason }),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage(t.conflict);
      return;
    }
    await onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/35 p-[10px] sm:items-center"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-form-title"
        className="max-h-[94vh] w-full max-w-[760px] overflow-y-auto rounded-[10px] border border-line-card bg-card p-[clamp(18px,3vw,28px)] shadow-card"
      >
        <h2
          id="appointment-form-title"
          className="font-display text-[32px] font-medium"
        >
          {detail ? t.edit : t.create}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={t.client} wide>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={!newClient ? activeButton : button}
                onClick={() => setNewClient(false)}
              >
                {t.existingClient}
              </button>
              {!detail ? (
                <button
                  type="button"
                  className={newClient ? activeButton : button}
                  onClick={() => setNewClient(true)}
                >
                  {t.addClient}
                </button>
              ) : null}
            </div>
          </Field>
          {newClient ? (
            <>
              <Field label={t.name}>
                <input
                  className={input}
                  value={client.fullName}
                  onChange={(event) =>
                    setClient({ ...client, fullName: event.target.value })
                  }
                />
              </Field>
              <Field label={t.phone}>
                <input
                  className={input}
                  value={client.phone}
                  onChange={(event) =>
                    setClient({ ...client, phone: event.target.value })
                  }
                />
              </Field>
              <Field label={t.email} wide>
                <input
                  className={input}
                  type="email"
                  value={client.email}
                  onChange={(event) =>
                    setClient({ ...client, email: event.target.value })
                  }
                />
              </Field>
            </>
          ) : (
            <Field label={t.search} wide>
              <div className="flex gap-2">
                <input
                  className={input}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    void load(search).catch(() => setMessage(t.conflict))
                  }
                >
                  {t.searchAction}
                </button>
              </div>
              {detail && clientId === detail.clientId ? (
                <div className="mt-2 rounded border border-accent bg-btn-fill p-2 font-sans text-sm">
                  <strong>{detail.client.fullName}</strong>
                  <span className="block text-xs text-muted">
                    {detail.client.phone} · {detail.client.email}
                  </span>
                </div>
              ) : null}
              {options?.clients.length ? (
                <div className="mt-2 grid gap-1">
                  {options.clients.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setClientId(item.id)}
                      className={`rounded border p-2 text-left font-sans text-sm ${clientId === item.id ? "border-accent bg-btn-fill" : "border-line-card"}`}
                    >
                      <strong>{item.fullName}</strong>
                      <span className="block text-xs text-muted">
                        {item.phone} · {item.email}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </Field>
          )}
          <Field label={t.service}>
            <ThemedSelect
              value={serviceId}
              onValueChange={pickService}
              options={(options?.services ?? []).map((item) => ({
                value: item.id,
                label: item.title,
              }))}
            />
          </Field>
          <Field label={t.procedure}>
            <ThemedSelect
              value={procedureIndex}
              onValueChange={setProcedureIndex}
              options={[
                { value: "", label: "—" },
                ...(selectedService?.procedures ?? []).map((item) => ({
                  value: String(item.index),
                  label: `${item.title} · ${item.price}`,
                })),
              ]}
            />
          </Field>
          <Field label={t.employee}>
            <ThemedSelect
              value={practitionerId}
              onValueChange={setPractitionerId}
              options={employees.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Field>
          <Field label={t.room}>
            <ThemedSelect
              value={roomId}
              onValueChange={setRoomId}
              options={rooms.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Field>
          {selectedService?.requiresDevice ? (
            <Field label={t.device}>
              <ThemedSelect
                value={deviceId}
                onValueChange={setDeviceId}
                options={devices.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </Field>
          ) : null}
          <Field label={t.date}>
            <DatePicker
              locale={locale}
              value={date}
              onValueChange={setDate}
              ariaLabel={t.date}
            />
          </Field>
          <Field label={t.time}>
            <TimePicker
              value={time}
              onValueChange={setTime}
              options={timeOptions}
              ariaLabel={t.time}
            />
          </Field>
          <Field label={t.language}>
            <ThemedSelect
              value={notificationLocale}
              onValueChange={(value) => {
                const next = value as Locale;
                setNotificationLocale(next);
                setServiceId("");
                setProcedureIndex("");
                void load("", next).catch(() => setMessage(t.conflict));
              }}
              options={[
                { value: "fi", label: "Suomi" },
                { value: "en", label: "English" },
                { value: "ru", label: "Русский" },
              ]}
            />
          </Field>
          <Field label={t.notes} wide>
            <textarea
              className={`${input} min-h-[90px] py-2`}
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          {!detail ? (
            <label className="flex items-start gap-3 sm:col-span-2">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-accent"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span className="font-sans text-sm text-body">{t.consent}</span>
            </label>
          ) : null}
        </div>
        {detail?.client.contraindications ? (
          <p className="mt-4 rounded border border-[#c98383] bg-[#fff4f2] p-3 font-sans text-sm">
            <strong>Contraindication warning:</strong>{" "}
            {detail.client.contraindications}
          </p>
        ) : null}
        {message ? (
          <p
            role="status"
            className="mt-4 rounded border border-line-btn bg-btn-fill p-3 font-sans text-sm"
          >
            {message}
          </p>
        ) : null}
        {detail ? (
          <div className="mt-5 border-t border-line-hair pt-4">
            <div className="flex flex-wrap gap-2">
              {["BOOKED", "RESCHEDULED"].includes(detail.status) ? (
                <button
                  type="button"
                  disabled={saving}
                  className={button}
                  onClick={() => void lifecycle("confirm")}
                >
                  {t.confirm}
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving}
                className={button}
                onClick={() => void lifecycle("complete")}
              >
                {t.complete}
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className={input}
                value={reason}
                placeholder={t.reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <button
                type="button"
                disabled={saving}
                className="min-h-[44px] rounded border border-[#a34f4f] px-3 font-sans text-xs text-[#8c3434]"
                onClick={() => void lifecycle("cancel")}
              >
                {t.cancelAppointment}
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={button} onClick={onClose}>
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={saving}
            className={primaryButton}
            onClick={() => void save()}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "block sm:col-span-2" : "block"}>
      <span className="mb-1.5 block font-sans text-[11px] tracking-[.08em] text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

const input =
  "min-h-[44px] w-full rounded-[4px] border border-line-btn bg-page px-3 font-sans text-sm text-ink outline-none focus:border-accent";
const button =
  "inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-line-btn bg-card px-3 font-sans text-xs tracking-[.06em] uppercase";
const activeButton = `${button} border-accent bg-btn-fill`;
const primaryButton =
  "inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-accent bg-accent px-4 font-sans text-xs tracking-[.06em] text-page uppercase disabled:opacity-50";
