"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uid, dbRun, dbBatch, dbGet } from "./db";
import { getActiveProfile, setActiveProfileCookie, listProfiles } from "./profile-session";
import { getTimeZone } from "./timezone-session";
import * as q from "./queries";
import { estOneRM } from "./calc";

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------- Programs ----------

export async function createProgramAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const profile = await getActiveProfile();
  const programId = await q.createProgram(profile.id, name);
  const days = formData.getAll("days").map(Number).filter((n) => !isNaN(n));
  if (days.length) await q.setProgramDays(programId, days);
  revalidateAll();
}

export async function updateProgramDaysAction(programId: string, days: number[]) {
  await q.setProgramDays(programId, days);
  revalidateAll();
}

export async function renameProgramAction(programId: string, name: string) {
  if (!name.trim()) return;
  await q.renameProgram(programId, name.trim());
  revalidateAll();
}

export async function deleteProgramAction(programId: string) {
  await q.deleteProgram(programId);
  revalidateAll();
}

export async function addExerciseAction(programId: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await q.addExercise(programId, name);
  revalidateAll();
}

export async function renameExerciseAction(exerciseId: string, name: string) {
  if (!name.trim()) return;
  await q.renameExercise(exerciseId, name.trim());
  revalidateAll();
}

export async function deleteExerciseAction(exerciseId: string) {
  await q.deleteExercise(exerciseId);
  revalidateAll();
}

export async function moveExerciseAction(programId: string, exerciseId: string, direction: -1 | 1) {
  await q.moveExercise(programId, exerciseId, direction);
  revalidateAll();
}

// ---------- Sessions & sets ----------

export async function startWorkoutAction(programId: string) {
  const profile = await getActiveProfile();
  const sessionId = await q.startWorkout(profile.id, programId);
  revalidateAll();
  redirect(`/session/${sessionId}`);
}

export async function addSetAction(sessionId: string, exerciseId: string, weight: number, reps: number) {
  const profile = await getActiveProfile();
  const priorSets = await q.getAllSetsForExercise(profile.id, exerciseId);
  const priorMax = priorSets.reduce((max, s) => Math.max(max, s.weight), 0);

  await q.addSet(sessionId, exerciseId, weight, reps);
  revalidateAll();

  const isNewPR = priorSets.length === 0 || weight > priorMax;
  const exercise = await q.getExercise(exerciseId);
  return {
    isNewPR,
    exerciseName: exercise?.name ?? "Rest",
    restSeconds: profile.default_rest_seconds,
  };
}

export async function deleteSetAction(setId: string) {
  const removed = await q.deleteSet(setId);
  revalidateAll();
  return removed;
}

export async function restoreSetAction(set: q.SetRow) {
  await q.restoreSet(set);
  revalidateAll();
}

export async function updateSetAction(setId: string, weight: number, reps: number) {
  await q.updateSet(setId, weight, reps);
  revalidateAll();
}

export async function setDefaultRestSecondsAction(seconds: number) {
  const profile = await getActiveProfile();
  await q.setDefaultRestSeconds(profile.id, seconds);
  revalidateAll();
}

export async function deleteSessionAction(sessionId: string) {
  const removed = await q.deleteSession(sessionId);
  revalidateAll();
  return removed;
}

export async function restoreSessionAction(session: q.SessionRow, sets: q.SetRow[]) {
  await q.restoreSession(session, sets);
  revalidateAll();
}

// ---------- Bodyweight ----------

export async function logBodyweightAction(weightKg: number) {
  const profile = await getActiveProfile();
  const timeZone = await getTimeZone();
  const result = await q.logBodyweight(profile.id, weightKg, timeZone);
  revalidateAll();
  return result;
}

export async function deleteBodyweightAction(id: string) {
  const removed = await q.deleteBodyweightEntry(id);
  revalidateAll();
  return removed;
}

export async function restoreBodyweightAction(row: q.BodyweightRow) {
  await q.restoreBodyweightEntry(row);
  revalidateAll();
}

