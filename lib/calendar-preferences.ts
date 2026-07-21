import {
  INTERNAL_CALENDAR_SERVICES,
  INTERNAL_PALETTE_MAX_SELECTED,
} from "@/lib/internal-calendar-services";

export type InternalPaletteCatalogItem = {
  key: string;
  dragLabel: string;
  defaultEnabled: boolean;
};

export type InternalPalettePreference = {
  key: string;
  alias: string;
  enabled: boolean;
};

export function truncateCalendarAlias(value: string) {
  return Array.from(value.trim()).slice(0, 14).join("");
}

function defaultCatalog(): InternalPaletteCatalogItem[] {
  return INTERNAL_CALENDAR_SERVICES.map((service) => ({
    key: service.key,
    dragLabel: service.dragLabel,
    defaultEnabled: service.defaultEnabled,
  }));
}

export function normalizeInternalPalette(
  value: unknown,
  catalog: InternalPaletteCatalogItem[] = defaultCatalog(),
) {
  const catalogByKey = new Map(catalog.map((item) => [item.key, item]));
  const seen = new Set<string>();
  const normalized: InternalPalettePreference[] = [];
  let enabledCount = 0;

  if (Array.isArray(value)) {
    for (const raw of value) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Partial<InternalPalettePreference>;
      if (!item.key || !catalogByKey.has(item.key) || seen.has(item.key))
        continue;
      const fallback = catalogByKey.get(item.key)!;
      const requestedEnabled = item.enabled !== false;
      const enabled =
        requestedEnabled && enabledCount < INTERNAL_PALETTE_MAX_SELECTED;
      if (enabled) enabledCount += 1;
      seen.add(item.key);
      normalized.push({
        key: item.key,
        alias:
          truncateCalendarAlias(String(item.alias ?? "")) || fallback.dragLabel,
        enabled,
      });
    }
  }

  for (const item of catalog) {
    if (seen.has(item.key)) continue;
    const enabled =
      item.defaultEnabled && enabledCount < INTERNAL_PALETTE_MAX_SELECTED;
    if (enabled) enabledCount += 1;
    normalized.push({
      key: item.key,
      alias: truncateCalendarAlias(item.dragLabel),
      enabled,
    });
  }
  return normalized;
}

export function normalizeEmployeeSelection(
  value: unknown,
  validIds: string[],
  ownPractitionerId: string | null,
) {
  const valid = new Set(validIds);
  const stored = Array.isArray(value)
    ? [...new Set(value.map(String).filter((id) => valid.has(id)))]
    : [];
  if (stored.length) return ownPractitionerId ? [ownPractitionerId] : stored;
  return ownPractitionerId ? [ownPractitionerId] : validIds;
}

export function calendarDropStart(date: string, minute: number): string | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute >= 1440 ||
    minute % 15 !== 0
  )
    return null;
  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  start.setUTCMinutes(minute);
  return start.toISOString();
}
