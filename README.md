# Gym Tracker (Next.js)

A full-stack rebuild of the single-file HTML gym tracker, now running on **Next.js 16 (App Router) + TypeScript + SQLite**, redesigned with an enterprise-SaaS visual language (Linear/Stripe/Notion-style): neutral dark surfaces, a single indigo accent, hairline borders, tight radii, monospace numerics, and a persistent sidebar on desktop that collapses to a bottom tab bar on mobile.

## What changed vs. the original single-file app

| | Original | This version |
|---|---|---|
| Storage | `localStorage` (per-profile keys) | SQLite — Turso (hosted libSQL) in production, an embedded local file in dev — via `@libsql/client` |
| Logic | One 2,200-line `<script>` | Server Components + Server Actions, split into `lib/queries.ts` (data access), `lib/actions.ts` (mutations), `lib/calc.ts` (pure math) |
| Rendering | Manual `innerHTML` re-renders | React Server Components, re-fetched on navigation/`router.refresh()` |
| Rest timer / toasts | Global functions | React Context (`AppProviders.tsx`), same Web Audio API beep/chime logic |
| Visual design | Dark "steel" gym-tech theme, colored glowing plate accents, Manrope | Neutral enterprise-SaaS theme, single indigo accent, Inter for UI text, JetBrains Mono for data |
| Navigation | Bottom tab bar only | Persistent left sidebar on desktop (≥900px), bottom tab bar on mobile |
| Fonts | Base64-embedded in CSS (~113KB) | Inter self-hosted via `@fontsource-variable/inter`; JetBrains Mono via `next/font/local` |
| Profiles | `localStorage` namespacing | SQLite rows + an httpOnly cookie for "which profile is active" |

Feature-for-feature it's the same app: programs & exercises, workout sessions, rest timer with audio/vibration, PR tracking (heaviest set + estimated 1RM), history (list + calendar), stats charts, plate calculator, bodyweight log, and JSON backup export/import.

**No login system** — per your choice, this stays a single-user app with no passwords. Profiles are still supported as simple named partitions (handy if more than one person shares the same install), matching how the original worked.

## Deploy for free (Vercel + Turso)

Vercel's serverless functions have a read-only, ephemeral filesystem, so the local SQLite file approach only works for local dev. In production this app talks to **Turso** instead — a hosted, SQLite-compatible database with a genuinely free tier (500 databases, 9GB total storage, 1B monthly row reads, no credit card required). Same SQL, same client library (`@libsql/client`), no other code changes.

### 1. Create a free Turso database

The Turso CLI's official installer needs WSL on Windows, so on Windows the simplest path is the **web dashboard** — no terminal tool to install at all:

