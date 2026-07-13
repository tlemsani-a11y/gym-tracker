import { uid, dbAll, dbGet, dbRun, dbBatch } from "./db";

export type Exercise = { id: string; program_id: string; name: string; sort_order: number };
export type Program = { id: string; profile_id: string; name: string; sort_order: number };
export type SessionRow = { id: string; profile_id: string; program_id: string | null; program_name: string; created_at: string };
export type SetRow = { id: string; session_id: string; exercise_id: string; weight: number; reps: number; created_at: string };
export type BodyweightRow = { id: string; profile_id: string; date: string; weight_kg: number };

// ---------- Programs & exercises ----------

export function getPrograms(profileId: string): Promise<Program[]> {
  return dbAll<Program>("SELECT * FROM programs WHERE profile_id = ? ORDER BY sort_order ASC", [profileId]);
}

export function getProgram(programId: string): Promise<Program | undefined> {
  return dbGet<Program>("SELECT * FROM programs WHERE id = ?", [programId]);
}

export function getExercises(programId: string): Promise<Exercise[]> {
  return dbAll<Exercise>("SELECT * FROM exercises WHERE program_id = ? ORDER BY sort_order ASC", [programId]);
}

export function getExercise(exerciseId: string): Promise<Exercise | undefined> {
  return dbGet<Exercise>("SELECT * FROM exercises WHERE id = ?", [exerciseId]);
}

export async function createProgram(profileId: string, name: string) {
  const row = await dbGet<{ m: number }>("SELECT COALESCE(MAX(sort_order), -1) as m FROM programs WHERE profile_id = ?", [profileId]);
  const id = uid();
  await dbRun("INSERT INTO programs (id, profile_id, name, sort_order) VALUES (?, ?, ?, ?)", [
    id,
    profileId,
    name,
    (row?.m ?? -1) + 1,
  ]);
  return id;
}

export function renameProgram(programId: string, name: string) {
  return dbRun("UPDATE programs SET name = ? WHERE id = ?", [name, programId]);
}

export function deleteProgram(programId: string) {
  return dbRun("DELETE FROM programs WHERE id = ?", [programId]);
}

export async function addExercise(programId: string, name: string) {
  const row = await dbGet<{ m: number }>("SELECT COALESCE(MAX(sort_order), -1) as m FROM exercises WHERE program_id = ?", [programId]);
  await dbRun("INSERT INTO exercises (id, program_id, name, sort_order) VALUES (?, ?, ?, ?)", [
    uid(),
    programId,
    name,
    (row?.m ?? -1) + 1,
  ]);
}

export function renameExercise(exerciseId: string, name: string) {
  return dbRun("UPDATE exercises SET name = ? WHERE id = ?", [name, exerciseId]);
}

export function deleteExercise(exerciseId: string) {
  return dbRun("DELETE FROM exercises WHERE id = ?", [exerciseId]);
}

export async function moveExercise(programId: string, exerciseId: string, direction: -1 | 1) {
  const exercises = await getExercises(programId);
  const index = exercises.findIndex((e) => e.id === exerciseId);
  const swapWith = index + direction;
  if (index === -1 || swapWith < 0 || swapWith >= exercises.length) return;
  const a = exercises[index];
  const b = exercises[swapWith];
  await dbBatch([
    { sql: "UPDATE exercises SET sort_order = ? WHERE id = ?", args: [b.sort_order, a.id] },
    { sql: "UPDATE exercises SET sort_order = ? WHERE id = ?", args: [a.sort_order, b.id] },
  ]);
}

// ---------- Sessions & sets ----------

export function getSessions(profileId: string): Promise<SessionRow[]> {
  return dbAll<SessionRow>("SELECT * FROM sessions WHERE profile_id = ? ORDER BY created_at DESC", [profileId]);
}

export function getSession(sessionId: string): Promise<SessionRow | undefined> {
  return dbGet<SessionRow>("SELECT * FROM sessions WHERE id = ?", [sessionId]);
}

export function getSetsForSession(sessionId: string): Promise<SetRow[]> {
  return dbAll<SetRow>("SELECT * FROM sets WHERE session_id = ? ORDER BY created_at ASC", [sessionId]);
}

export async function startWorkout(profileId: string, programId: string) {
  const program = await getProgram(programId);
  if (!program) throw new Error("Program not found");
  const id = uid();
  await dbRun(
    "INSERT INTO sessions (id, profile_id, program_id, program_name, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, profileId, program.id, program.name, new Date().toISOString()]
  );
  return id;
}

export async function addSet(sessionId: string, exerciseId: string, weight: number, reps: number) {
  const id = uid();
  await dbRun(
    "INSERT INTO sets (id, session_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, sessionId, exerciseId, weight, reps, new Date().toISOString()]
  );
  return id;
}

export async function deleteSet(setId: string) {
  const set = await dbGet<SetRow>("SELECT * FROM sets WHERE id = ?", [setId]);
  await dbRun("DELETE FROM sets WHERE id = ?", [setId]);
  return set;
}

export function restoreSet(set: SetRow) {
  return dbRun(
    "INSERT INTO sets (id, session_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [set.id, set.session_id, set.exercise_id, set.weight, set.reps, set.created_at]
  );
}

