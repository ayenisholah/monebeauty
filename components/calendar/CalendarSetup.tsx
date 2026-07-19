"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowClockwise, Plus } from "@phosphor-icons/react";
import { ThemedSelect } from "@/components/ui/ThemedSelect";

type Practitioner = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  displayOrder: number;
  calendarColor: string;
  staff: { userId: string } | null;
};
type Resource = {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
};
type StaffUser = {
  id: string;
  name: string | null;
  email: string;
  staff: { practitionerId: string | null } | null;
};
type Service = {
  id: string;
  slug: string;
  name: string;
  bookable: boolean;
  primaryPractitionerId: string | null;
  qualifiedPractitionerIds: string[];
  roomIds: string[];
  deviceIds: string[];
  requiresDevice: boolean;
};
type SetupPayload = {
  practitioners: Practitioner[];
  rooms: Resource[];
  devices: Resource[];
  staffUsers: StaffUser[];
  services: Service[];
};

const labels = {
  en: {
    title: "Calendar setup",
    back: "Back to calendar",
    employees: "Employees",
    rooms: "Rooms",
    devices: "Devices",
    services: "Service assignment",
    add: "Add",
    save: "Save",
    name: "Name",
    role: "Role",
    color: "Color",
    order: "Order",
    active: "Active",
    login: "Staff login",
    none: "No linked login",
    primary: "Public employee",
    qualified: "Qualified backups",
    allowedRooms: "Allowed rooms",
    allowedDevices: "Compatible devices",
    requiresDevice: "Requires a device",
    loading: "Loading setup…",
    saved: "Setup saved.",
    error: "Could not save setup.",
  },
  fi: {
    title: "Kalenterin asetukset",
    back: "Takaisin kalenteriin",
    employees: "Työntekijät",
    rooms: "Huoneet",
    devices: "Laitteet",
    services: "Palvelujen määritykset",
    add: "Lisää",
    save: "Tallenna",
    name: "Nimi",
    role: "Rooli",
    color: "Väri",
    order: "Järjestys",
    active: "Aktiivinen",
    login: "Henkilökunnan tunnus",
    none: "Ei liitettyä tunnusta",
    primary: "Julkinen työntekijä",
    qualified: "Pätevät varahenkilöt",
    allowedRooms: "Sallitut huoneet",
    allowedDevices: "Yhteensopivat laitteet",
    requiresDevice: "Vaatii laitteen",
    loading: "Asetuksia ladataan…",
    saved: "Asetukset tallennettu.",
    error: "Asetuksia ei voitu tallentaa.",
  },
  ru: {
    title: "Настройки календаря",
    back: "Назад к календарю",
    employees: "Сотрудники",
    rooms: "Кабинеты",
    devices: "Аппараты",
    services: "Назначение услуг",
    add: "Добавить",
    save: "Сохранить",
    name: "Имя",
    role: "Роль",
    color: "Цвет",
    order: "Порядок",
    active: "Активен",
    login: "Учетная запись",
    none: "Без учетной записи",
    primary: "Основной сотрудник",
    qualified: "Квалифицированные замены",
    allowedRooms: "Доступные кабинеты",
    allowedDevices: "Совместимые аппараты",
    requiresDevice: "Требуется аппарат",
    loading: "Загрузка настроек…",
    saved: "Настройки сохранены.",
    error: "Не удалось сохранить настройки.",
  },
} as const;

type SetupLabels = { [K in keyof (typeof labels)["en"]]: string };

