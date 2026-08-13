// Static, client-side organizer gate.
// NOTE: This is NOT a security boundary — it only prevents casual access to
// the management UI. The password is readable in the bundled JS. Real data
// protection should come from Supabase RLS when the backend is wired up.
//
// Keep the literal in this single file only; do not scatter it across
// components. If preferred, the value may be moved to `VITE_ORGANIZER_PASSWORD`
// in a local .env file (see PRD "Environment & Credentials Setup").

export const ORGANIZER_PASSWORD =
  import.meta.env.VITE_ORGANIZER_PASSWORD ?? "Hanabishi1234!";
