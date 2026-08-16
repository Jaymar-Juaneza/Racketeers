# ATSI Racketeers

Badminton Tournament Manager for organizing Singles and Doubles competitions.

## Stack

- React 19 (JavaScript) + React DOM 19
- Vite 8 (dev server / build)
- Tailwind CSS v4
- Zustand (state management, persisted to localStorage)
- React Router (routing)
- React Hook Form + Zod (forms / validation)
- React Compiler + ESLint 10 (with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`)
- Firebase (Authentication for the admin + Cloud Firestore for live state & history)

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # lint
npm run preview  # preview production build
```

## How it works

- The website opens **directly on the public dashboard** — no account needed.
- Spectators can browse tournaments, live scores, standings and brackets from
  any device.
- A separate **"Login as admin"** button lets an organizer sign in to create
  tournaments, manage participants and record scores.
- **Live tournament state** is published to Firestore (`tournaments`
  collection) so it can be viewed live across devices.
- **Firestore also keeps a permanent, append-only history** of every finished
  game in the `game_logs` collection.

## Accounts & roles

- Only an **admin** signs in (Firebase Auth email/password, username-based).
- Any other account is treated as a viewer and is **rejected at login**.

### Creating the admin account

Registration was removed from the app, so create the admin once in the Firebase
console:

1. Open the [Firebase console](https://console.firebase.google.com) and select
   the `rocketeers-5ad3d` project.
2. Go to **Build → Authentication → Sign-in method** and make sure
   **Email/Password** is enabled.
3. Go to **Authentication → Users → Add user**:
   - Email: `admin@rocketeers.app`
   - Password: `Hanabishi1234!` (or your own)
4. Copy the **User UID** shown for the new user.
5. Go to **Firestore Database → Start collection** and create a collection
   named `users` with a document whose **Document ID = the User UID**, and these
   fields:
   - `uid` (string) → the User UID
   - `username` (string) → `admin`
   - `role` (string) → `admin`
6. Publish the rules in `firestore.rules` (see below).

You can now sign in with username `admin` and the password you set.

> If an admin account was created before this refactor (via the old registration
> flow), it already exists — just confirm its `users` document has
> `role: "admin"`.

## Features

- Singles and Doubles tournaments
- Round Robin (auto fixtures + standings) and single-elimination Bracket (auto
  seeding, random seeding option, byes only when a round has an odd number of
  teams)
- Best-of series for brackets: Best of 3 (first to 2 wins) for regular rounds
  and Best of 5 (first to 3 wins) for the Final — winning games in a row closes
  the series early
- 21-point scoring with BWF-style rules: win by 2, capped at 30 (next point
  wins after 29-29) · 15-point scoring with win-by-2 rules and no cap
- Score recording with **− / + steppers**, editing, and re-opening matches
- Dashboard, Standings, and interactive Bracket views
- Responsive desktop / tablet / mobile layout

## Firebase setup

Three collections are used:

- `users` — one doc per account (`uid`, `username`, `role`)
- `tournaments` — the live tournament state (readable by everyone, writable by
  admins)
- `game_logs` — permanent append-only history of finished games

1. In the Firebase console, enable **Authentication → Email/Password**.
2. Create a **Cloud Firestore** database.
3. Paste the contents of `firestore.rules` into **Firestore Database → Rules**
   and publish.
4. Create the admin user as described above.

The web config is already embedded in `src/lib/firebase.js` for the
`rocketeers-5ad3d` project (override it with `VITE_FIREBASE_*` in a local
`.env` if needed).
