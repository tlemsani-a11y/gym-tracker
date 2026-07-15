import { notFound } from "next/navigation";
import { getProgram, getExercises, getProgramDays } from "@/lib/queries";
import {
  addExerciseAction,
  renameExerciseAction,
  deleteExerciseAction,
  moveExerciseAction,
  renameProgramAction,
  deleteProgramAction,
  startWorkoutAction,
} from "@/lib/actions";
import { AddItemForm, RenameButton, DeleteButton, MoveButtons } from "@/components/CrudControls";
import { ProgramDaysEditor } from "@/components/ProgramDaysEditor";

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getProgram(id);
  if (!program) notFound();

  const [exercises, days] = await Promise.all([getExercises(id), getProgramDays(id)]);

  return (
    <>
      <div className="row" style={{ alignItems: "center", marginBottom: "1rem", gap: "0.5rem" }}>
        <h1 style={{ margin: 0, flex: "1 1 auto" }}>{program.name}</h1>
        <RenameButton currentName={program.name} promptLabel="Rename program" action={renameProgramAction.bind(null, id)}>
          ✎
        </RenameButton>
        <form action={startWorkoutAction.bind(null, id)}>
          <button className="btn btn-primary" style={{ flex: "0 0 auto" }} type="submit">Start Workout</button>
        </form>
      </div>

      <div className="card">
        <span className="eyebrow" style={{ margin: 0 }}>Scheduled days</span>
        <ProgramDaysEditor programId={id} initialDays={days} />
      </div>

      <div className="card">
        {exercises.length ? (
          exercises.map((ex, i) => (
            <div key={ex.id} className="set-row exercise-row">
              <span className="reorder-controls">
                <MoveButtons
                  onMoveUp={moveExerciseAction.bind(null, id, ex.id, -1)}
                  onMoveDown={moveExerciseAction.bind(null, id, ex.id, 1)}
                  disableUp={i === 0}
                  disableDown={i === exercises.length - 1}
                />
              </span>
              <span className="exercise-row-name">{ex.name}</span>
              <span style={{ display: "flex", gap: "0.4rem" }}>
                <RenameButton currentName={ex.name} promptLabel="Rename exercise" action={renameExerciseAction.bind(null, ex.id)}>
                  ✎
                </RenameButton>
                <DeleteButton confirmMessage={`Delete "${ex.name}"?`} action={deleteExerciseAction.bind(null, ex.id)}>
                  ✕
                </DeleteButton>
              </span>
            </div>
          ))
        ) : (
          <p className="muted">No exercises yet. Add one below.</p>
        )}
      </div>

      <div className="card">
        <h2>Add exercise</h2>
        <AddItemForm action={addExerciseAction.bind(null, id)} placeholder="e.g. Bench Press" autoFocus />
      </div>

      <DeleteButton
        confirmMessage={`Delete "${program.name}" and all its exercises? This cannot be undone.`}
        action={deleteProgramAction.bind(null, id)}
        className="btn btn-danger"
        redirectTo="/programs"
      >
        Delete program
      </DeleteButton>
    </>
  );
}
