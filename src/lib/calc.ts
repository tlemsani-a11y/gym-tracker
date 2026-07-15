// Pure, dependency-free calculation helpers ported 1:1 from the original
// single-file app's logic, so the numbers behave identically.

// 0=Monday .. 6=Sunday throughout the app, matching the Monday-start week
// strip and calendar grid.
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LABELS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function dayIndex(date: Date = new Date()): number {
  const jsDay = date.getDay(); // 0=Sun .. 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function estOneRM(weight: number, reps: number) {
  return weight * (1 + reps / 30); // Epley formula
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
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


export function fmtDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export function fmtShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}
