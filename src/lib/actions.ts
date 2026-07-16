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

export async function deleteProgramsAction(programIds: string[]) {
  await q.deletePrograms(programIds);
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

export async function deleteSessionsAction(sessionIds: string[]) {
  const removed = await q.deleteSessions(sessionIds);
  revalidateAll();
  return removed;
}

export async function restoreSessionAction(session: q.SessionRow, sets: q.SetRow[]) {
  await q.restoreSession(session, sets);
  revalidateAll();
}

export async function restoreSessionsAction(sessions: q.SessionRow[], sets: q.SetRow[]) {
  await q.restoreSessions(sessions, sets);
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

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function parseBackupFile(parsed: unknown): { programs: LegacyProgram[]; sessions: LegacySession[] } | { error: string } {
  const payload = parsed as {
    data?: { programs?: unknown[]; sessions?: unknown[] };
    programs?: unknown[];
    sessions?: unknown[];
  };
  const importedData = payload && payload.data ? payload.data : payload;
  if (!importedData || !Array.isArray(importedData.programs) || !Array.isArray(importedData.sessions)) {
    return { error: "Not a recognized backup file" };
  }
  return { programs: importedData.programs as LegacyProgram[], sessions: importedData.sessions as LegacySession[] };
}

/** Imports a parsed backup into `profileId`, merging by name/timestamp
 *  rather than blindly inserting -- safe to call on an empty, brand-new
 *  profile (everything will be "new") or repeatedly against the same
 *  profile (matching programs/exercises get reused, already-imported
 *  workouts get skipped instead of duplicated). */
async function importBackupIntoProfile(profileId: string, parsed: unknown) {
  const result = parseBackupFile(parsed);
  if ("error" in result) return { error: result.error };
  const { programs, sessions } = result;

  try {
    const [existingPrograms, existingExercises, existingSessions] = await Promise.all([
      q.getPrograms(profileId),
      q.getAllExercisesForProfile(profileId),
      q.getSessions(profileId),
    ]);

    const programByName = new Map<string, string>();
    existingPrograms.forEach((p) => programByName.set(normalizeName(p.name), p.id));
    let nextProgramOrder = existingPrograms.reduce((max, p) => Math.max(max, p.sort_order + 1), 0);

    const exerciseByKey = new Map<string, string>(); // `${programId}::${name}` -> id
    const nextExerciseOrder = new Map<string, number>(); // programId -> next sort_order
    existingExercises.forEach((ex) => {
      exerciseByKey.set(`${ex.program_id}::${normalizeName(ex.name)}`, ex.id);
      nextExerciseOrder.set(ex.program_id, Math.max(nextExerciseOrder.get(ex.program_id) ?? 0, ex.sort_order + 1));
    });

    const sessionDedup = new Set(existingSessions.map((s) => `${s.program_name}::${s.created_at}`));

    const statements: { sql: string; args: unknown[] }[] = [];
    const programIdMap = new Map<string, string>(); // legacy id -> resolved id
    const exerciseIdMap = new Map<string, string>(); // legacy id -> resolved id
    let newPrograms = 0;
    let newExercises = 0;

    programs.forEach((p) => {
      const key = normalizeName(p.name);
      let programId = programByName.get(key);
      if (!programId) {
        programId = uid();
        programByName.set(key, programId);
        statements.push({ sql: "INSERT INTO programs (id, profile_id, name, sort_order) VALUES (?, ?, ?, ?)", args: [programId, profileId, p.name, nextProgramOrder++] });
        newPrograms++;
      }
      if (p.id) programIdMap.set(p.id, programId);

      (p.exercises || []).forEach((ex) => {
        const exKey = `${programId}::${normalizeName(ex.name)}`;
        let exId = exerciseByKey.get(exKey);
        if (!exId) {
          exId = uid();
          exerciseByKey.set(exKey, exId);
          const order = nextExerciseOrder.get(programId!) ?? 0;
          nextExerciseOrder.set(programId!, order + 1);
          statements.push({ sql: "INSERT INTO exercises (id, program_id, name, sort_order) VALUES (?, ?, ?, ?)", args: [exId, programId, ex.name, order] });
          newExercises++;
        }
        if (ex.id) exerciseIdMap.set(ex.id, exId);
      });
    });

    let newSessions = 0;
    let skippedSessions = 0;
    let newSets = 0;

    sessions.forEach((s) => {
      const createdAt = s.createdAt || new Date().toISOString();
      const dedupKey = `${s.programName}::${createdAt}`;
      if (sessionDedup.has(dedupKey)) {
        skippedSessions++;
        return;
      }
      sessionDedup.add(dedupKey);
      const sessionId = uid();
      const mappedProgramId = (s.programId && programIdMap.get(s.programId)) || null;
      statements.push({
        sql: "INSERT INTO sessions (id, profile_id, program_id, program_name, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [sessionId, profileId, mappedProgramId, s.programName, createdAt],
      });
      newSessions++;
      (s.sets || []).forEach((set) => {
        const mappedExId = exerciseIdMap.get(set.exerciseId) || set.exerciseId;
        statements.push({
          sql: "INSERT INTO sets (id, session_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          args: [uid(), sessionId, mappedExId, set.weight, set.reps, set.createdAt || createdAt],
        });
        newSets++;
      });
    });

    if (statements.length) await dbBatch(statements);

    // Verify against the DB rather than trusting the statements-ran-without-
    // throwing assumption -- catches any silent partial application.
    const [afterPrograms, afterSessions, afterSets] = await Promise.all([
      dbGet<{ c: number }>("SELECT COUNT(*) as c FROM programs WHERE profile_id = ?", [profileId]),
      dbGet<{ c: number }>("SELECT COUNT(*) as c FROM sessions WHERE profile_id = ?", [profileId]),
      dbGet<{ c: number }>("SELECT COUNT(*) as c FROM sets WHERE session_id IN (SELECT id FROM sessions WHERE profile_id = ?)", [profileId]),
    ]);
    const expectedPrograms = existingPrograms.length + newPrograms;
    const expectedSessions = existingSessions.length + newSessions;
    const actualPrograms = afterPrograms?.c ?? 0;
    const actualSessions = afterSessions?.c ?? 0;

    if (actualPrograms !== expectedPrograms || actualSessions !== expectedSessions) {
      return {
        error: null,
        partial: true,
        summary: `Only partly imported: expected ${expectedPrograms} programs / ${expectedSessions} workouts total, got ${actualPrograms}/${actualSessions}. Try importing again.`,
      };
    }

    revalidateAll();
    const skippedNote = skippedSessions ? ` (${skippedSessions} workout${skippedSessions === 1 ? "" : "s"} already there, skipped)` : "";
    return {
      error: null,
      partial: false,
      summary: `+${newPrograms} program${newPrograms === 1 ? "" : "s"}, +${newExercises} exercise${newExercises === 1 ? "" : "s"}, +${newSessions} workout${newSessions === 1 ? "" : "s"}, +${newSets} set${newSets === 1 ? "" : "s"}${skippedNote}. Total now: ${actualPrograms} programs, ${actualSessions} workouts, ${afterSets?.c ?? 0} sets.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Import failed: ${message}. Try again.` };
  }
}

export async function importProfileAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  const name = String(formData.get("name") || "").trim();
  if (!file || !name) return { error: "Missing file or name" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { error: "Couldn't read that file — make sure it's an unmodified exported backup." };
  }

  const newProfileId = uid();
  await dbRun("INSERT INTO profiles (id, name, created_at, default_rest_seconds) VALUES (?, ?, ?, 90)", [
    newProfileId,
    name,
    new Date().toISOString(),
  ]);

  const result = await importBackupIntoProfile(newProfileId, parsed);
  if (result.error) {
    // Creating the profile succeeded but the import didn't -- clean up
    // rather than leaving an empty orphaned profile behind.
    await dbRun("DELETE FROM profiles WHERE id = ?", [newProfileId]).catch(() => {});
    return result;
  }

  await setActiveProfileCookie(newProfileId);
  revalidateAll();
  return result;
}

export async function mergeImportAction(targetProfileId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Missing file" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { error: "Couldn't read that file — make sure it's an unmodified exported backup." };
  }

  const result = await importBackupIntoProfile(targetProfileId, parsed);
  if (!result.error) {
    await setActiveProfileCookie(targetProfileId);
    revalidateAll();
  }
  return result;
}

// Kept here so the stats page can compute PRs via a server action if ever
// needed client-side; currently used server-side directly via queries + calc.
export async function estimateOneRepMax(weight: number, reps: number) {
  return estOneRM(weight, reps);
}
