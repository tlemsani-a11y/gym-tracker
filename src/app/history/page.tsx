import Link from "next/link";
import { getActiveProfile } from "@/lib/profile-session";
import { getTimeZone } from "@/lib/timezone-session";
import { getSessions, getAllSetsForProfile, getAllExercisesForProfile, type SetRow } from "@/lib/queries";
import { calendarDate, addCalendarDays, calendarDateKey, zonedToday, zonedDateKey } from "@/lib/calc";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";
import { HistoryBulkSelect } from "@/components/HistoryBulkSelect";

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

  // Fetch everything this page could need in three bulk queries, once --
  // regardless of session/exercise count -- instead of a query per card.
  const [sessions, allSets, allExercises] = await Promise.all([
    getSessions(profile.id),
    getAllSetsForProfile(profile.id),
    getAllExercisesForProfile(profile.id),
  ]);
  const exerciseNameById = new Map(allExercises.map((ex) => [ex.id, ex.name]));
  const setsBySession = new Map<string, SetRow[]>();
  allSets.forEach((s) => {
    const list = setsBySession.get(s.session_id) ?? [];
    list.push(s);
    setsBySession.set(s.session_id, list);
  });

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
          <HistoryBulkSelect sessionIds={daySessions.map((s) => s.id)}>
            {daySessions.map((s) => (
              <SessionSummaryCard
                key={s.id}
                session={s}
                sets={setsBySession.get(s.id) ?? []}
                exerciseNameById={exerciseNameById}
                timeZone={timeZone}
              />
            ))}
          </HistoryBulkSelect>
        ) : (
          <div className="empty-state">{selectedKey ? "No workout logged this day." : "Tap a day to see what you did."}</div>
        )}
      </>
    );
  }

  return (
    <>
      <h1>History</h1>
      {toggleHtml}
      {sessions.length ? (
        <HistoryBulkSelect sessionIds={sessions.map((s) => s.id)}>
          {sessions.map((s) => (
            <SessionSummaryCard
              key={s.id}
              session={s}
              sets={setsBySession.get(s.id) ?? []}
              exerciseNameById={exerciseNameById}
              timeZone={timeZone}
            />
          ))}
        </HistoryBulkSelect>
      ) : (
        <div className="empty-state">No workout sessions yet. Start one from the Dashboard.</div>
      )}
    </>
  );
}