export function updateSet(setId: string, weight: number, reps: number) {
  return dbRun("UPDATE sets SET weight = ?, reps = ? WHERE id = ?", [weight, reps, setId]);
}

export function setDefaultRestSeconds(profileId: string, seconds: number) {
  return dbRun("UPDATE profiles SET default_rest_seconds = ? WHERE id = ?", [seconds, profileId]);
}

// ---------- Stats / PRs ----------

export function getAllSetsForExercise(profileId: string, exerciseId: string): Promise<SetRow[]> {
  return dbAll<SetRow>(
    `SELECT sets.* FROM sets
     JOIN sessions ON sessions.id = sets.session_id
     WHERE sessions.profile_id = ? AND sets.exercise_id = ?
     ORDER BY sets.created_at ASC`,
    [profileId, exerciseId]
  );
}

export async function getTopSetPerSessionForExercise(profileId: string, exerciseId: string) {
  const sessions = (await getSessions(profileId))
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const points: { label: string; value: number; iso: string }[] = [];
  for (const session of sessions) {
    const sets = (await getSetsForSession(session.id)).filter((s) => s.exercise_id === exerciseId);
    if (!sets.length) continue;
    const top = sets.reduce((a, b) => (b.weight > a.weight ? b : a));
    points.push({ label: session.created_at, value: top.weight, iso: session.created_at });
  }
  return points;
}

export async function getOverallStats(profileId: string) {
  const totalSessionsRow = await dbGet<{ c: number }>("SELECT COUNT(*) as c FROM sessions WHERE profile_id = ?", [profileId]);
  const totalSetsRow = await dbGet<{ c: number }>(
    `SELECT COUNT(*) as c FROM sets JOIN sessions ON sessions.id = sets.session_id WHERE sessions.profile_id = ?`,
    [profileId]
  );
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const workoutsThisWeekRow = await dbGet<{ c: number }>(
    "SELECT COUNT(*) as c FROM sessions WHERE profile_id = ? AND created_at >= ?",
    [profileId, weekAgo]
  );
  const totalProgramsRow = await dbGet<{ c: number }>("SELECT COUNT(*) as c FROM programs WHERE profile_id = ?", [profileId]);

  return {
    totalSessions: totalSessionsRow?.c ?? 0,
    totalSets: totalSetsRow?.c ?? 0,
    workoutsThisWeek: workoutsThisWeekRow?.c ?? 0,
    totalPrograms: totalProgramsRow?.c ?? 0,
  };
}

// Every exercise that has ever had a set logged, across all programs
// (including ones since deleted), so Stats can show history for it.
export async function getAllTrainedExercises(profileId: string): Promise<{ id: string; name: string }[]> {
  const rows = await dbAll<{ id: string }>(
    `SELECT DISTINCT sets.exercise_id as id FROM sets
     JOIN sessions ON sessions.id = sets.session_id
     WHERE sessions.profile_id = ?`,
    [profileId]
  );

  const results: { id: string; name: string }[] = [];
  for (const r of rows) {
    const ex = await dbGet<{ name: string }>("SELECT name FROM exercises WHERE id = ?", [r.id]);
    results.push({ id: r.id, name: ex?.name ?? "Deleted exercise" });
  }
  return results;
}

// ---------- Bodyweight ----------

export function getBodyweightLogs(profileId: string): Promise<BodyweightRow[]> {
  return dbAll<BodyweightRow>("SELECT * FROM bodyweight_logs WHERE profile_id = ? ORDER BY date DESC", [profileId]);
}

export async function logBodyweight(profileId: string, weightKg: number) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const existing = await dbGet<BodyweightRow>("SELECT * FROM bodyweight_logs WHERE profile_id = ? AND date LIKE ?", [
    profileId,
    `${todayKey}%`,
  ]);

  if (existing) {
    await dbRun("UPDATE bodyweight_logs SET weight_kg = ? WHERE id = ?", [weightKg, existing.id]);
    return { updated: true };
  }
  await dbRun("INSERT INTO bodyweight_logs (id, profile_id, date, weight_kg) VALUES (?, ?, ?, ?)", [
    uid(),
    profileId,
    today.toISOString(),
    weightKg,
  ]);
  return { updated: false };
}

export async function deleteBodyweightEntry(id: string) {
  const row = await dbGet<BodyweightRow>("SELECT * FROM bodyweight_logs WHERE id = ?", [id]);
  await dbRun("DELETE FROM bodyweight_logs WHERE id = ?", [id]);
  return row;
}

export function restoreBodyweightEntry(row: BodyweightRow) {
  return dbRun("INSERT INTO bodyweight_logs (id, profile_id, date, weight_kg) VALUES (?, ?, ?, ?)", [
    row.id,
    row.profile_id,
    row.date,
    row.weight_kg,
  ]);
}

// ---------- History / calendar ----------

export async function getTrainedDateKeys(profileId: string): Promise<Set<string>> {
  const rows = await dbAll<{ created_at: string }>("SELECT created_at FROM sessions WHERE profile_id = ?", [profileId]);
  const set = new Set<string>();
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  });
  return set;
}

export async function getSessionsForDateKey(profileId: string, key: string): Promise<SessionRow[]> {
  const sessions = await getSessions(profileId);
  return sessions.filter((s) => {
    const d = new Date(s.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return k === key;
  });
}
