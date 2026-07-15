import Link from "next/link";
import { getActiveProfile } from "@/lib/profile-session";
import { getProgramsWithDays, getExercises } from "@/lib/queries";
import { plateColorClass, DAY_LABELS, dayIndex } from "@/lib/calc";
import { deleteProgramAction } from "@/lib/actions";
import { DeleteButton } from "@/components/CrudControls";
import { NewProgramForm } from "@/components/NewProgramForm";

export default async function ProgramsPage() {
  const profile = await getActiveProfile();
  const programs = await getProgramsWithDays(profile.id);
  const exerciseCounts = await Promise.all(programs.map((p) => getExercises(p.id)));
  const todayIdx = dayIndex();

  return (
    <>
      <h1>Programs</h1>
      {programs.length ? (
        programs.map((p, i) => {
          const exercises = exerciseCounts[i];
          return (
            <div key={p.id} className={`card ${plateColorClass(i)}`}>
              <div className="card-header-row">
                <Link href={`/programs/${p.id}`} style={{ textDecoration: "none", color: "inherit", flex: "1 1 auto" }}>
                  <h2 style={{ margin: 0 }}>{p.name}</h2>
                </Link>
                <DeleteButton
                  confirmMessage={`Delete "${p.name}" and all its exercises? This cannot be undone.`}
                  action={deleteProgramAction.bind(null, p.id)}
                  className="btn btn-sm btn-danger"
                >
                  ✕
                </DeleteButton>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
              </p>
              <div className="day-badge-row">
                {p.days.length ? (
                  p.days.map((d) => (
                    <span key={d} className={`day-badge ${d === todayIdx ? "today" : ""}`}>{DAY_LABELS[d]}</span>
                  ))
                ) : (
                  <span className="day-badge">Unscheduled</span>
                )}
              </div>
              <Link href={`/programs/${p.id}`} className="btn btn-sm">Open</Link>
            </div>
          );
        })
      ) : (
        <div className="empty-state">No programs yet — add one below.</div>
      )}

      <div className="card">
        <h2>New program</h2>
        <NewProgramForm />
      </div>
    </>
  );
}