// ---------- Profiles ----------

export async function createProfileAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const id = uid();
  await dbRun("INSERT INTO profiles (id, name, created_at, default_rest_seconds) VALUES (?, ?, ?, 90)", [
    id,
    name,
    new Date().toISOString(),
  ]);
  await setActiveProfileCookie(id);
  revalidateAll();
}

export async function renameProfileAction(profileId: string, name: string) {
  if (!name.trim()) return;
  await dbRun("UPDATE profiles SET name = ? WHERE id = ?", [name.trim(), profileId]);
  revalidateAll();
}

export async function deleteProfileAction(profileId: string) {
  const profiles = await listProfiles();
  if (profiles.length <= 1) return;

  await dbBatch([
    {
      sql: `DELETE FROM sets WHERE session_id IN (SELECT id FROM sessions WHERE profile_id = ?)`,
      args: [profileId],
    },
    { sql: "DELETE FROM sessions WHERE profile_id = ?", args: [profileId] },
    {
      sql: `DELETE FROM exercises WHERE program_id IN (SELECT id FROM programs WHERE profile_id = ?)`,
      args: [profileId],
    },
    {
      sql: `DELETE FROM program_days WHERE program_id IN (SELECT id FROM programs WHERE profile_id = ?)`,
      args: [profileId],
    },
    { sql: "DELETE FROM programs WHERE profile_id = ?", args: [profileId] },
    { sql: "DELETE FROM bodyweight_logs WHERE profile_id = ?", args: [profileId] },
    { sql: "DELETE FROM profiles WHERE id = ?", args: [profileId] },
  ]);

  const active = await getActiveProfile();
  if (active.id === profileId) {
    const remaining = await listProfiles();
    await setActiveProfileCookie(remaining[0].id);
  }
  revalidateAll();
}

export async function switchProfileAction(profileId: string) {
  await setActiveProfileCookie(profileId);
  revalidateAll();
  redirect("/");
}

// ---------- Backup import ----------