export function CalendarSetup({
  locale,
  calendarHref,
}: {
  locale: "en" | "fi" | "ru";
  calendarHref: string;
}) {
  const t = labels[locale];
  const [data, setData] = useState<SetupPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/calendar/setup");
    if (response.ok) setData((await response.json()) as SetupPayload);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(payload: Record<string, unknown>) {
    setMessage(null);
    const response = await fetch("/api/admin/calendar/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setMessage(t.error);
      return false;
    }
    setMessage(t.saved);
    await load();
    return true;
  }

  if (!data)
    return <p className="font-sans text-[14px] text-muted">{t.loading}</p>;
  return (
    <div>
      <Link
        href={calendarHref}
        className="inline-flex min-h-[44px] items-center gap-[7px] font-sans text-[12px] tracking-[.08em] text-body uppercase"
      >
        <ArrowLeft size={17} />
        {t.back}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-[12px]">
        <h1 className="font-display text-[clamp(34px,5vw,54px)] font-medium">
          {t.title}
        </h1>
        <button type="button" onClick={() => void load()} className={secondary}>
          <ArrowClockwise size={17} />
          Refresh
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className="mt-[12px] rounded-[5px] border border-line-btn bg-btn-fill px-[14px] py-[10px] font-sans text-[14px]"
        >
          {message}
        </p>
      ) : null}

      <SetupSection title={t.employees}>
        <div className="grid gap-[10px] xl:grid-cols-2">
          {data.practitioners.map((item) => (
            <PractitionerForm
              key={item.id}
              item={item}
              users={data.staffUsers}
              t={t}
              save={save}
            />
          ))}
          <PractitionerForm users={data.staffUsers} t={t} save={save} />
        </div>
      </SetupSection>
      <div className="grid gap-[16px] xl:grid-cols-2">
        <SetupSection title={t.rooms}>
          <div className="grid gap-[9px]">
            {data.rooms.map((item) => (
              <ResourceForm
                key={item.id}
                kind="Room"
                item={item}
                t={t}
                save={save}
              />
            ))}
            <ResourceForm kind="Room" t={t} save={save} />
          </div>
        </SetupSection>
        <SetupSection title={t.devices}>
          <div className="grid gap-[9px]">
            {data.devices.map((item) => (
              <ResourceForm
                key={item.id}
                kind="Device"
                item={item}
                t={t}
                save={save}
              />
            ))}
            <ResourceForm kind="Device" t={t} save={save} />
          </div>
        </SetupSection>
      </div>
      <SetupSection title={t.services}>
        <div className="grid gap-[10px] xl:grid-cols-2">
          {data.services
            .filter((item) => item.bookable)
            .map((service) => (
              <ServiceForm
                key={service.id}
                service={service}
                practitioners={data.practitioners.filter((item) => item.active)}
                rooms={data.rooms.filter((item) => item.active)}
                devices={data.devices.filter((item) => item.active)}
                t={t}
                save={save}
              />
            ))}
        </div>
      </SetupSection>
    </div>
  );
}

function PractitionerForm({
  item,
  users,
  t,
  save,
}: {
  item?: Practitioner;
  users: StaffUser[];
  t: SetupLabels;
  save: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [role, setRole] = useState(item?.role ?? "Specialist");
  const [color, setColor] = useState(item?.calendarColor ?? "#B89B72");
  const [order, setOrder] = useState(item?.displayOrder ?? 0);
  const [active, setActive] = useState(item?.active ?? true);
  const [userId, setUserId] = useState(item?.staff?.userId ?? "");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save({
          action: "savePractitioner",
          id: item?.id,
          name,
          role,
          calendarColor: color,
          displayOrder: order,
          active,
          userId,
        });
      }}
      className={card}
    >
      <div className="grid gap-[9px] sm:grid-cols-2">
        <Field label={t.name}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={input}
          />
        </Field>
        <Field label={t.role}>
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            required
            className={input}
          />
        </Field>
        <Field label={t.color}>
          <div className="flex gap-[8px]">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-[44px] w-[54px] rounded border border-line-btn bg-page p-[3px]"
            />
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className={input}
            />
          </div>
        </Field>
        <Field label={t.order}>
          <input
            type="number"
            value={order}
            onChange={(event) => setOrder(Number(event.target.value))}
            className={input}
          />
        </Field>
        <Field label={t.login}>
          <ThemedSelect
            value={userId}
            onValueChange={setUserId}
            options={[
              { value: "", label: t.none },
              ...users.map((user) => ({
                value: user.id,
                label: user.name ? `${user.name} · ${user.email}` : user.email,
              })),
            ]}
          />
        </Field>
      </div>
      <div className="mt-[10px] flex items-center justify-between gap-[10px]">
        <Check checked={active} onChange={setActive} label={t.active} />
        <button className={primary}>
          {item ? (
            t.save
          ) : (
            <>
              <Plus size={16} />
              {t.add}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ResourceForm({
  kind,
  item,
  t,
  save,
}: {
  kind: "Room" | "Device";
  item?: Resource;
  t: SetupLabels;
  save: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [order, setOrder] = useState(item?.displayOrder ?? 0);
  const [active, setActive] = useState(item?.active ?? true);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save({
          action: `save${kind}`,
          id: item?.id,
          name,
          displayOrder: order,
          active,
        });
      }}
      className={card}
    >
      <div className="grid gap-[9px] sm:grid-cols-[1fr_90px_auto]">
        <Field label={t.name}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={input}
          />
        </Field>
        <Field label={t.order}>
          <input
            type="number"
            value={order}
            onChange={(event) => setOrder(Number(event.target.value))}
            className={input}
          />
        </Field>
        <button className={`${primary} self-end`}>
          {item ? t.save : t.add}
        </button>
      </div>
      <Check checked={active} onChange={setActive} label={t.active} />
    </form>
  );
}

