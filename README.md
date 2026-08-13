# ATSI Racketeers

Badminton Tournament Manager for organizing Singles and Doubles competitions.

## Stack

- React 19 (JavaScript) + React DOM 19
- Vite 8 (dev server / build)
- Tailwind CSS v4
- Zustand (state management, persisted)
- React Router (routing)
- React Hook Form + Zod (forms / validation)
- React Compiler + ESLint 10 (with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`)

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # lint
npm run preview  # preview production build
```

## Organizer login

A lightweight, static client-side gate protects tournament management. The
shared password lives in `src/lib/auth/staticAuth.js` (override it via
`VITE_ORGANIZER_PASSWORD` in a local `.env` file). This is **not** a real
security boundary — database protection will come from Supabase RLS once the
backend is wired up.

## Features

- Singles and Doubles tournaments
- Round Robin (auto fixtures + standings) and single-elimination Bracket (auto
  seeding, random seeding option, BYEs)
- 15-point and 21-point scoring with win-by-2 rules and caps (17-15 / 30-29)
- Score recording, editing, and re-opening matches
- Dashboard, Standings, and interactive Bracket views
- Responsive desktop / tablet / mobile layout

## Backend (not yet configured)

Supabase (PostgreSQL + RLS) and Vercel hosting are planned but intentionally
not wired up yet. Provide the credentials listed in `.env.example` before
backend integration begins — the build currently runs entirely on local state.
