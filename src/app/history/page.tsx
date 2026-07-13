import Link from "next/link";
import { getActiveProfile } from "@/lib/profile-session";
import { getSessions, getTrainedDateKeys, getSessionsForDateKey } from "@/lib/queries";
import { dateKey } from "@/lib/calc";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";

function buildCalendarCells(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-start offset
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells: { date: Date; inMonth: boolean }[] = [];
  const cursor = new Date(gridStart);
  for (let i = 0; i < 42; i++) {
    cells.push({ date: new Date(cursor), inMonth: cursor.getMonth() === month });
    cursor.setDate(cursor.getDate() + 1);
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
  const view = viewParam === "calendar" ? "calendar" : "list";

  const today = new Date();
  const [cursorYear, cursorMonth] = monthParam
    ? monthParam.split("-").map(Number)
    : [today.getFullYear(), today.getMonth() + 1];
  const cursorDate = new Date(cursorYear, cursorMonth - 1, 1);

  const selectedKey = dayParam ?? (view === "calendar" ? dateKey(today) : null);
  const monthLabel = cursorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function monthHref(delta: number) {
    const d = new Date(cursorYear, cursorMonth - 1 + delta, 1);
    return `/history?view=calendar&month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
    const trainedKeys = await getTrainedDateKeys(profile.id);
    const todayKey = dateKey(today);
    const cells = buildCalendarCells(cursorYear, cursorMonth - 1);
    const daySessions = selectedKey ? await getSessionsForDateKey(profile.id, selectedKey) : [];
    const selectedDate = selectedKey
      ? (() => {
          const [y, m, d] = selectedKey.split("-").map(Number);
          return new Date(y, m - 1, d);
        })()
      : null;
    const dayLabel = selectedDate
      ? selectedDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
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
              const key = dateKey(date);
              const trained = trainedKeys.has(key);
              return (
                <Link
                  key={key}
                  href={`/history?view=calendar&month=${cursorYear}-${String(cursorMonth).padStart(2, "0")}&day=${key}`}
                  className={`cal-day ${inMonth ? "" : "cal-day-out"} ${key === todayKey ? "cal-day-today" : ""} ${key === selectedKey ? "cal-day-selected" : ""}`}
                >
                  <span className="cal-day-num">{date.getDate()}</span>
                  {trained ? <span className="cal-day-dot"></span> : null}
                </Link>
              );
            })}
          </div>
        </div>
        {selectedKey ? <span className="eyebrow">{dayLabel}</span> : null}
        {daySessions.length ? (
          daySessions.map((s) => <SessionSummaryCard key={s.id} session={s} />)
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
        sessions.map((s) => <SessionSummaryCard key={s.id} session={s} />)
      ) : (
        <div className="empty-state">No workout sessions yet. Start one from the Dashboard.</div>
      )}
    </>
  );
}
