"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  CaretDown,
  Check,
  MagnifyingGlass,
  SpinnerGap,
} from "@phosphor-icons/react";
import { DatePicker } from "@/components/ui/CalendarPicker";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { TimePicker } from "@/components/ui/TimePicker";
import { availabilityCovers, type StaffSlot } from "@/lib/staff-schedule";
import { BUSINESS_HOURS } from "@/lib/booking-config";
import { clinicTodayYmd } from "@/lib/clinic-date";

type Locale = "en" | "fi" | "ru";
type Named = { id: string; name: string; workingHours?: unknown };
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
    searchHint: "Enter at least 2 characters",
    searchLoading: "Searching clients…",
    searchEmpty: "No clients found",
    searchError: "Client search could not be loaded",
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
    duration: "Duration",
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
    searchHint: "Kirjoita vähintään 2 merkkiä",
    searchLoading: "Haetaan asiakkaita…",
    searchEmpty: "Asiakkaita ei löytynyt",
    searchError: "Asiakashakua ei voitu ladata",
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
    duration: "Kesto",
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
    searchHint: "Введите не менее 2 символов",
    searchLoading: "Поиск клиентов…",
    searchEmpty: "Клиенты не найдены",
    searchError: "Не удалось загрузить поиск клиентов",
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
    duration: "Продолжительность",
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

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function AppointmentForm({
  locale,
  initialStart,
  initialPractitionerId,
  initialDurationMin,
  detail,
  onClose,
  onSaved,
}: {
  locale: Locale;
  initialStart: string;
  initialPractitionerId: string;
  initialDurationMin?: number;
  detail?: AppointmentDetail | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const t = copy[locale];
  const [options, setOptions] = useState<Options | null>(null);
  const [newClient, setNewClient] = useState(!detail);
  const [clientId, setClientId] = useState(detail?.clientId ?? "");
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    detail?.client ?? null,
  );
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
  const [openedAt] = useState(() => Date.now());
  const [availableDates, setAvailableDates] = useState<string[] | undefined>();
  const [scheduleSlots, setScheduleSlots] = useState<StaffSlot[]>([]);

  async function load(nextLocale = notificationLocale) {
    const params = new URLSearchParams({ locale: nextLocale });
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

  useEffect(() => {
    if (!practitionerId) return;
    const from = clinicTodayYmd();
    const to = addDays(from, BUSINESS_HOURS.daysAhead);
    let live = true;
    fetch(
      `/api/staff/schedule?from=${from}&to=${to}&practitionerId=${encodeURIComponent(practitionerId)}`,
    )
      .then((response) => response.json())
      .then((payload) => {
        if (live)
          setAvailableDates(
            Array.isArray(payload.dates) ? payload.dates : undefined,
          );
      })
      .catch(() => {
        if (live) setAvailableDates(undefined);
      });
    return () => {
      live = false;
    };
  }, [practitionerId]);

  useEffect(() => {
    if (!practitionerId || !date) return;
    let live = true;
    const params = new URLSearchParams({ date, practitionerId });
    if (detail?.id) params.set("excludeId", detail.id);
    fetch(`/api/staff/schedule?${params}`)
      .then((response) => response.json())
      .then((payload) => {
        if (live)
          setScheduleSlots(Array.isArray(payload.slots) ? payload.slots : []);
      })
      .catch(() => {
        if (live) setScheduleSlots([]);
      });
    return () => {
      live = false;
    };
  }, [date, detail?.id, practitionerId]);

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
  const selectedDuration = selectedService?.durationMin ?? 0;
  const appointmentDuration =
    !detail && initialDurationMin ? initialDurationMin : selectedDuration;
  const timeOptions = (() => {
    const duration = appointmentDuration;
    if (!duration) return [];
    return scheduleSlots
      .filter((slot) => slot.status === "open")
      .filter((slot) => {
        const start = new Date(slot.start);
        const end = new Date(start.getTime() + duration * 60000);
        return (
          start.getTime() > openedAt &&
          availabilityCovers(scheduleSlots, start, end)
        );
      })
      .map((slot) => {
        const value = hm(slot.start);
        return { value, label: value };
      });
  })();

  function pickService(value: string) {
    const next = options?.services.find((item) => item.id === value);
    setServiceId(value);
    setProcedureIndex("");
    setTime("");
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
      !timeOptions.some((option) => option.value === time) ||
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
          ...(!detail && initialDurationMin
            ? { durationMin: initialDurationMin }
            : {}),
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
          <div className="sm:col-span-2">
            <span className="mb-1.5 block font-sans text-[11px] tracking-[.08em] text-muted uppercase">
              {t.client}
            </span>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <ClientCombobox
                locale={notificationLocale}
                selected={selectedClient}
                active={!newClient}
                labels={{
                  trigger: t.existingClient,
                  search: t.search,
                  hint: t.searchHint,
                  loading: t.searchLoading,
                  empty: t.searchEmpty,
                  error: t.searchError,
                }}
                onSelect={(next) => {
                  setSelectedClient(next);
                  setClientId(next.id);
                  setNewClient(false);
                }}
                onOpen={() => {
                  if (selectedClient) setNewClient(false);
                }}
              />
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
          </div>
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
          ) : null}
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
              onValueChange={(value) => {
                setPractitionerId(value);
                setTime("");
              }}
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
              onValueChange={(value) => {
                setDate(value);
                setTime("");
              }}
              ariaLabel={t.date}
              min={clinicTodayYmd()}
              max={addDays(clinicTodayYmd(), BUSINESS_HOURS.daysAhead)}
              availableDates={availableDates}
            />
          </Field>
          <Field label={t.time}>
            <TimePicker
              value={time}
              onValueChange={setTime}
              options={timeOptions}
              ariaLabel={t.time}
              disabled={
                !serviceId || !practitionerId || timeOptions.length === 0
              }
            />
          </Field>
          {initialDurationMin && !detail ? (
            <Field label={t.duration}>
              <div className={`${input} flex items-center`}>
                {initialDurationMin} min
              </div>
            </Field>
          ) : null}
          <Field label={t.language}>
            <ThemedSelect
              value={notificationLocale}
              onValueChange={(value) => {
                const next = value as Locale;
                setNotificationLocale(next);
                setServiceId("");
                setProcedureIndex("");
                void load(next).catch(() => setMessage(t.conflict));
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

function ClientCombobox({
  locale,
  selected,
  active,
  labels,
  onSelect,
  onOpen,
}: {
  locale: Locale;
  selected: Client | null;
  active?: boolean;
  labels: {
    trigger: string;
    search: string;
    hint: string;
    loading: string;
    empty: string;
    error: string;
  };
  onSelect: (client: Client) => void;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setStatus("idle");
  }

  useEffect(() => {
    function dismiss(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node))
        close();
    }
    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (!open || normalized.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams({ locale, q: normalized });
        const response = await fetch(`/api/calendar/appointments?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("client_search");
        const payload = (await response.json()) as { clients?: Client[] };
        setResults(Array.isArray(payload.clients) ? payload.clients : []);
        setStatus("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setResults([]);
        setStatus("error");
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locale, open, query]);

  function choose(client: Client) {
    onSelect(client);
    close();
    window.requestAnimationFrame(() =>
      rootRef.current
        ?.querySelector<HTMLButtonElement>("[data-client-trigger]")
        ?.focus(),
    );
  }

  function onOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      window.requestAnimationFrame(() =>
        rootRef.current
          ?.querySelector<HTMLButtonElement>("[data-client-trigger]")
          ?.focus(),
      );
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = (index + direction + results.length) % results.length;
      optionRefs.current[next]?.focus();
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        data-client-trigger
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (open) close();
          else {
            onOpen();
            setOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            onOpen();
            setOpen(true);
          }
        }}
        className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[4px] border bg-page px-3 text-left font-sans text-sm outline-none focus:border-accent ${active ? "border-accent bg-btn-fill" : "border-line-btn"}`}
      >
        <span className="min-w-0 truncate">
          {selected?.fullName ?? labels.trigger}
        </span>
        <CaretDown
          size={15}
          weight="thin"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-[120] w-full min-w-[300px] overflow-hidden rounded-[7px] border border-line-card bg-card shadow-card">
          <label className="flex items-center gap-2 border-b border-line-hair px-3">
            <MagnifyingGlass size={16} weight="thin" className="text-muted" />
            <input
              autoFocus
              type="search"
              value={query}
              aria-label={labels.search}
              placeholder={labels.search}
              onChange={(event) => {
                const next = event.target.value;
                setQuery(next);
                if (next.trim().length < 2) {
                  setResults([]);
                  setStatus("idle");
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  close();
                }
                if (event.key === "ArrowDown" && results.length) {
                  event.preventDefault();
                  optionRefs.current[0]?.focus();
                }
              }}
              className="min-h-[44px] min-w-0 flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-muted"
            />
          </label>
          <div
            role="listbox"
            aria-label={labels.trigger}
            className="max-h-[280px] overflow-y-auto p-1.5"
          >
            {status === "loading" ? (
              <p
                role="status"
                className="flex items-center gap-2 px-3 py-3 font-sans text-sm text-muted"
              >
                <SpinnerGap size={16} className="animate-spin" />
                {labels.loading}
              </p>
            ) : null}
            {status === "idle" ? (
              <p className="px-3 py-3 font-sans text-sm text-muted">
                {labels.hint}
              </p>
            ) : null}
            {status === "error" ? (
              <p
                role="alert"
                className="px-3 py-3 font-sans text-sm text-[#8c3434]"
              >
                {labels.error}
              </p>
            ) : null}
            {status === "ready" && !results.length ? (
              <p className="px-3 py-3 font-sans text-sm text-muted">
                {labels.empty}
              </p>
            ) : null}
            {status === "ready"
              ? results.map((client, index) => {
                  const isSelected = selected?.id === client.id;
                  return (
                    <button
                      key={client.id}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => choose(client)}
                      onKeyDown={(event) => onOptionKeyDown(event, index)}
                      className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[4px] px-3 py-2 text-left font-sans hover:bg-page focus:bg-page focus:outline-none ${isSelected ? "bg-btn-fill text-accent" : "text-body"}`}
                    >
                      <span className="min-w-0">
                        <strong className="block truncate text-sm font-medium text-ink">
                          {client.fullName}
                        </strong>
                        <span className="block truncate text-xs text-muted">
                          {[client.phone, client.email]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      {isSelected ? <Check size={15} weight="bold" /> : null}
                    </button>
                  );
                })
              : null}
          </div>
        </div>
      ) : null}
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
