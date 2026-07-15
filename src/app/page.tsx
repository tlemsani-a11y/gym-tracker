import Link from "next/link";
import { getActiveProfile } from "@/lib/profile-session";
import { getProgramsWithDays, getSessions, getExercises } from "@/lib/queries";
import { plateColorClass, fmtDate, getStartOfWeek, isSameDay, dateKey, dayIndex, DAY_LABELS, DAY_LABELS_FULL } from "@/lib/calc";
import { startWorkoutAction, deleteProgramAction } from "@/lib/actions";
import { DeleteButton } from "@/components/CrudControls";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: dayParam } = await searchParams;
  const profile = await getActiveProfile();
  const programs = await getProgramsWithDays(profile.id);
  const sessions = await getSessions(profile.id);
  const exerciseCounts = await Promise.all(programs.map((p) => getExercises(p.id)));
  const lastSession = sessions[0];

  const todayIdx = dayIndex();
  const todayPrograms = programs.filter((p) => p.days.includes(todayIdx));

  const startOfWeek = getStartOfWeek(new Date());
  const today = new Date();
  const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const trained = sessions.some((s) => {
      const sd = new Date(s.created_at);
      return sd >= day && sd <= dayEnd;
    });
    return { date: day, trained, isToday: isSameDay(day, today), label: weekLabels[i] };
  });
  const trainedCount = days.filter((d) => d.trained).length;

  // ---- Filter for the "All programs" grid ----
  let filtered = programs;
  let filterLabel = "All programs";
  if (dayParam === "unscheduled") {
    filtered = programs.filter((p) => p.days.length === 0);
    filterLabel = "Unscheduled";
  } else if (dayParam !== undefined && dayParam !== "all") {
    const idx = Number(dayParam);
    if (!isNaN(idx) && idx >= 0 && idx <= 6) {
      filtered = programs.filter((p) => p.days.includes(idx));
      filterLabel = DAY_LABELS_FULL[idx];
    }
  }

  return (
    <>
      <h1>Dashboard</h1>

      <span className="eyebrow">Today · {DAY_LABELS_FULL[todayIdx]}</span>
      {todayPrograms.length ? (
        <div className="grid" style={{ marginBottom: "0.85rem" }}>
          {todayPrograms.map((p) => {
            const exIndex = programs.findIndex((pp) => pp.id === p.id);
            const exercises = exerciseCounts[exIndex];
            return (
              <div key={p.id} className="card today-section-card">
                <h2>{p.name}</h2>
                <p className="muted">{exercises.length} exercise{exercises.length === 1 ? "" : "s"}</p>
                <form action={startWorkoutAction.bind(null, p.id)}>
                  <button className="btn btn-primary btn-lg" type="submit">Start Workout</button>
                </form>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: "1.5rem 1rem", marginBottom: "0.85rem" }}>
          No program scheduled for today. <Link href="/programs">Assign one in Programs</Link>.
        </div>
      )}

      <div className="card">
        <div className="exercise-stat-header">
          <span className="eyebrow" style={{ margin: 0 }}>This week</span>
          <span className="muted">{trainedCount}/7 days</span>
        </div>
        <div className="week-strip">
          {days.map((d) => (
            <Link
              key={dateKey(d.date)}
              href={`/history?view=calendar&day=${dateKey(d.date)}&month=${d.date.getFullYear()}-${String(
                d.date.getMonth() + 1
              ).padStart(2, "0")}`}
              className={`week-day ${d.trained ? "trained" : ""} ${d.isToday ? "today" : ""}`}
            >
              <span className="week-day-dot"></span>
              <span className="week-day-label">{d.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {lastSession ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>Last workout</p>
          <div style={{ fontWeight: 600 }}>{lastSession.program_name}</div>
          <p className="muted" style={{ margin: "0 0 0.5rem" }}>{fmtDate(lastSession.created_at)}</p>
          <Link href={`/session/${lastSession.id}`} className="btn">View session</Link>
        </div>
      ) : null}

      <h2 className="muted">{filterLabel}</h2>
      <div className="day-filter-row">
        <Link href="/" className={`day-pill ${!dayParam ? "active" : ""}`}>All</Link>
        {DAY_LABELS.map((label, i) => (
          <Link key={i} href={`/?day=${i}`} className={`day-pill ${dayParam === String(i) ? "active" : ""}`}>
            {label}
          </Link>
        ))}
        <Link href="/?day=unscheduled" className={`day-pill ${dayParam === "unscheduled" ? "active" : ""}`}>
          Unscheduled
        </Link>
      </div>

      <div className="grid">
        {filtered.length ? (
          filtered.map((p) => {
            const exIndex = programs.findIndex((pp) => pp.id === p.id);
            const exercises = exerciseCounts[exIndex];
            return (
              <div key={p.id} className={`card ${plateColorClass(exIndex)}`}>
                <div className="card-header-row">
                  <h2 style={{ margin: 0 }}>{p.name}</h2>
                  <DeleteButton
                    confirmMessage={`Delete "${p.name}" and all its exercises? This cannot be undone.`}
                    action={deleteProgramAction.bind(null, p.id)}
                    className="btn btn-sm btn-danger"
                  >
                    ✕
                  </DeleteButton>
                </div>
                <p className="muted" style={{ margin: 0 }}>{exercises.length} exercise{exercises.length === 1 ? "" : "s"}</p>
                <div className="day-badge-row">
                  {p.days.length ? (
                    p.days.map((d) => (
                      <span key={d} className={`day-badge ${d === todayIdx ? "today" : ""}`}>{DAY_LABELS[d]}</span>
                    ))
                  ) : (
                    <span className="day-badge">Unscheduled</span>
                  )}
                </div>
                <form action={startWorkoutAction.bind(null, p.id)}>
                  <button className="btn btn-primary btn-lg" type="submit">Start Workout</button>
                </form>
              </div>
            );
          })
        ) : (
          <div className="empty-state">Nothing here yet.</div>
        )}
      </div>
    </>
  );
}