export async function importProfileAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  const name = String(formData.get("name") || "").trim();
  if (!file || !name) return { error: "Missing file or name" };

  let parsed: unknown;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch {
    return { error: "Couldn't read that file — make sure it's an unmodified exported backup." };
  }

  const payload = parsed as {
    data?: { programs?: unknown[]; sessions?: unknown[] };
    programs?: unknown[];
    sessions?: unknown[];
  };
  const importedData = payload && payload.data ? payload.data : payload;

  if (!importedData || !Array.isArray(importedData.programs) || !Array.isArray(importedData.sessions)) {
    return { error: "Not a recognized backup file" };
  }

  type LegacyExercise = { id?: string; name: string };
  type LegacyProgram = { id?: string; name: string; exercises: LegacyExercise[] };
  type LegacySet = { id?: string; exerciseId: string; weight: number; reps: number; createdAt?: string };
  type LegacySession = {
    id?: string;
    programId?: string;
    programName: string;
    createdAt?: string;
    sets: LegacySet[];
  };

  const programs = importedData.programs as LegacyProgram[];
  const sessions = importedData.sessions as LegacySession[];
  const expectedSetCount = sessions.reduce((n, s) => n + (s.sets?.length ?? 0), 0);
  const expectedExerciseCount = programs.reduce((n, p) => n + (p.exercises?.length ?? 0), 0);

  const newProfileId = uid();

  try {
    await dbRun("INSERT INTO profiles (id, name, created_at, default_rest_seconds) VALUES (?, ?, ?, 90)", [
      newProfileId,
      name,
      new Date().toISOString(),
    ]);

    const exerciseIdMap = new Map<string, string>();
    const programIdMap = new Map<string, string>();
    const statements: { sql: string; args: unknown[] }[] = [];

    programs.forEach((p, pi) => {
      const programId = uid();
      if (p.id) programIdMap.set(p.id, programId);
      statements.push({
        sql: "INSERT INTO programs (id, profile_id, name, sort_order) VALUES (?, ?, ?, ?)",
        args: [programId, newProfileId, p.name, pi],
      });
      (p.exercises || []).forEach((ex, ei) => {
        const newExId = uid();
        if (ex.id) exerciseIdMap.set(ex.id, newExId);
        statements.push({
          sql: "INSERT INTO exercises (id, program_id, name, sort_order) VALUES (?, ?, ?, ?)",
          args: [newExId, programId, ex.name, ei],
        });
      });
    });

    sessions.forEach((s) => {
      const sessionId = uid();
      const mappedProgramId = (s.programId && programIdMap.get(s.programId)) || null;
      statements.push({
        sql: "INSERT INTO sessions (id, profile_id, program_id, program_name, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [sessionId, newProfileId, mappedProgramId, s.programName, s.createdAt || new Date().toISOString()],
      });
      (s.sets || []).forEach((set) => {
        const mappedExId = exerciseIdMap.get(set.exerciseId) || set.exerciseId;
        statements.push({
          sql: "INSERT INTO sets (id, session_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          args: [uid(), sessionId, mappedExId, set.weight, set.reps, set.createdAt || new Date().toISOString()],
        });
      });
    });

    if (statements.length) await dbBatch(statements);

    // Verify against the DB rather than trusting the statements-ran-without-
    // throwing assumption -- catches any silent partial application.
    const actualCounts = await Promise.all([
      dbGet<{ c: number }>("SELECT COUNT(*) as c FROM programs WHERE profile_id = ?", [newProfileId]),
      dbGet<{ c: number }>("SELECT COUNT(*) as c FROM sessions WHERE profile_id = ?", [newProfileId]),
      dbGet<{ c: number }>(
        "SELECT COUNT(*) as c FROM sets WHERE session_id IN (SELECT id FROM sessions WHERE profile_id = ?)",
        [newProfileId]
      ),
    ]);
    const [actualPrograms, actualSessions, actualSets] = actualCounts.map((r) => r?.c ?? 0);

    if (actualPrograms !== programs.length || actualSessions !== sessions.length || actualSets !== expectedSetCount) {
      return {
        error: null,
        partial: true,
        summary: `Imported ${actualPrograms}/${programs.length} programs, ${actualSessions}/${sessions.length} workouts, ${actualSets}/${expectedSetCount} sets — some data didn't make it in. Try importing again, or import in a moment if this was a timeout.`,
      };
    }

    await setActiveProfileCookie(newProfileId);
    revalidateAll();
    return {
      error: null,
      partial: false,
      summary: `Imported ${actualPrograms} programs (${expectedExerciseCount} exercises), ${actualSessions} workouts, ${actualSets} sets.`,
    };
  } catch (err) {
    // Clean up the partially-created profile so retrying doesn't pile up
    // broken duplicates.
    await dbBatch([
      { sql: `DELETE FROM sets WHERE session_id IN (SELECT id FROM sessions WHERE profile_id = ?)`, args: [newProfileId] },
      { sql: "DELETE FROM sessions WHERE profile_id = ?", args: [newProfileId] },
      { sql: `DELETE FROM exercises WHERE program_id IN (SELECT id FROM programs WHERE profile_id = ?)`, args: [newProfileId] },
      { sql: `DELETE FROM program_days WHERE program_id IN (SELECT id FROM programs WHERE profile_id = ?)`, args: [newProfileId] },
      { sql: "DELETE FROM programs WHERE profile_id = ?", args: [newProfileId] },
      { sql: "DELETE FROM profiles WHERE id = ?", args: [newProfileId] },
    ]).catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Import failed: ${message}. Nothing was saved — try again.` };
  }
}

// Kept here so the stats page can compute PRs via a server action if ever
// needed client-side; currently used server-side directly via queries + calc.
export async function estimateOneRepMax(weight: number, reps: number) {
  return estOneRM(weight, reps);
}
