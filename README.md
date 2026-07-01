# Focus List

A personal daily task planning app with time estimates and a focus timer.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Postgres + magic link auth)
- `@dnd-kit` for drag-and-drop reordering

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL migration in `supabase/migrations/001_create_tasks.sql` via the Supabase SQL Editor
3. Enable Email auth (magic link) in Authentication → Providers → Email
4. Add your site URL to Authentication → URL Configuration (e.g. `http://localhost:5173` for local dev)

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables
4. Deploy — Vercel auto-detects Vite and builds with zero config

Add your Vercel production URL to Supabase Auth redirect URLs.

## Features (Step 1)

- **Today view**: focus timer, task queue, drag-and-drop reorder, quick-add, gap finder, run-over nudge
- **This week / Backlog**: sidebar nav with placeholder screens
- **Auth**: magic link email sign-in
- **Timer**: persists across page refresh via localStorage; syncs `actual_minutes` to Supabase every 30s while running

## Project structure

```
src/
  components/   # UI components
  hooks/        # useAuth, useTasks, useTimer
  lib/          # Supabase client
  types.ts      # Shared types and helpers
```
