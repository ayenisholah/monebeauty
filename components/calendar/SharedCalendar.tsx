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
  Plus,
} from "@phosphor-icons/react";
import { DatePicker } from "@/components/ui/CalendarPicker";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import { cn } from "@/lib/cn";
import {
  availabilityCovers,
  openSlotRange,
  parseWorkingHours,
  workingRangeForDate,
} from "@/lib/staff-schedule";
import {
  AppointmentForm,
  type AppointmentDetail as ManageAppointmentDetail,
} from "@/components/calendar/AppointmentForm";
import {
  CalendarBlockEditor,
  type CalendarBlock,
  type CalendarBlockTemplate,
} from "@/components/calendar/CalendarBlockEditor";

type View = "day" | "week" | "month";
const VIEW_STORAGE_KEYS = {
  admin: "mone-calendar-view:admin",
  staff: "mone-calendar-view:staff",
} as const;
type Practitioner = {
  id: string;
  name: string;
  role: string;
  calendarColor: string;
  workingHours: unknown;
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
  canManageAppointments: boolean;
  canEditAllAvailability: boolean;
  canEditOwnAvailability: boolean;
  canManageTemplates: boolean;
  availabilities: Array<{
    practitionerId: string;
    date: string;
    slots: Slot[];
  }>;
  appointments: Appointment[];
  templates: CalendarBlockTemplate[];
  blocks: CalendarBlock[];
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

const ZOOM_HEIGHTS = { compact: 36, default: 48, expanded: 68 } as const;
type Zoom = keyof typeof ZOOM_HEIGHTS;

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
    availability: "Open / closed times",
    saveAvailability: "Save availability",
    open: "Open",
    closed: "Closed",
    booked: "Booked",
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
    create: "Create appointment",
    noWorkingHours: "No working hours",
    outsideHours: "Outside working hours",
    internal: "Internal services",
    working: "Working",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
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
    availability: "Avoimet / suljetut ajat",
    saveAvailability: "Tallenna saatavuus",
    open: "Avoin",
    closed: "Suljettu",
    booked: "Varattu",
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
    create: "Luo ajanvaraus",
    noWorkingHours: "Ei työaikaa",
    outsideHours: "Työajan ulkopuolella",
    internal: "Sisäiset palvelut",
    working: "Työssä",
    zoomIn: "Lähennä",
    zoomOut: "Loitonna",
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
    availability: "Открытые / закрытые часы",
    saveAvailability: "Сохранить доступность",
    open: "Открыто",
    closed: "Закрыто",
    booked: "Занято",
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
    create: "Создать запись",
    noWorkingHours: "Нет рабочих часов",
    outsideHours: "Вне рабочего времени",
    internal: "Внутренние услуги",
    working: "Работают",
    zoomIn: "Увеличить",
    zoomOut: "Уменьшить",
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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
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

function validView(value: string | null): value is View {
  return value === "day" || value === "week" || value === "month";
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
  const [viewReady, setViewReady] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [blockEditing, setBlockEditing] = useState<{ start: string; practitionerId: string; block?: CalendarBlock | null } | null>(null);
  const [zoom, setZoom] = useState<Zoom>("default");
  const [pickerDates, setPickerDates] = useState<string[] | undefined>();
  const [editing, setEditing] = useState<{
    appointment: Appointment;
    start: string;
    practitionerId: string;
    roomId: string;
    deviceId: string;
  } | null>(null);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilityPractitionerId, setAvailabilityPractitionerId] =
    useState("");
  const [availabilitySlots, setAvailabilitySlots] = useState<Slot[]>([]);
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [managing, setManaging] = useState<{
    start: string;
    practitionerId: string;
    detail?: ManageAppointmentDetail | null;
  } | null>(null);
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
  const viewStorageKey = setupHref
    ? VIEW_STORAGE_KEYS.admin
    : VIEW_STORAGE_KEYS.staff;
  const range = useMemo(() => rangeFor(date, view), [date, view]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(viewStorageKey);
      } catch {
        // Storage can be unavailable in hardened/private browser contexts.
      }
      setView(validView(stored) ? stored : "day");
      setViewReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [viewStorageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("mone-calendar-zoom");
        if (stored === "compact" || stored === "default" || stored === "expanded") setZoom(stored);
      } catch {
        // The default density remains available when storage is disabled.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const qs = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      locale,
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
  }, [range.from, range.to, locale, t.conflict]);

  useEffect(() => {
    if (!viewReady) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, viewReady]);

  const visiblePractitioners =
    data?.practitioners.filter((item) => selected.includes(item.id)) ?? [];

  const loadPickerDates = useCallback(
    async (from: string, to: string) => {
      const ids = selected.length
        ? selected
        : (data?.practitioners.map((item) => item.id) ?? []);
      if (!ids.length) return;
      try {
        const params = new URLSearchParams({
          from,
          to,
          practitionerIds: ids.join(","),
        });
        const response = await fetch(`/api/calendar/working-dates?${params}`);
        if (!response.ok) throw new Error("working_dates");
        const payload = (await response.json()) as { dates?: string[] };
        setPickerDates(
          Array.isArray(payload.dates) ? payload.dates : undefined,
        );
      } catch {
        setPickerDates(undefined);
      }
    },
    [data?.practitioners, selected],
  );

  function navigate(direction: -1 | 1) {
    setDate(
      addDays(
        date,
        direction * (view === "day" ? 1 : view === "week" ? 7 : 28),
      ),
    );
  }

  function changeView(next: View) {
    setView(next);
    try {
      window.localStorage.setItem(viewStorageKey, next);
    } catch {
      // The active view still works when persistence is unavailable.
    }
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
    const response = await fetch(`/api/staff/appointments/${appointment.id}`);
    if (!response.ok) {
      setMessage(t.conflict);
      return;
    }
    const payload = (await response.json()) as ManageAppointmentDetail &
      AppointmentDetail;
    if (appointment.editable) {
      setManaging({
        start: appointment.start,
        practitionerId: appointment.practitionerId,
        detail: payload,
      });
    } else {
      setDetail(payload);
    }
  }

  function openCreate(start?: string, practitionerId?: string) {
    const resolvedPractitionerId =
      practitionerId ??
      data?.ownPractitionerId ??
      selected[0] ??
      data?.practitioners[0]?.id ??
      "";
    const firstOpen = data?.availabilities
      .find(
        (item) =>
          item.date === date && item.practitionerId === resolvedPractitionerId,
      )
      ?.slots.find((slot) => slot.status === "open")?.start;
    const fallback = new Date(firstOpen ?? `${date}T10:00:00.000Z`);
    if (fallback.getTime() <= Date.now()) {
      const now = new Date();
      const minutes = Math.ceil(now.getUTCMinutes() / 15) * 15;
      fallback.setUTCHours(now.getUTCHours(), minutes, 0, 0);
    }
    setManaging({
      start: start ?? fallback.toISOString(),
      practitionerId: resolvedPractitionerId,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    if (String(event.active.id).startsWith("template:")) {
      const [, targetDate, practitionerId] = String(event.over.id).split(":");
      const templateId = String(event.active.id).slice("template:".length);
      if (!data?.templates.some((item) => item.id === templateId) || !targetDate || !practitionerId) return;
      setSelectedTemplateId(templateId);
      setBlockEditing({ start: `${targetDate}T10:00:00.000Z`, practitionerId });
      return;
    }
    if (String(event.active.id).startsWith("block:")) {
      const block = data?.blocks.find((item) => `block:${item.id}` === event.active.id);
      if (!block) return;
      const [, targetDate, practitionerId] = String(event.over.id).split(":");
      const original = new Date(block.start);
      const minutes = Math.round(event.delta.y / (ZOOM_HEIGHTS[zoom] / 60) / 15) * 15;
      const target = new Date(`${targetDate}T00:00:00.000Z`);
      target.setUTCHours(original.getUTCHours(), original.getUTCMinutes() + minutes, 0, 0);
      setBlockEditing({ start: target.toISOString(), practitionerId, block: { ...block, start: target.toISOString(), practitionerIds: [practitionerId] } });
      return;
    }
    const appointment = data?.appointments.find(
      (item) => item.id === event.active.id,
    );
    if (!appointment?.editable) return;
    const [, targetDate, practitionerId] = String(event.over.id).split(":");
    const original = new Date(appointment.start);
    const minutes = Math.round(event.delta.y / (ZOOM_HEIGHTS[zoom] / 60) / 15) * 15;
    const target = new Date(`${targetDate}T00:00:00.000Z`);
    target.setUTCHours(
      original.getUTCHours(),
      original.getUTCMinutes() + minutes,
      0,
      0,
    );
    const targetEnd = new Date(
      target.getTime() +
        (new Date(appointment.end).getTime() - original.getTime()),
    );
    const targetAvailability = data?.availabilities.find(
      (item) =>
        item.date === targetDate && item.practitionerId === practitionerId,
    );
    if (!availabilityCovers(targetAvailability?.slots, target, targetEnd)) {
      setMessage(t.conflict);
      return;
    }
    openEditor(appointment, target.toISOString(), practitionerId);
  }

  function openCell(start: string, practitionerId: string) {
    if (selectedTemplateId) setBlockEditing({ start, practitionerId });
    else openCreate(start, practitionerId);
  }

  function changeZoom(direction: -1 | 1) {
    const levels: Zoom[] = ["compact", "default", "expanded"];
    const next = levels[Math.max(0, Math.min(levels.length - 1, levels.indexOf(zoom) + direction))];
    setZoom(next);
    try { window.localStorage.setItem("mone-calendar-zoom", next); } catch {}
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

  function openAvailabilityEditor() {
    if (!data) return;
    const practitionerId = data.canEditAllAvailability
      ? (selected[0] ?? data.practitioners[0]?.id ?? "")
      : (data.ownPractitionerId ?? "");
    if (!practitionerId) return;
    const existing = data.availabilities.find(
      (item) => item.date === date && item.practitionerId === practitionerId,
    );
    const slots = existing?.slots.length
      ? existing.slots
      : Array.from({ length: 36 }, (_, index) => {
          const minutes = 10 * 60 + index * 15;
          const next = minutes + 15;
          return {
            start: `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00.000Z`,
            end: `${date}T${pad(Math.floor(next / 60))}:${pad(next % 60)}:00.000Z`,
            status: "open",
          };
        });
    setAvailabilityPractitionerId(practitionerId);
    setAvailabilitySlots(slots);
    setAvailabilityOpen(true);
  }

  async function saveAvailability() {
    const response = await fetch("/api/staff/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        practitionerId: availabilityPractitionerId,
        slots: availabilitySlots,
      }),
    });
    if (!response.ok) {
      setMessage(t.conflict);
      return;
    }
    setAvailabilityOpen(false);
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
              onClick={() => changeView(item)}
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
            availableDates={pickerDates}
            onMonthChange={loadPickerDates}
          />
          <p className="min-w-[180px] flex-1 text-center font-sans text-[13px] font-medium text-ink">
            {view === "day" ? fmtDate.format(range.from) : `${fmtDate.format(range.from)} – ${fmtDate.format(new Date(range.to.getTime() - 86400000))}`}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className={iconButtonCls}
            aria-label={t.refresh}
          >
            <ArrowClockwise size={18} />
          </button>
          <button type="button" onClick={() => changeZoom(-1)} disabled={zoom === "compact"} className={iconButtonCls} aria-label={t.zoomOut}>−</button>
          <button type="button" onClick={() => changeZoom(1)} disabled={zoom === "expanded"} className={iconButtonCls} aria-label={t.zoomIn}>+</button>
          {data?.canManageAppointments ? (
            <button
              type="button"
              onClick={() => openCreate()}
              className={primaryButtonCls}
            >
              {t.create}
              <Plus size={17} weight="thin" />
            </button>
          ) : null}
          {data?.canEditAllAvailability || data?.canEditOwnAvailability ? (
            <>
              <button
                type="button"
                onClick={openAvailabilityEditor}
                className={buttonCls}
              >
                {t.availability}
              </button>
              <button
                type="button"
                onClick={() => {
                  const practitionerId = data.canEditAllAvailability
                    ? (selected[0] ?? data.practitioners[0]?.id ?? "")
                    : (data.ownPractitionerId ?? "");
                  const practitioner = data.practitioners.find(
                    (item) => item.id === practitionerId,
                  );
                  const saved = parseWorkingHours(practitioner?.workingHours);
                  setHours((current) => ({
                    ...current,
                    practitionerId,
                    ...saved,
                  }));
                  setHoursOpen(true);
                }}
                className={buttonCls}
              >
                {t.hours}
              </button>
            </>
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
          <button
            type="button"
            onClick={() => setSelected(data?.practitioners.filter((employee) => data.availabilities.some((item) => item.practitionerId === employee.id && item.date === date && item.slots.some((slot) => slot.status === "open"))).map((employee) => employee.id) ?? [])}
            className={buttonCls}
          >
            {t.working}
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
          <div className="mt-[14px] flex min-w-0 items-center gap-[8px] overflow-x-auto rounded-[8px] border border-line-card bg-card p-[9px]" aria-label={t.internal}>
            <span className="shrink-0 font-sans text-[11px] tracking-[.08em] text-muted uppercase">{t.internal}</span>
            {data.templates.map((template) => (
              <TemplateChip key={template.id} template={template} selected={selectedTemplateId === template.id} onSelect={() => setSelectedTemplateId((current) => current === template.id ? null : template.id)} />
            ))}
          </div>
          {view === "month" ? (
            <MonthView
              range={range}
              data={data}
              selected={selected}
              fmtDate={fmtDate}
              fmtTime={fmtTime}
              onOpenDay={(next) => {
                setDate(next);
                changeView("day");
              }}
              onOpenBlock={(block) => setBlockEditing({ start: block.start, practitionerId: block.practitionerIds[0] ?? "", block })}
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
              onCreate={openCell}
              onOpenBlock={(block) => setBlockEditing({ start: block.start, practitionerId: block.practitionerIds[0] ?? "", block })}
              hourHeight={ZOOM_HEIGHTS[zoom]}
              noWorkingHours={t.noWorkingHours}
              outsideHours={t.outsideHours}
            />
          )}
        </DndContext>
      ) : null}

      {blockEditing && data ? (
        <CalendarBlockEditor
          locale={locale}
          initialStart={blockEditing.start}
          initialPractitionerId={blockEditing.practitionerId}
          block={blockEditing.block}
          templates={[...data.templates].sort((a, b) => Number(b.id === selectedTemplateId) - Number(a.id === selectedTemplateId))}
          practitioners={data.practitioners}
          rooms={data.rooms}
          devices={data.devices}
          canAssignMany={data.canEditAllAvailability}
          onClose={() => setBlockEditing(null)}
          onSaved={load}
        />
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

      {managing ? (
        <AppointmentForm
          locale={locale}
          initialStart={managing.start}
          initialPractitionerId={managing.practitionerId}
          detail={managing.detail}
          onClose={() => setManaging(null)}
          onSaved={load}
        />
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
      {availabilityOpen && data ? (
        <div
          className="fixed inset-0 z-[105] flex items-end justify-center bg-ink/35 p-[12px] sm:items-center"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-[10px] border border-line-card bg-card p-[clamp(18px,3vw,28px)] shadow-card"
          >
            <h2 className="font-display text-[30px] font-medium">
              {t.availability}
            </h2>
            <p className="mt-1 font-sans text-sm text-muted">{date}</p>
            <div className="mt-4 grid gap-2">
              {availabilitySlots.map((slot, index) => {
                const slotStart = new Date(slot.start);
                const slotEnd = new Date(slot.end);
                const booked = data.appointments.some(
                  (appointment) =>
                    appointment.practitionerId === availabilityPractitionerId &&
                    appointment.status !== "CANCELLED" &&
                    new Date(appointment.start) < slotEnd &&
                    new Date(appointment.end) > slotStart,
                );
                return (
                  <div
                    key={slot.start}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded border border-line-card bg-page p-2"
                  >
                    <span className="font-sans text-sm">
                      {fmtTime.format(slotStart)}–{fmtTime.format(slotEnd)}
                      {booked ? ` · ${t.booked}` : ""}
                    </span>
                    <div className="flex gap-1">
                      {(["open", "closed"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={booked}
                          onClick={() =>
                            setAvailabilitySlots((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, status }
                                  : item,
                              ),
                            )
                          }
                          className={cn(
                            buttonCls,
                            slot.status === status &&
                              "border-accent bg-btn-fill text-ink",
                            booked && "cursor-not-allowed opacity-45",
                          )}
                        >
                          {t[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAvailabilityOpen(false)}
                className={buttonCls}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void saveAvailability()}
                className={primaryButtonCls}
              >
                {t.saveAvailability}
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
                  disabled={!data.canEditAllAvailability}
                  options={data.practitioners
                    .filter(
                      (item) =>
                        data.canEditAllAvailability ||
                        item.id === data.ownPractitionerId,
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
                  options={Array.from({ length: 24 }, (_, hour) => ({
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
                    { length: 24 },
                    (_, index) => index + 1,
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
  onOpenBlock,
  onCreate,
  hourHeight,
  noWorkingHours,
  outsideHours,
}: {
  range: { from: Date; to: Date };
  view: View;
  data: Payload;
  practitioners: Practitioner[];
  fmtDate: Intl.DateTimeFormat;
  fmtTime: Intl.DateTimeFormat;
  onOpen: (appointment: Appointment) => void;
  onOpenBlock: (block: CalendarBlock) => void;
  onCreate: (start: string, practitionerId: string) => void;
  hourHeight: number;
  noWorkingHours: string;
  outsideHours: string;
}) {
  const days = Array.from(
    { length: view === "day" ? 1 : 7 },
    (_, index) => new Date(range.from.getTime() + index * 86400000),
  );
  const columns = days.flatMap((day) =>
    practitioners.map((practitioner) => ({ day, practitioner })),
  );
  const rangeBounds = calendarWorkingBounds(columns, data);
  const visibleIds = new Set(practitioners.map((item) => item.id));
  const visibleDays = new Set(days.map(ymd));
  const outsideAppointments = data.appointments.filter((appointment) => {
    if (
      !visibleIds.has(appointment.practitionerId) ||
      !visibleDays.has(appointment.start.slice(0, 10))
    )
      return false;
    const start = new Date(appointment.start);
    const end = new Date(appointment.end);
    const startMinute = start.getUTCHours() * 60 + start.getUTCMinutes();
    const endMinute = end.getUTCHours() * 60 + end.getUTCMinutes();
    const availability = data.availabilities.find(
      (item) =>
        item.date === appointment.start.slice(0, 10) &&
        item.practitionerId === appointment.practitionerId,
    );
    return (
      !rangeBounds ||
      !availabilityCovers(availability?.slots, start, end) ||
      startMinute < rangeBounds.startMinute ||
      endMinute > rangeBounds.endMinute
    );
  });
  const outsideBlocks = data.blocks.filter((block) => {
    if (!block.practitionerIds.some((id) => visibleIds.has(id)) || !visibleDays.has(block.start.slice(0, 10))) return false;
    const start = new Date(block.start); const end = new Date(block.end);
    const startMinute = start.getUTCHours() * 60 + start.getUTCMinutes();
    const endMinute = end.getUTCHours() * 60 + end.getUTCMinutes();
    return !rangeBounds || startMinute < rangeBounds.startMinute || endMinute > rangeBounds.endMinute;
  });
  return (
    <div className="mt-[16px]">
      {outsideAppointments.length || outsideBlocks.length ? (
        <div className="mb-[10px] rounded-[7px] border border-[#c98383] bg-[#fff4f2] p-[10px]">
          <p className="font-sans text-[11px] font-medium tracking-[.08em] text-[#8c3434] uppercase">
            {outsideHours}
          </p>
          <div className="mt-[7px] flex flex-wrap gap-[7px]">
            {outsideAppointments.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => onOpen(appointment)}
                className="rounded-[4px] border border-[#c98383] bg-card px-[9px] py-[6px] text-left font-sans text-[11px]"
              >
                {fmtDate.format(new Date(appointment.start))} ·{" "}
                {fmtTime.format(new Date(appointment.start))} ·{" "}
                {appointment.clientName}
              </button>
            ))}
            {outsideBlocks.map((block) => (
              <button key={block.id} type="button" onClick={() => onOpenBlock(block)} className="rounded-[4px] border border-[#c98383] bg-card px-[9px] py-[6px] text-left font-sans text-[11px]">
                {fmtDate.format(new Date(block.start))} · {fmtTime.format(new Date(block.start))} · {block.items.map((item) => item.label).join(" + ")}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {!rangeBounds ? (
        <p className="rounded-[8px] border border-line-card bg-card p-[24px] text-center font-sans text-[14px] text-muted">
          {noWorkingHours}
        </p>
      ) : (
        <div className="overflow-auto rounded-[8px] border border-line-card bg-card">
          <div
            className="grid min-w-max"
            style={{
              gridTemplateColumns: `64px repeat(${Math.max(1, columns.length)}, minmax(190px, 1fr)) 64px`,
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
                  {view === "week" && practitioners.length > 2 ? initials(practitioner.name) : practitioner.name}
                </div>
              </div>
            ))}
            <div className="sticky top-0 right-0 z-20 border-l border-line-card bg-card" />
            <TimeAxis range={rangeBounds} hourHeight={hourHeight} />
            {columns.map(({ day, practitioner }) => (
              <CalendarColumn
                key={`${ymd(day)}:${practitioner.id}`}
                day={ymd(day)}
                practitioner={practitioner}
                data={data}
                fmtTime={fmtTime}
                onOpen={onOpen}
                onOpenBlock={onOpenBlock}
                onCreate={onCreate}
                range={rangeBounds}
                hourHeight={hourHeight}
              />
            ))}
            <TimeAxis range={rangeBounds} hourHeight={hourHeight} right />
          </div>
        </div>
      )}
    </div>
  );
}

function calendarWorkingBounds(
  columns: Array<{ day: Date; practitioner: Practitioner }>,
  data: Payload,
) {
  const ranges = columns.flatMap(({ day, practitioner }) => {
    const date = ymd(day);
    const availability = data.availabilities.find(
      (item) => item.date === date && item.practitionerId === practitioner.id,
    );
    const explicit = openSlotRange(availability?.slots);
    const fallback = workingRangeForDate(date, practitioner.workingHours);
    const resolved = availability ? explicit : fallback;
    return resolved ? [resolved] : [];
  });
  if (!ranges.length) return null;
  return {
    startMinute:
      Math.floor(Math.min(...ranges.map((range) => range.startMinute)) / 60) *
      60,
    endMinute:
      Math.ceil(Math.max(...ranges.map((range) => range.endMinute)) / 60) * 60,
  };
}

function TimeAxis({
  range,
  hourHeight,
  right = false,
}: {
  range: { startMinute: number; endMinute: number };
  hourHeight: number;
  right?: boolean;
}) {
  const height = ((range.endMinute - range.startMinute) / 60) * hourHeight;
  return (
    <div
      className={cn("sticky z-10 bg-card", right ? "right-0 border-l border-line-card" : "left-0 border-r border-line-card")}
      style={{ height }}
    >
      {Array.from(
        { length: (range.endMinute - range.startMinute) / 60 + 1 },
        (_, index) => (
          <span
            key={index}
            className={cn("absolute -translate-y-1/2 font-sans text-[11px] text-muted", right ? "left-[8px]" : "right-[8px]")}
            style={{ top: index * hourHeight }}
          >
            {pad(range.startMinute / 60 + index)}:00
          </span>
        ),
      )}
    </div>
  );
}

function CalendarColumn({
  day,
  practitioner,
  data,
  fmtTime,
  onOpen,
  onOpenBlock,
  onCreate,
  range,
  hourHeight,
}: {
  day: string;
  practitioner: Practitioner;
  data: Payload;
  fmtTime: Intl.DateTimeFormat;
  onOpen: (appointment: Appointment) => void;
  onOpenBlock: (block: CalendarBlock) => void;
  onCreate: (start: string, practitionerId: string) => void;
  range: { startMinute: number; endMinute: number };
  hourHeight: number;
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
  const blocks = data.blocks.filter((item) => item.practitionerIds.includes(practitioner.id) && item.start.slice(0, 10) === day);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes() - range.startMinute;
  const isToday = day === today();
  const dayHeight = ((range.endMinute - range.startMinute) / 60) * hourHeight;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-r border-line-card bg-[#eee9df]",
        isOver && "ring-2 ring-accent ring-inset",
      )}
      style={{
        height: dayHeight,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${hourHeight / 2 - 1}px, rgba(89,71,50,.09) ${hourHeight / 2}px, transparent ${hourHeight / 2 + 1}px, transparent ${hourHeight - 1}px, rgba(89,71,50,.16) ${hourHeight}px)`,
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
              range.startMinute) /
              60) *
            hourHeight;
          const height = Math.max(
            2,
            ((end.getTime() - start.getTime()) / 3600000) * hourHeight,
          );
          return (
            <button
              type="button"
              key={slot.start}
              aria-label={`${fmtTime.format(start)} · ${practitioner.name}`}
              onClick={() => onCreate(slot.start, practitioner.id)}
              disabled={start.getTime() <= now.getTime()}
              className="absolute inset-x-0 z-[1] bg-card/90 hover:bg-btn-fill focus:ring-2 focus:ring-accent focus:outline-none disabled:pointer-events-none"
              style={{ top, height }}
            />
          );
        })}
      {isToday &&
      nowMinutes >= 0 &&
      nowMinutes <= range.endMinute - range.startMinute ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 border-t border-[#d95f70]"
          style={{ top: (nowMinutes / 60) * hourHeight }}
        />
      ) : null}
      {appointments
        .filter((appointment) => {
          const start = new Date(appointment.start);
          const end = new Date(appointment.end);
          const startMinute = start.getUTCHours() * 60 + start.getUTCMinutes();
          const endMinute = end.getUTCHours() * 60 + end.getUTCMinutes();
          return (
            startMinute >= range.startMinute &&
            endMinute <= range.endMinute &&
            availabilityCovers(availability?.slots, start, end)
          );
        })
        .map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            color={practitioner.calendarColor}
            fmtTime={fmtTime}
            onOpen={onOpen}
            rangeStartMinute={range.startMinute}
            hourHeight={hourHeight}
          />
        ))}
      {blocks.map((block) => <CalendarBlockCard key={block.id} block={block} templates={data.templates} fmtTime={fmtTime} onOpen={onOpenBlock} rangeStartMinute={range.startMinute} hourHeight={hourHeight} />)}
    </div>
  );
}

function AppointmentCard({
  appointment,
  color,
  fmtTime,
  onOpen,
  rangeStartMinute,
  hourHeight,
}: {
  appointment: Appointment;
  color: string;
  fmtTime: Intl.DateTimeFormat;
  onOpen: (appointment: Appointment) => void;
  rangeStartMinute: number;
  hourHeight: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: appointment.id, disabled: !appointment.editable });
  const start = new Date(appointment.start);
  const end = new Date(appointment.end);
  const top =
    ((start.getUTCHours() * 60 + start.getUTCMinutes() - rangeStartMinute) /
      60) *
    hourHeight;
  const height = Math.max(
    32,
    ((end.getTime() - start.getTime()) / 3600000) * hourHeight,
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

function TemplateChip({ template, selected, onSelect }: { template: CalendarBlockTemplate; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `template:${template.id}` });
  return <button ref={setNodeRef} type="button" onClick={onSelect} {...attributes} {...listeners} aria-pressed={selected} className={cn("min-h-10 shrink-0 rounded-[4px] border px-3 font-sans text-xs focus:ring-2 focus:ring-accent focus:outline-none", selected && "ring-2 ring-accent", isDragging && "opacity-60")} style={{ background: `${template.color}88`, borderColor: template.color, transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}>{template.label} · {template.defaultDurationMin} min</button>;
}

function CalendarBlockCard({ block, templates, fmtTime, onOpen, rangeStartMinute, hourHeight }: { block: CalendarBlock; templates: CalendarBlockTemplate[]; fmtTime: Intl.DateTimeFormat; onOpen: (block: CalendarBlock) => void; rangeStartMinute: number; hourHeight: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `block:${block.id}` });
  const start = new Date(block.start); const end = new Date(block.end);
  const top = ((start.getUTCHours() * 60 + start.getUTCMinutes() - rangeStartMinute) / 60) * hourHeight;
  const height = Math.max(28, ((end.getTime() - start.getTime()) / 3_600_000) * hourHeight);
  const color = templates.find((template) => template.id === block.items[0]?.templateId)?.color ?? "#B89B72";
  const label = block.items.map((item) => item.label).join(" + ");
  return <button ref={setNodeRef} type="button" onClick={() => onOpen(block)} {...attributes} {...listeners} aria-label={`${fmtTime.format(start)}–${fmtTime.format(end)} · ${label}`} className={cn("absolute inset-x-[3px] z-[11] overflow-hidden rounded-[4px] border border-dashed px-[6px] py-[3px] text-left font-sans shadow-sm focus:ring-2 focus:ring-accent focus:outline-none", isDragging && "z-50 opacity-60")} style={{ top, height, background: `${color}E6`, borderColor: color, transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}><span className="block text-[10px] font-medium">{fmtTime.format(start)}–{fmtTime.format(end)}</span><strong className="block truncate text-[11px]">{label}</strong></button>;
}

function MonthView({
  range,
  data,
  selected,
  fmtDate,
  fmtTime,
  onOpenDay,
  onOpenBlock,
}: {
  range: { from: Date; to: Date };
  data: Payload;
  selected: string[];
  fmtDate: Intl.DateTimeFormat;
  fmtTime: Intl.DateTimeFormat;
  onOpenDay: (date: string) => void;
  onOpenBlock: (block: CalendarBlock) => void;
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
        const working = data.availabilities.some(
          (item) =>
            item.date === date &&
            selected.includes(item.practitionerId) &&
            item.slots.some((slot) => slot.status === "open"),
        );
        const appointments = data.appointments.filter(
          (item) =>
            item.start.slice(0, 10) === date &&
            selected.includes(item.practitionerId),
        );
        const blocks = data.blocks.filter((item) => item.start.slice(0, 10) === date && item.practitionerIds.some((id) => selected.includes(id)));
        const events = [
          ...appointments.map((appointment) => ({ id: `a:${appointment.id}`, start: appointment.start, label: appointment.clientName, color: colors.get(appointment.practitionerId) ?? "#B89B72", block: null as CalendarBlock | null })),
          ...blocks.map((block) => ({ id: `b:${block.id}`, start: block.start, label: block.items.map((item) => item.label).join(" + "), color: data.templates.find((template) => template.id === block.items[0]?.templateId)?.color ?? "#B89B72", block })),
        ].sort((a, b) => a.start.localeCompare(b.start));
        return (
          <button
            type="button"
            key={date}
            disabled={!working && !events.length}
            onClick={() => onOpenDay(date)}
            className="min-h-[120px] border-r border-b border-line-card p-[6px] text-left align-top hover:bg-page disabled:cursor-not-allowed disabled:bg-btn-fill/50 disabled:opacity-50"
          >
            <span className="font-sans text-[11px] text-muted">
              {fmtDate.format(day)}
            </span>
            <span className="mt-[5px] grid gap-[3px]">
              {events.slice(0, 4).map((event) => (
                <span
                  key={event.id}
                  role={event.block ? "button" : undefined}
                  tabIndex={event.block ? 0 : undefined}
                  onClick={event.block ? (click) => { click.stopPropagation(); onOpenBlock(event.block!); } : undefined}
                  onKeyDown={event.block ? (key) => { if (key.key === "Enter" || key.key === " ") { key.preventDefault(); onOpenBlock(event.block!); } } : undefined}
                  className="block truncate rounded-[3px] px-[4px] py-[2px] font-sans text-[10px]"
                  style={{
                    background: `${event.color}55`,
                  }}
                >
                  {fmtTime.format(new Date(event.start))}{" "}
                  {event.label}
                </span>
              ))}
              {events.length > 4 ? (
                <span className="font-sans text-[10px] text-muted">
                  +{events.length - 4} more
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
