import Link from "next/link";
import { getActiveProfile } from "@/lib/profile-session";
import { getTimeZone } from "@/lib/timezone-session";
import { getSessions } from "@/lib/queries";
import { calendarDate, addCalendarDays, calendarDateKey, zonedToday, zonedDateKey } from "@/lib/calc";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";

function buildCalendarCells(year: number, month: number) {
  const firstOfMonth = calendarDate(year, month + 1, 1);
  const startOffset = (firstOfMonth.getUTCDay() + 6) % 7; // Monday-start offset
  const gridStart = addCalendarDays(firstOfMonth, -startOffset);
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addCalendarDays(gridStart, i);
    cells.push({ date, inMonth: date.getUTCMonth() === month });
  }
  return cells;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; day?: string }>;
}) {
  const { view: viewParam, month: monthParam, day: dayParam } = await searchParams;
  const profile = await getActiveProfile();
  const timeZone = await getTimeZone();
  const view = viewParam === "calendar" ? "calendar" : "list";

  const today = zonedToday(timeZone);
  const [cursorYear, cursorMonth] = monthParam
    ? monthParam.split("-").map(Number)
    : [today.getUTCFullYear(), today.getUTCMonth() + 1];
  const cursorDate = calendarDate(cursorYear, cursorMonth, 1);

  const todayKey = calendarDateKey(today);
  const selectedKey = dayParam ?? (view === "calendar" ? todayKey : null);
  const monthLabel = cursorDate.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  function monthHref(delta: number) {
    const target = new Date(Date.UTC(cursorYear, cursorMonth - 1 + delta, 1));
    return `/history?view=calendar&month=${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const toggleHtml = (
    <div className="history-view-toggle">
      <Link href="/history?view=list" className={`btn btn-sm ${view === "list" ? "active" : ""}`}>List</Link>
      <Link href={`/history?view=calendar&month=${cursorYear}-${String(cursorMonth).padStart(2, "0")}`} className={`btn btn-sm ${view === "calendar" ? "active" : ""}`}>
        Calendar
      </Link>
    </div>
  );

  if (view === "calendar") {
    const sessions = await getSessions(profile.id);
    const trainedKeys = new Set(sessions.map((s) => zonedDateKey(new Date(s.created_at), timeZone)));
    const cells = buildCalendarCells(cursorYear, cursorMonth - 1);
    const daySessions = selectedKey ? sessions.filter((s) => zonedDateKey(new Date(s.created_at), timeZone) === selectedKey) : [];
    const selectedDate = selectedKey
      ? (() => {
          const [y, m, d] = selectedKey.split("-").map(Number);
          return calendarDate(y, m, d);
        })()
      : null;
    const dayLabel = selectedDate
      ? selectedDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
      : "";

    return (
      <>
        <h1>History</h1>
        {toggleHtml}
        <div className="card">
          <div className="cal-header">
            <Link href={monthHref(-1)} className="btn btn-sm">‹</Link>
            <span className="cal-month-label">{monthLabel}</span>
            <Link href={monthHref(1)} className="btn btn-sm">›</Link>
          </div>
          <div className="cal-weekday-row">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="cal-grid">
            {cells.map(({ date, inMonth }) => {
              const key = calendarDateKey(date);
              const trained = trainedKeys.has(key);
              return (
                <Link
                  key={key}
                  href={`/history?view=calendar&month=${cursorYear}-${String(cursorMonth).padStart(2, "0")}&day=${key}`}
                  className={`cal-day ${inMonth ? "" : "cal-day-out"} ${key === todayKey ? "cal-day-today" : ""} ${key === selectedKey ? "cal-day-selected" : ""}`}
                >
                  <span className="cal-day-num">{date.getUTCDate()}</span>
                  {trained ? <span className="cal-day-dot"></span> : null}
                </Link>
              );
            })}
          </div>
        </div>
        {selectedKey ? <span className="eyebrow">{dayLabel}</span> : null}
        {daySessions.length ? (
          daySessions.map((s) => <SessionSummaryCard key={s.id} session={s} timeZone={timeZone} />)
        ) : (
          <div className="empty-state">{selectedKey ? "No workout logged this day." : "Tap a day to see what you did."}</div>
        )}
      </>
    );
  }

  const sessions = await getSessions(profile.id);
  return (
    <>
      <h1>History</h1>
      {toggleHtml}
      {sessions.length ? (
        sessions.map((s) => <SessionSummaryCard key={s.id} session={s} timeZone={timeZone} />)
      ) : (
        <div className="empty-state">No workout sessions yet. Start one from the Dashboard.</div>
      )}
    </>
  );
}