function ServiceForm({
  service,
  practitioners,
  rooms,
  devices,
  t,
  save,
}: {
  service: Service;
  practitioners: Practitioner[];
  rooms: Resource[];
  devices: Resource[];
  t: SetupLabels;
  save: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [primaryId, setPrimaryId] = useState(
    service.primaryPractitionerId ?? "",
  );
  const [qualified, setQualified] = useState(service.qualifiedPractitionerIds);
  const [roomIds, setRoomIds] = useState(service.roomIds);
  const [deviceIds, setDeviceIds] = useState(service.deviceIds);
  const [requiresDevice, setRequiresDevice] = useState(service.requiresDevice);
  const toggle = (
    values: string[],
    id: string,
    setter: (next: string[]) => void,
  ) =>
    setter(
      values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id],
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save({
          action: "configureService",
          serviceId: service.id,
          primaryPractitionerId: primaryId,
          qualifiedPractitionerIds: qualified,
          roomIds,
          deviceIds,
          requiresDevice,
        });
      }}
      className={card}
    >
      <h3 className="font-display text-[22px] font-medium">{service.name}</h3>
      <p className="font-sans text-[11px] text-muted">{service.slug}</p>
      <Field label={t.primary}>
        <ThemedSelect
          value={primaryId}
          onValueChange={(value) => {
            setPrimaryId(value);
            if (value && !qualified.includes(value))
              setQualified([...qualified, value]);
          }}
          options={[
            { value: "", label: "—" },
            ...practitioners.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          ]}
        />
      </Field>
      <ChoiceGroup
        label={t.qualified}
        items={practitioners}
        selected={qualified}
        toggle={(id) => toggle(qualified, id, setQualified)}
      />
      <ChoiceGroup
        label={t.allowedRooms}
        items={rooms}
        selected={roomIds}
        toggle={(id) => toggle(roomIds, id, setRoomIds)}
      />
      <ChoiceGroup
        label={t.allowedDevices}
        items={devices}
        selected={deviceIds}
        toggle={(id) => toggle(deviceIds, id, setDeviceIds)}
      />
      <div className="mt-[10px] flex justify-between gap-[10px]">
        <Check
          checked={requiresDevice}
          onChange={setRequiresDevice}
          label={t.requiresDevice}
        />
        <button className={primary}>{t.save}</button>
      </div>
    </form>
  );
}

function ChoiceGroup({
  label,
  items,
  selected,
  toggle,
}: {
  label: string;
  items: Array<{ id: string; name: string }>;
  selected: string[];
  toggle: (id: string) => void;
}) {
  return (
    <fieldset className="mt-[12px]">
      <legend className="font-sans text-[11px] tracking-[.08em] text-muted uppercase">
        {label}
      </legend>
      <div className="mt-[5px] flex flex-wrap gap-x-[14px]">
        {items.map((item) => (
          <Check
            key={item.id}
            checked={selected.includes(item.id)}
            onChange={() => toggle(item.id)}
            label={item.name}
          />
        ))}
      </div>
    </fieldset>
  );
}
function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-[40px] items-center gap-[7px] font-sans text-[13px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-[17px] accent-accent"
      />
      {label}
    </label>
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
    <label className="mt-[10px] block first:mt-0">
      <span className="mb-[5px] block font-sans text-[11px] tracking-[.08em] text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
function SetupSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-[18px] rounded-[8px] border border-line-card bg-card p-[clamp(15px,2vw,22px)]">
      <h2 className="font-display text-[28px] font-medium">{title}</h2>
      <div className="mt-[14px]">{children}</div>
    </section>
  );
}
const card = "rounded-[7px] border border-line-card bg-page p-[14px]";
const input =
  "min-h-[44px] w-full rounded-[4px] border border-line-btn bg-card px-[11px] font-sans text-[14px] outline-none focus:border-accent";
const primary =
  "inline-flex min-h-[40px] items-center justify-center gap-[6px] rounded-[4px] bg-accent px-[14px] font-sans text-[11px] font-medium tracking-[.08em] text-page uppercase";
const secondary =
  "inline-flex min-h-[40px] items-center justify-center gap-[6px] rounded-[4px] border border-line-btn bg-card px-[12px] font-sans text-[11px] uppercase";
