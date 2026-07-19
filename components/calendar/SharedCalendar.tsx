"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  GearSix,
} from "@phosphor-icons/react";
import { DatePicker } from "@/components/ui/CalendarPicker";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { cn } from "@/lib/cn";

type View = "day" | "week" | "month";
type Practitioner = {
  id: string;
  name: string;
  role: string;
  calendarColor: string;
};
type Resource = { id: string; name: string };
type Appointment = {
  id: string;
  version: number;
  practitionerId: string;
  start: string;
  end: string;
  status: string;
  clientName: string;
  procedure: string;
  room: Resource | null;
  device: Resource | null;
  roomId: string | null;
  deviceId: string | null;
  qualifiedPractitionerIds: string[];
  allowedRoomIds: string[];
  allowedDeviceIds: string[];
  requiresDevice: boolean;
  editable: boolean;
};
type Slot = { start: string; end: string; status: string };
type Payload = {
  practitioners: Practitioner[];
  rooms: Resource[];
  devices: Resource[];
  ownPractitionerId: string | null;
  canEditAll: boolean;
  availabilities: Array<{
    practitionerId: string;
    date: string;
    slots: Slot[];
  }>;
  appointments: Appointment[];
};
type AppointmentDetail = {
  id: string;
  client: {
    fullName: string;
    email: string;
    phone: string;
    contraindications: string | null;
  };
  procedure: string;
  start: string;
  end: string;
  notes: string | null;
  room: string | null;
  device: string | null;
};

const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_HEIGHT = 56;
const DAY_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