- Go to [app.turso.tech](https://app.turso.tech) and sign up (GitHub login works)
- Click **Create Database**, name it `gym-tracker`, pick the region closest to you
- Once it's created, open it and go to the **Connect** tab — you'll see:
  - a **URL** starting with `libsql://...` → this is `TURSO_DATABASE_URL`
  - a button to **create a token** → this is `TURSO_AUTH_TOKEN`

(On macOS/Linux, or if you have WSL installed, you can use the CLI instead: `curl -sSfL https://get.tur.so/install.sh | bash`, then `turso auth login`, `turso db create gym-tracker`, `turso db show gym-tracker --url`, `turso db tokens create gym-tracker`.)

### 2. Push the code to GitHub

Unzip the project folder first, then in PowerShell or a terminal inside that folder:

```powershell
git init
git add .
git commit -m "Gym tracker"
```

Then create a new repository at [github.com/new](https://github.com/new) (don't initialize it with a README), and push to it:

```powershell
git remote add origin https://github.com/<your-username>/gym-tracker.git
git branch -M main
git push -u origin main
```

(Requires [Git for Windows](https://git-scm.com/download/win) installed — if `git` isn't recognized, that's the one thing to install first.)

### 3. Deploy on Vercel

- Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub (free), and import the repo.
- Framework preset auto-detects Next.js — no changes needed.
- Under **Environment Variables**, add:
  - `TURSO_DATABASE_URL` → the URL from step 1
  - `TURSO_AUTH_TOKEN` → the token from step 1
- Click **Deploy**. First deploy takes ~1–2 minutes; the schema and starter Push/Pull/Legs programs are created automatically on first request.

That's it — you get a free `*.vercel.app` URL, HTTPS, and automatic redeploys on every push, at $0/month for personal use on both Vercel's and Turso's free tiers.

### Local development

Local dev is unaffected — leave `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` unset (don't add them to `.env.local`) and the app uses the embedded SQLite file at `data/gym.db`, same as before.

## Package as an Android app (APK)

The app is now a real installable PWA (manifest, icons, service worker), which means you can wrap it into an Android APK for free using **PWABuilder** — no Android Studio, no local build tools.

1. Deploy the app first (see above) so you have a live `https://...vercel.app` URL — PWABuilder needs a real, publicly reachable HTTPS site to analyze.
2. Go to [pwabuilder.com](https://www.pwabuilder.com), paste your Vercel URL, and click **Start**.
3. It'll show a report card for manifest / service worker / icons — all three should already be green from what's set up here.
4. Click **Package for stores** → **Android** → download the package. You'll get a signed, installable `.apk` (and an `.aab` if you ever want to publish it).
5. Copy the `.apk` to your phone (email, cloud drive, USB) and open it. Android will ask you to allow installs from that source the first time — that's expected for a sideloaded app, not a sign anything's wrong.

This gives you a real app icon and a standalone window (no browser address bar) on your phone, completely free. Publishing it on the **Google Play Store** is a separate, optional step that costs a one-time $25 registration fee — not required for just installing it on your own device.

## Getting started (local)

```bash
npm install
npm run dev
```

Open http://localhost:3000. A SQLite database is created automatically at `data/gym.db` on first run, seeded with the same starter Push/Pull/Legs programs as the original app.

To run a production build:

```bash
npm run build
npm run start
```

## Project structure

```
src/
  app/                     routes (App Router)
    page.tsx               dashboard
    programs/               programs list + [id] detail
    session/[id]/           workout logging page
    history/                list/calendar (driven by URL search params)
    stats/                  PRs, charts, bodyweight
    plates/                 plate calculator (client-only, no DB)
    profiles/               profile switch/rename/delete/export/import
    api/export/              GET backup JSON download
  components/               shared client components (sidebar, tab bar,
                             rest timer, toasts, CRUD forms, charts,
                             plate calculator)
  lib/
    db.ts                   libSQL client (Turso in prod, local file in dev) + schema + seed data
    queries.ts               all SELECT/INSERT/UPDATE/DELETE helpers
    actions.ts               "use server" mutations called from forms/buttons
    calc.ts                  pure functions (1RM, plate math, calendar grid)
    profile-session.ts       active-profile cookie helper
  fonts/                    JetBrains Mono files from the original app,
                             loaded via next/font/local (Inter comes from
                             the @fontsource-variable/inter npm package)
```

## Design system

Tokens live at the top of `src/app/globals.css`: a neutral dark surface stack (`--bg` / `--surface` / `--surface-2` / `--surface-3`), hairline borders (`--border` / `--border-strong`), a three-tier text scale, and a single indigo accent (`--accent`) plus muted success/danger/warning colors used sparingly for state (PRs, deletions, streaks). Layout is a persistent sidebar (`Sidebar.tsx`) on screens ≥900px and a bottom tab bar (`TabBar.tsx`) below that — both read from the same nav config in `nav-items.tsx`.

## Performance

Every page fetches all its data in a small, fixed number of bulk (joined) queries — see `getAllExercisesForProfile` / `getAllSetsForProfile` in `lib/queries.ts` — instead of one query per program/exercise/session, which is what actually matters when the database is a network call away (Turso), not a local file. Every route also has a `loading.tsx`, so navigating shows an instant skeleton via React Suspense while data streams in, rather than a frozen screen.

`vercel.json` pins the serverless function to `cdg1` (Paris) instead of Vercel's US-East default, since round-trip time to wherever your Turso database lives matters more than almost anything else here. If requests still feel slow after deploying, check your Turso database's actual region (`turso db show gym-tracker`, or the **Connect** tab on [app.turso.tech](https://app.turso.tech)) — if it's not in Europe, moving the `regions` value in `vercel.json` to match it (or creating a new Turso database in a closer region) will help more than any code change. Some latency on Vercel's Hobby tier is unavoidable regardless — serverless functions "cold start" after sitting idle, and the first request after a gap is always slower.

## Notes

- Locally, data lives at `data/gym.db` (a plain file — back it up however you like). In production it lives in Turso; `turso db shell gym-tracker` gives you a SQL prompt against it, and `turso db dump gym-tracker` exports a full snapshot. Either way, the in-app **Export backup** button (Profiles page) also gives you a portable JSON copy any time.
- Deleting a profile deletes everything in it (programs, sessions, bodyweight logs) — there's a confirmation dialog, but there's no undo for that one.
- If you ever want real multi-user login instead of the simple no-password profiles, that would mean adding an auth layer (e.g. NextAuth) on top of the existing `profile_id` scoping — the data model is already set up to support it.
