import Link from "next/link";
import { getActiveProfile } from "@/lib/profile-session";
import { getPrograms, getExercises, getSessions } from "@/lib/queries";
import { plateColorClass, fmtDate, getStartOfWeek, isSameDay, dateKey } from "@/lib/calc";
import { startWorkoutAction } from "@/lib/actions";

export default async function DashboardPage() {
  const profile = await getActiveProfile();
  const programs = await getPrograms(profile.id);
  const sessions = await getSessions(profile.id);
  const lastSession = sessions[0];

  const startOfWeek = getStartOfWeek(new Date());
  const today = new Date();
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const trained = sessions.some((s) => {
      const sd = new Date(s.created_at);
      return sd >= day && sd <= dayEnd;
    });
    return { date: day, trained, isToday: isSameDay(day, today), label: labels[i] };
  });
  const trainedCount = days.filter((d) => d.trained).length;
  const exerciseCounts = await Promise.all(programs.map((p) => getExercises(p.id)));

  return (
    <>
      <h1>Dashboard</h1>

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

      <h2 className="muted">Start a workout</h2>
      <div className="grid">
        {programs.length ? (
          programs.map((p, i) => {
            const exercises = exerciseCounts[i];
            return (
              <div key={p.id} className={`card ${plateColorClass(i)}`}>
                <span className="ghost-index">{String(i + 1).padStart(2, "0")}</span>
                <h2>{p.name}</h2>
                <p className="muted">{exercises.length} exercise{exercises.length === 1 ? "" : "s"}</p>
                <form action={startWorkoutAction.bind(null, p.id)}>
                  <button className="btn btn-primary btn-lg" type="submit">Start Workout</button>
                </form>
              </div>
            );
          })
        ) : (
          <div className="empty-state">No programs yet. Go to Programs to add one.</div>
        )}
      </div>
    </>
  );
}