const copy = {
  en: {
    title: "Shared calendar",
    day: "Day",
    week: "Week",
    month: "Month",
    today: "Today",
    all: "All",
    refresh: "Refresh",
    setup: "Calendar setup",
    hours: "Working hours",
    applyHours: "Apply hours",
    startHour: "Start",
    endHour: "End",
    daysAhead: "Days ahead",
    loading: "Loading calendar…",
    empty: "No appointments",
    confirm: "Confirm calendar change",
    save: "Save and notify",
    cancel: "Cancel",
    employee: "Employee",
    room: "Room",
    device: "Device",
    time: "Time",
    conflict:
      "The appointment could not be moved. Refresh and try another time or resource.",
    saved: "Appointment updated.",
  },
  fi: {
    title: "Yhteinen kalenteri",
    day: "Päivä",
    week: "Viikko",
    month: "Kuukausi",
    today: "Tänään",
    all: "Kaikki",
    refresh: "Päivitä",
    setup: "Kalenterin asetukset",
    hours: "Työajat",
    applyHours: "Käytä työaikoja",
    startHour: "Alkaa",
    endHour: "Päättyy",
    daysAhead: "Päiviä",
    loading: "Kalenteria ladataan…",
    empty: "Ei ajanvarauksia",
    confirm: "Vahvista kalenterimuutos",
    save: "Tallenna ja ilmoita",
    cancel: "Peruuta",
    employee: "Työntekijä",
    room: "Huone",
    device: "Laite",
    time: "Aika",
    conflict:
      "Ajanvarausta ei voitu siirtää. Päivitä ja valitse toinen aika tai resurssi.",
    saved: "Ajanvaraus päivitetty.",
  },
  ru: {
    title: "Общий календарь",
    day: "День",
    week: "Неделя",
    month: "Месяц",
    today: "Сегодня",
    all: "Все",
    refresh: "Обновить",
    setup: "Настройки календаря",
    hours: "Рабочее время",
    applyHours: "Применить часы",
    startHour: "Начало",
    endHour: "Конец",
    daysAhead: "Дней",
    loading: "Загрузка календаря…",
    empty: "Нет записей",
    confirm: "Подтвердить изменение",
    save: "Сохранить и уведомить",
    cancel: "Отмена",
    employee: "Сотрудник",
    room: "Кабинет",
    device: "Аппарат",
    time: "Время",
    conflict:
      "Не удалось перенести запись. Обновите календарь и выберите другое время или ресурс.",
    saved: "Запись обновлена.",
  },
} as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function ymd(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function today() {
  const now = new Date();
  return ymd(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
}

function dateFromYmd(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: string, amount: number) {
  const date = dateFromYmd(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return ymd(date);
}

function rangeFor(value: string, view: View) {
  const selected = dateFromYmd(value);
  if (view === "day")
    return { from: selected, to: new Date(selected.getTime() + 86400000) };
  if (view === "week") {
    const mondayOffset = (selected.getUTCDay() + 6) % 7;
    const from = new Date(selected);
    from.setUTCDate(from.getUTCDate() - mondayOffset);
    return { from, to: new Date(from.getTime() + 7 * 86400000) };
  }
  const from = new Date(
    Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1),
  );
  const offset = (from.getUTCDay() + 6) % 7;
  from.setUTCDate(from.getUTCDate() - offset);
  return { from, to: new Date(from.getTime() + 42 * 86400000) };
}

export function SharedCalendar({
  locale,
  setupHref,
}: {
  locale: "en" | "fi" | "ru";
  setupHref?: string;
}) {
  const t = copy[locale];
  const [date, setDate] = useState(today());
  const [view, setView] = useState<View>("day");
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    appointment: Appointment;
    start: string;
    practitionerId: string;
    roomId: string;
    deviceId: string;
  } | null>(null);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [hours, setHours] = useState({
    practitionerId: "",
    startHour: 10,
    endHour: 19,
    daysAhead: 30,
    openDays: [1, 2, 3, 4, 5, 6],
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const range = useMemo(() => rangeFor(date, view), [date, view]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const qs = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    try {
      const response = await fetch(`/api/calendar?${qs}`);
      if (!response.ok) throw new Error("calendar_load");
      const payload = (await response.json()) as Payload;
      setData(payload);
      setSelected((current) =>
        current.length
          ? current.filter((id) =>
              payload.practitioners.some((p) => p.id === id),
            )
          : payload.practitioners.map((p) => p.id),
      );
    } catch {
      setMessage(t.conflict);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, t.conflict]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visiblePractitioners =
    data?.practitioners.filter((item) => selected.includes(item.id)) ?? [];

  function navigate(direction: -1 | 1) {
    setDate(
      addDays(
        date,
        direction * (view === "day" ? 1 : view === "week" ? 7 : 28),
      ),
    );
  }

  function openEditor(
    appointment: Appointment,
    start = appointment.start,
    practitionerId = appointment.practitionerId,
  ) {
    setEditing({
      appointment,
      start,
      practitionerId,
      roomId: appointment.roomId ?? appointment.allowedRoomIds[0] ?? "",
      deviceId: appointment.deviceId ?? appointment.allowedDeviceIds[0] ?? "",
    });
  }

  async function openAppointment(appointment: Appointment) {
    if (appointment.editable) {
      openEditor(appointment);
      return;
    }
    const response = await fetch(`/api/staff/appointments/${appointment.id}`);
    if (!response.ok) {
      setMessage(t.conflict);
      return;
    }
    setDetail((await response.json()) as AppointmentDetail);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    const appointment = data?.appointments.find(
      (item) => item.id === event.active.id,
    );
    if (!appointment?.editable) return;
    const [, targetDate, practitionerId] = String(event.over.id).split(":");
    const original = new Date(appointment.start);
    const minutes = Math.round(event.delta.y / (HOUR_HEIGHT / 60) / 15) * 15;
    const target = new Date(`${targetDate}T00:00:00.000Z`);
    target.setUTCHours(
      original.getUTCHours(),
      original.getUTCMinutes() + minutes,
      0,
      0,
    );
    openEditor(appointment, target.toISOString(), practitionerId);
  }

  async function saveEdit() {
    if (!editing) return;
    setMessage(null);
    const response = await fetch(
      `/api/calendar/appointments/${editing.appointment.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: editing.appointment.version,
          start: editing.start,
          practitionerId: editing.practitionerId,
          roomId: editing.roomId,
          deviceId: editing.deviceId || null,
        }),
      },
    );
    if (!response.ok) {
      setMessage(t.conflict);
      return;
    }
    setEditing(null);
    setMessage(t.saved);
    await load();
  }

  async function applyHours() {
    const response = await fetch("/api/staff/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate: date, ...hours, stepMin: 15 }),
    });
    if (!response.ok) {
      setMessage(t.conflict);
      return;
    }
    setHoursOpen(false);
    setMessage(t.saved);
    await load();
  }

  const fmtDate = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const fmtTime = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-[14px]">
        <div>
          <h1 className="font-display text-[clamp(34px,5vw,54px)] leading-none font-medium">
            {t.title}
          </h1>
          <p className="mt-[7px] font-sans text-[14px] text-muted">
            {fmtDate.format(dateFromYmd(date))}
          </p>
        </div>
        {setupHref ? (
          <Link
            href={setupHref}
            className="inline-flex min-h-[44px] items-center gap-[8px] rounded-[4px] border border-line-btn bg-card px-[14px] font-sans text-[12px] tracking-[.08em] uppercase"
          >
            {t.setup}
            <GearSix size={18} weight="thin" />
          </Link>
        ) : null}
      </div>

      <div className="sticky top-0 z-30 mt-[20px] rounded-[8px] border border-line-card bg-card/95 p-[12px] shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center gap-[8px]">
          {(["day", "week", "month"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={view === item ? activeButtonCls : buttonCls}
            >
              {t[item]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={iconButtonCls}
            aria-label="Previous"
          >
            <CaretLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setDate(today())}
            className={cn(buttonCls, "bg-btn-fill")}
          >
            {t.today}
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className={iconButtonCls}
            aria-label="Next"
          >
            <CaretRight size={18} />
          </button>
          <DatePicker
            locale={locale}
            value={date}
            onValueChange={setDate}
            ariaLabel={t.today}
            className="w-[170px]"
          />
          <button
            type="button"
            onClick={() => void load()}
            className={iconButtonCls}
            aria-label={t.refresh}
          >
            <ArrowClockwise size={18} />
          </button>
          {data?.canEditAll ? (
            <button
              type="button"
              onClick={() => {
                const practitionerId = data.canEditAll
                  ? (selected[0] ?? data.practitioners[0]?.id ?? "")
                  : (data.ownPractitionerId ?? "");
                setHours((current) => ({ ...current, practitionerId }));
                setHoursOpen(true);
              }}
              className={buttonCls}
            >
              {t.hours}
            </button>
          ) : null}
        </div>
        <div className="mt-[10px] flex flex-wrap gap-[7px] border-t border-line-hair pt-[10px]">
          <button
            type="button"
            onClick={() =>
              setSelected(data?.practitioners.map((item) => item.id) ?? [])
            }
            className={buttonCls}
          >
            {t.all}
          </button>
          {data?.practitioners.map((employee) => {
            const active = selected.includes(employee.id);
            return (
              <button
                key={employee.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setSelected((current) =>
                    active
                      ? current.filter((id) => id !== employee.id)
                      : [...current, employee.id],
                  )
                }
                className={cn(buttonCls, active && "text-ink")}
                style={{
                  borderColor: employee.calendarColor,
                  background: active
                    ? `${employee.calendarColor}33`
                    : undefined,
                }}
              >
                {employee.name}
              </button>
            );
          })}
        </div>
      </div>

      {message ? (
        <p
          role="status"
          className="mt-[12px] rounded-[5px] border border-line-btn bg-btn-fill px-[14px] py-[10px] font-sans text-[14px]"
        >
          {message}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-[24px] font-sans text-[14px] text-muted">
          {t.loading}
        </p>
      ) : null}
      {!loading && data ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {view === "month" ? (
            <MonthView
              range={range}
              data={data}
              selected={selected}
              fmtDate={fmtDate}
              fmtTime={fmtTime}
              onOpenDay={(next) => {
                setDate(next);
                setView("day");
              }}
            />
          ) : (
            <TimeGrid
              range={range}
              view={view}
              data={data}
              practitioners={visiblePractitioners}
              fmtDate={fmtDate}
              fmtTime={fmtTime}
              onOpen={(appointment) => void openAppointment(appointment)}
            />
          )}
        </DndContext>
      ) : null}

      {detail ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/35 p-[12px] sm:items-center"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[540px] rounded-[10px] border border-line-card bg-card p-[clamp(18px,3vw,28px)] shadow-card"
          >
            <h2 className="font-display text-[30px] font-medium">
              {detail.procedure}
            </h2>
            <p className="mt-2 font-sans text-sm text-body">
              {fmtTime.format(new Date(detail.start))}–
              {fmtTime.format(new Date(detail.end))} · {detail.room ?? "—"}
              {detail.device ? ` · ${detail.device}` : ""}
            </p>
            <dl className="mt-5 grid gap-3 font-sans text-sm">
              <div>
                <dt className="text-muted">Client</dt>
                <dd className="font-medium">{detail.client.fullName}</dd>
              </div>
              <div>
                <dt className="text-muted">Contact</dt>
                <dd>
                  {detail.client.phone} · {detail.client.email}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Booking notes</dt>
                <dd>{detail.notes ?? "—"}</dd>
              </div>
              <div className="rounded-[5px] border border-[#c98383] bg-[#fff4f2] p-3">
                <dt className="font-medium">Contraindication warning</dt>
                <dd className="mt-1">
                  {detail.client.contraindications ??
                    "No contraindications recorded."}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-5 min-h-[44px] w-full rounded border border-line-btn"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {editing && data ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/35 p-[12px] sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setEditing(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-edit-title"
            className="w-full max-w-[560px] rounded-[10px] border border-line-card bg-card p-[clamp(18px,3vw,28px)] shadow-card"
          >
            <h2
              id="calendar-edit-title"
              className="font-display text-[30px] font-medium"
            >
              {t.confirm}
            </h2>
            <p className="mt-[4px] font-sans text-[14px] text-body">
              {editing.appointment.clientName} · {editing.appointment.procedure}
            </p>
            <div className="mt-[18px] grid gap-[13px] sm:grid-cols-2">
              <Field label={t.time}>
                <span className="block rounded-[4px] border border-line-card bg-page px-[12px] py-[11px] font-sans text-[14px]">
                  {fmtDate.format(new Date(editing.start))} ·{" "}
                  {fmtTime.format(new Date(editing.start))}
                </span>
              </Field>
              <Field label={t.employee}>
                <ThemedSelect
                  value={editing.practitionerId}
                  onValueChange={(practitionerId) =>
                    setEditing({ ...editing, practitionerId })
                  }
                  options={data.practitioners
                    .filter((item) =>
                      editing.appointment.qualifiedPractitionerIds.includes(
                        item.id,
                      ),
                    )
                    .map((item) => ({ value: item.id, label: item.name }))}
                />
              </Field>
              <Field label={t.room}>
                <ThemedSelect
                  value={editing.roomId}
                  onValueChange={(roomId) => setEditing({ ...editing, roomId })}
                  options={data.rooms
                    .filter((item) =>
                      editing.appointment.allowedRoomIds.includes(item.id),
                    )
                    .map((item) => ({ value: item.id, label: item.name }))}
                />
              </Field>
              {editing.appointment.requiresDevice ? (
                <Field label={t.device}>
                  <ThemedSelect
                    value={editing.deviceId}
                    onValueChange={(deviceId) =>
                      setEditing({ ...editing, deviceId })
                    }
                    options={data.devices
                      .filter((item) =>
                        editing.appointment.allowedDeviceIds.includes(item.id),
                      )
                      .map((item) => ({ value: item.id, label: item.name }))}
                  />
                </Field>
              ) : null}
            </div>
            <div className="mt-[22px] flex flex-wrap justify-end gap-[9px]">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={buttonCls}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                className={primaryButtonCls}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {hoursOpen && data ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/35 p-[12px] sm:items-center"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[520px] rounded-[10px] border border-line-card bg-card p-[clamp(18px,3vw,28px)] shadow-card"
          >
            <h2 className="font-display text-[30px] font-medium">{t.hours}</h2>
            <div className="mt-[16px] grid gap-[12px] sm:grid-cols-2">
              <Field label={t.employee}>
                <ThemedSelect
                  value={hours.practitionerId}
                  onValueChange={(practitionerId) =>
                    setHours({ ...hours, practitionerId })
                  }
                  disabled={!data.canEditAll}
                  options={data.practitioners
                    .filter(
                      (item) =>
                        data.canEditAll || item.id === data.ownPractitionerId,
                    )
                    .map((item) => ({ value: item.id, label: item.name }))}
                />
              </Field>
              <Field label={t.daysAhead}>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={hours.daysAhead}
                  onChange={(event) =>
                    setHours({
                      ...hours,
                      daysAhead: Number(event.target.value),
                    })
                  }
                  className="min-h-[44px] w-full rounded-[4px] border border-line-btn bg-page px-[11px] font-sans text-[14px]"
                />
              </Field>
              <Field label={t.startHour}>
                <ThemedSelect
                  value={String(hours.startHour)}
                  onValueChange={(value) =>
                    setHours({ ...hours, startHour: Number(value) })
                  }
                  options={Array.from(
                    { length: 17 },
                    (_, index) => index + 6,
                  ).map((hour) => ({
                    value: String(hour),
                    label: `${pad(hour)}:00`,
                  }))}
                />
              </Field>
              <Field label={t.endHour}>
                <ThemedSelect
                  value={String(hours.endHour)}
                  onValueChange={(value) =>
                    setHours({ ...hours, endHour: Number(value) })
                  }
                  options={Array.from(
                    { length: 17 },
                    (_, index) => index + 7,
                  ).map((hour) => ({
                    value: String(hour),
                    label: `${pad(hour)}:00`,
                  }))}
                />
              </Field>
            </div>
            <div className="mt-[14px] flex flex-wrap gap-[7px]">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const active = hours.openDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setHours({
                        ...hours,
                        openDays: active
                          ? hours.openDays.filter((item) => item !== day)
                          : [...hours.openDays, day],
                      })
                    }
                    className={active ? activeButtonCls : buttonCls}
                  >
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "short",
                      timeZone: "UTC",
                    }).format(new Date(Date.UTC(2026, 6, 6 + day)))}
                  </button>
                );
              })}
            </div>
            <div className="mt-[20px] flex justify-end gap-[9px]">
              <button
                type="button"
                onClick={() => setHoursOpen(false)}
                className={buttonCls}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void applyHours()}
                className={primaryButtonCls}
              >
                {t.applyHours}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TimeGrid({
  range,
  view,
  data,
  practitioners,
  fmtDate,
  fmtTime,
  onOpen,
}: {
  range: { from: Date; to: Date };
  view: View;
  data: Payload;
  practitioners: Practitioner[];
  fmtDate: Intl.DateTimeFormat;
  fmtTime: Intl.DateTimeFormat;
  onOpen: (appointment: Appointment) => void;
}) {
  const days = Array.from(
    { length: view === "day" ? 1 : 7 },
    (_, index) => new Date(range.from.getTime() + index * 86400000),
  );
  const columns = days.flatMap((day) =>
    practitioners.map((practitioner) => ({ day, practitioner })),
  );
  return (
    <div className="mt-[16px] overflow-auto rounded-[8px] border border-line-card bg-card">
      <div
        className="grid min-w-max"
        style={{
          gridTemplateColumns: `64px repeat(${Math.max(1, columns.length)}, minmax(190px, 1fr))`,
        }}
      >
        <div className="sticky top-0 left-0 z-20 border-r border-line-card bg-card" />
        {columns.map(({ day, practitioner }) => (
          <div
            key={`${ymd(day)}:${practitioner.id}`}
            className="sticky top-0 z-20 border-r border-line-card bg-card px-[8px] py-[9px] text-center"
          >
            <div className="font-sans text-[11px] text-muted">
              {fmtDate.format(day)}
            </div>
            <div
              className="mx-auto mt-[4px] max-w-[150px] truncate rounded-full px-[10px] py-[4px] font-sans text-[12px] font-medium"
              style={{ background: `${practitioner.calendarColor}55` }}
            >
              {practitioner.name}
            </div>
          </div>
        ))}
        <TimeAxis />
        {columns.map(({ day, practitioner }) => (
          <CalendarColumn
            key={`${ymd(day)}:${practitioner.id}`}
            day={ymd(day)}
            practitioner={practitioner}
            data={data}
            fmtTime={fmtTime}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function TimeAxis() {
  return (
    <div
      className="sticky left-0 z-10 border-r border-line-card bg-card"
      style={{ height: DAY_HEIGHT }}
    >
      {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, index) => (
        <span
          key={index}
          className="absolute right-[8px] -translate-y-1/2 font-sans text-[11px] text-muted"
          style={{ top: index * HOUR_HEIGHT }}
        >
          {pad(HOUR_START + index)}:00
        </span>
      ))}
    </div>
  );
}

function CalendarColumn({
  day,
  practitioner,
  data,
  fmtTime,
  onOpen,
}: {
  day: string;
  practitioner: Practitioner;
  data: Payload;
  fmtTime: Intl.DateTimeFormat;
  onOpen: (appointment: Appointment) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${day}:${practitioner.id}`,
  });
  const availability = data.availabilities.find(
    (item) => item.date === day && item.practitionerId === practitioner.id,
  );
  const appointments = data.appointments.filter(
    (item) =>
      item.practitionerId === practitioner.id &&
      item.start.slice(0, 10) === day,
  );
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
  const isToday = day === today();
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-r border-line-card bg-[#eee9df]",
        isOver && "ring-2 ring-accent ring-inset",
      )}
      style={{
        height: DAY_HEIGHT,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT / 2 - 1}px, rgba(89,71,50,.09) ${HOUR_HEIGHT / 2}px, transparent ${HOUR_HEIGHT / 2 + 1}px, transparent ${HOUR_HEIGHT - 1}px, rgba(89,71,50,.16) ${HOUR_HEIGHT}px)`,
      }}
    >
      {availability?.slots
        .filter((slot) => slot.status === "open")
        .map((slot) => {
          const start = new Date(slot.start);
          const end = new Date(slot.end);
          const top =
            ((start.getUTCHours() * 60 +
              start.getUTCMinutes() -
              HOUR_START * 60) /
              60) *
            HOUR_HEIGHT;
          const height = Math.max(
            2,
            ((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT,
          );
          return (
            <div
              key={slot.start}
              className="absolute inset-x-0 bg-card/90"
              style={{ top, height }}
            />
          );
        })}
      {isToday &&
      nowMinutes >= 0 &&
      nowMinutes <= (HOUR_END - HOUR_START) * 60 ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 border-t border-[#d95f70]"
          style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
        />
      ) : null}
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          color={practitioner.calendarColor}
          fmtTime={fmtTime}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function AppointmentCard({
  appointment,
  color,
  fmtTime,
  onOpen,
}: {
  appointment: Appointment;
  color: string;
  fmtTime: Intl.DateTimeFormat;
  onOpen: (appointment: Appointment) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: appointment.id, disabled: !appointment.editable });
  const start = new Date(appointment.start);
  const end = new Date(appointment.end);
  const top =
    ((start.getUTCHours() * 60 + start.getUTCMinutes() - HOUR_START * 60) /
      60) *
    HOUR_HEIGHT;
  const height = Math.max(
    32,
    ((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT,
  );
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onOpen(appointment)}
      {...attributes}
      {...listeners}
      className={cn(
        "absolute inset-x-[3px] z-10 overflow-hidden rounded-[4px] border px-[6px] py-[4px] text-left font-sans shadow-sm focus:ring-2 focus:ring-accent focus:outline-none",
        !appointment.editable && "cursor-pointer",
        isDragging && "z-50 opacity-60",
      )}
      style={{
        top,
        height,
        background: `${color}DD`,
        borderColor: color,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
    >
      <span className="block text-[10px] font-medium">
        {fmtTime.format(start)}–{fmtTime.format(end)}
      </span>
      <strong className="block truncate text-[12px]">
        {appointment.clientName}
      </strong>
      <span className="block truncate text-[11px]">
        {appointment.procedure}
      </span>
      <span className="block truncate text-[10px] opacity-75">
        {appointment.room?.name ?? "—"}
        {appointment.device ? ` · ${appointment.device.name}` : ""}
      </span>
    </button>
  );
}

function MonthView({
  range,
  data,
  selected,
  fmtDate,
  fmtTime,
  onOpenDay,
}: {
  range: { from: Date; to: Date };
  data: Payload;
  selected: string[];
  fmtDate: Intl.DateTimeFormat;
  fmtTime: Intl.DateTimeFormat;
  onOpenDay: (date: string) => void;
}) {
  const days = Array.from(
    { length: 42 },
    (_, index) => new Date(range.from.getTime() + index * 86400000),
  );
  const colors = new Map(
    data.practitioners.map((item) => [item.id, item.calendarColor]),
  );
  return (
    <div className="mt-[16px] grid grid-cols-7 overflow-hidden rounded-[8px] border border-line-card bg-card">
      {days.map((day) => {
        const date = ymd(day);
        const appointments = data.appointments.filter(
          (item) =>
            item.start.slice(0, 10) === date &&
            selected.includes(item.practitionerId),
        );
        return (
          <button
            type="button"
            key={date}
            onClick={() => onOpenDay(date)}
            className="min-h-[120px] border-r border-b border-line-card p-[6px] text-left align-top hover:bg-page"
          >
            <span className="font-sans text-[11px] text-muted">
              {fmtDate.format(day)}
            </span>
            <span className="mt-[5px] grid gap-[3px]">
              {appointments.slice(0, 4).map((appointment) => (
                <span
                  key={appointment.id}
                  className="block truncate rounded-[3px] px-[4px] py-[2px] font-sans text-[10px]"
                  style={{
                    background: `${colors.get(appointment.practitionerId)}55`,
                  }}
                >
                  {fmtTime.format(new Date(appointment.start))}{" "}
                  {appointment.clientName}
                </span>
              ))}
              {appointments.length > 4 ? (
                <span className="font-sans text-[10px] text-muted">
                  +{appointments.length - 4}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
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

const buttonBaseCls =
  "inline-flex min-h-[40px] items-center justify-center rounded-[4px] border px-[12px] font-sans text-[12px]";
const buttonCls = cn(
  buttonBaseCls,
  "border-line-btn bg-card text-body hover:bg-btn-fill",
);
const activeButtonCls = cn(
  buttonBaseCls,
  "border-accent bg-btn-fill text-ink hover:bg-btn-fill",
);
const primaryButtonCls = cn(
  buttonBaseCls,
  "border-accent bg-accent text-page hover:brightness-95",
);
const iconButtonCls =
  "inline-flex size-[40px] items-center justify-center rounded-[4px] border border-line-btn bg-card text-ink hover:bg-btn-fill";
