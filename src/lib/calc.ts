// Pure, dependency-free calculation helpers ported 1:1 from the original
// single-file app's logic, so the numbers behave identically.
//
// IMPORTANT: this app now renders server-side (Vercel runs in UTC), unlike
// the original single-file app which ran entirely in the browser. Every
// "what day is it / what day did this fall on" calculation below takes an
// explicit IANA timeZone string (e.g. "Africa/Algiers") so a workout logged
// at 00:30 local time doesn't silently land on the wrong calendar day just
// because the server's clock is in a different zone. See timezone-session.ts
// for where that string comes from (a cookie set by the browser).

// 0=Monday .. 6=Sunday throughout the app, matching the Monday-start week
// strip and calendar grid.
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LABELS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const WEEKDAY_TO_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Breaks an absolute instant into its wall-clock components *in a given
 *  timezone* -- the building block every other date helper here uses. */
export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const map: Record<string, string> = {};
  fmt.formatToParts(date).forEach((p) => {
    map[p.type] = p.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: map.hour === "24" ? 0 : Number(map.hour),
    minute: Number(map.minute),
    weekday: map.weekday, // "Mon" .. "Sun"
  };
}

/** A "pure" calendar date with no time-of-day or real timezone attached --
 *  anchored at UTC midnight purely so we can add/subtract days safely
 *  without DST or zone drift. Never format this with a timeZone option;
 *  read it back with the getUTC* accessors. */
export function calendarDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function addCalendarDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function calendarDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** "Today", as a pure calendar date, in the given timezone. */
export function zonedToday(timeZone: string): Date {
  const p = zonedParts(new Date(), timeZone);
  return calendarDate(p.year, p.month, p.day);
}

/** Which calendar day (in the given timezone) an absolute instant fell on. */
export function zonedDateKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function dayIndex(timeZone: string): number {
  const p = zonedParts(new Date(), timeZone);
  return WEEKDAY_TO_INDEX[p.weekday] ?? 0;
}

export function dayIndexOfCalendarDate(d: Date): number {
  const jsDay = d.getUTCDay(); // 0=Sun .. 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function startOfWeek(calendarDay: Date): Date {
  const diffToMonday = dayIndexOfCalendarDate(calendarDay) * -1;
  return addCalendarDays(calendarDay, diffToMonday);
}

export function estOneRM(weight: number, reps: number) {
  return weight * (1 + reps / 30); // Epley formula
}

export type PlateCount = { weight: number; count: number };
export const PLATE_SET = [25, 20, 15, 10, 5, 2.5, 1.25];

export function calculatePlateBreakdown(targetTotal: number, barWeight: number) {
  const perSideTarget = (targetTotal - barWeight) / 2;
  if (!(targetTotal > 0) || perSideTarget < 0) return null;

  let remaining = Math.round(perSideTarget * 100) / 100;
  const counts: PlateCount[] = [];
  for (const plate of PLATE_SET) {
    const count = Math.floor(remaining / plate + 1e-9);
    if (count > 0) {
      counts.push({ weight: plate, count });
      remaining = Math.round((remaining - count * plate) * 100) / 100;
    }
  }
  const achievedPerSide = perSideTarget - remaining;
  const achievedTotal = Math.round((barWeight + achievedPerSide * 2) * 100) / 100;
  return { counts, remaining, achievedTotal, perSideTarget, targetTotal, barWeight, exact: remaining < 0.01 };
}

export const PLATE_COLORS = ["plate-blue", "plate-red", "plate-yellow", "plate-green"];
export function plateColorClass(index: number) {
  return PLATE_COLORS[index % PLATE_COLORS.length];
}

export function plateColorForWeight(weight: number) {
  const map: Record<number, string> = { 25: "var(--plate-red-hi)", 20: "var(--plate-blue-hi)", 15: "var(--plate-yellow-hi)", 10: "var(--plate-green-hi)" };
  return map[weight] || "var(--text-tertiary)";
}


export function fmtDate(iso: string, timeZone: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", timeZone }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone })
  );
}

export function fmtShortDate(iso: string, timeZone: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone });
}
