import Link from "next/link";
import { getActiveProfile } from "@/lib/profile-session";
import { getPrograms, getExercises } from "@/lib/queries";
import { plateColorClass } from "@/lib/calc";
import { createProgramAction } from "@/lib/actions";
import { AddItemForm } from "@/components/CrudControls";

export default async function ProgramsPage() {
  const profile = await getActiveProfile();
  const programs = await getPrograms(profile.id);
  const exerciseCounts = await Promise.all(programs.map((p) => getExercises(p.id)));

  return (
    <>
      <h1>Programs</h1>
      {programs.length ? (
        programs.map((p, i) => {
          const exercises = exerciseCounts[i];
          return (
            <Link key={p.id} href={`/programs/${p.id}`} className={`card ${plateColorClass(i)}`} style={{ display: "block" }}>
              <h2>{p.name}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
              </p>
            </Link>
          );
        })
      ) : (
        <div className="empty-state">No programs yet — add one below.</div>
      )}

      <div className="card">
        <h2>New program</h2>
        <AddItemForm action={createProgramAction} placeholder="e.g. Push, Pull, Legs" />
      </div>
    </>
  );
}
