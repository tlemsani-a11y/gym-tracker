import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// In production this points at a Turso database (TURSO_DATABASE_URL /
// TURSO_AUTH_TOKEN, set as Vercel environment variables). Locally, with
// no Turso env vars set, it falls back to an embedded SQLite file on
// disk -- same engine, same API, zero setup for `npm run dev`.
function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url) {
    return createClient({ url, authToken });
  }
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return createClient({ url: "file:./data/gym.db" });
}

declare global {
  var __gymDb: Client | undefined;
  var __gymSchemaReady: Promise<void> | undefined;
}

export const db = global.__gymDb ?? createDbClient();
if (process.env.NODE_ENV !== "production") global.__gymDb = db;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    default_rest_seconds INTEGER NOT NULL DEFAULT 90
  );

  CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    program_id TEXT,
    program_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bodyweight_logs (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL
  );

  -- day_of_week: 0=Monday .. 6=Sunday, matching the rest of the app's
  -- Monday-start week convention (week strip, calendar grid).
  CREATE TABLE IF NOT EXISTS program_days (
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    PRIMARY KEY (program_id, day_of_week)
  );

  CREATE INDEX IF NOT EXISTS idx_programs_profile ON programs(profile_id);
  CREATE INDEX IF NOT EXISTS idx_exercises_program ON exercises(program_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id);
  CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);
  CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_bw_profile ON bodyweight_logs(profile_id);
  CREATE INDEX IF NOT EXISTS idx_program_days_day ON program_days(day_of_week);
`;

/** Ensures the schema exists. Cheap to call repeatedly -- the actual
 *  work only ever runs once per server instance (memoized promise). */
export function ready(): Promise<void> {
  if (!global.__gymSchemaReady) {
    global.__gymSchemaReady = db.executeMultiple(SCHEMA_SQL);
  }
  return global.__gymSchemaReady;
}

function seedProfile(profileId: string) {
  const seedPrograms = [
    { name: "Push", exercises: ["Bench Press", "Incline Press", "Shoulder Press", "Tricep Pushdown"] },
    { name: "Pull", exercises: ["Deadlift", "Pull-Ups", "Barbell Row", "Bicep Curl"] },
    { name: "Legs", exercises: ["Squat", "Leg Press", "Leg Curl", "Calf Raise"] },
  ];
  const statements: { sql: string; args: unknown[] }[] = [];
  seedPrograms.forEach((p, pi) => {
    const programId = randomUUID();
    statements.push({
      sql: "INSERT INTO programs (id, profile_id, name, sort_order) VALUES (?, ?, ?, ?)",
      args: [programId, profileId, p.name, pi],
    });
    p.exercises.forEach((exName, ei) => {
      statements.push({
        sql: "INSERT INTO exercises (id, program_id, name, sort_order) VALUES (?, ?, ?, ?)",
        args: [randomUUID(), programId, exName, ei],
      });
    });
  });
  return db.batch(statements.map((s) => ({ sql: s.sql, args: s.args as never })));
}

export async function ensureAtLeastOneProfile(): Promise<string> {
  await ready();
  const countRes = await db.execute("SELECT COUNT(*) as c FROM profiles");
  const count = countRes.rows[0].c as number;
  if (count === 0) {
    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO profiles (id, name, created_at, default_rest_seconds) VALUES (?, ?, ?, 90)",
      args: [id, "You", new Date().toISOString()],
    });
    await seedProfile(id);
    return id;
  }
  const res = await db.execute("SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1");
  return res.rows[0].id as string;
}

export function uid() {
  return randomUUID();
}

export async function dbAll<T>(sql: string, args: unknown[] = []): Promise<T[]> {
  await ready();
  const res = await db.execute({ sql, args: args as never });
  return res.rows as unknown as T[];
}

export async function dbGet<T>(sql: string, args: unknown[] = []): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, args);
  return rows[0];
}

export async function dbRun(sql: string, args: unknown[] = []): Promise<void> {
  await ready();
  await db.execute({ sql, args: args as never });
}

export async function dbBatch(statements: { sql: string; args?: unknown[] }[]): Promise<void> {
  await ready();
  await db.batch(statements.map((s) => ({ sql: s.sql, args: (s.args ?? []) as never })));
}
