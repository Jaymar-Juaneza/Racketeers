import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { useAuthStore } from "../store/authStore.js";
import {
  displayName,
  newParticipantEntry,
  validateEntries,
} from "../lib/participants.js";
import { Button } from "../components/ui/button.jsx";
import { ParticipantEditor } from "../components/ParticipantEditor.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.jsx";

export default function ParticipantsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));
  const addParticipants = useTournamentStore((s) => s.addParticipants);
  const removeParticipant = useTournamentStore((s) => s.removeParticipant);
  const generateMatches = useTournamentStore((s) => s.generateMatches);
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");

  const isDoubles = tournament?.category === "doubles";
  const category = tournament?.category ?? "singles";
  const [entries, setEntries] = useState(() => [newParticipantEntry(category)]);
  const [formErrors, setFormErrors] = useState([]);
  const [entriesCategory, setEntriesCategory] = useState(category);

  // Reset the draft when the category changes (e.g. after the tournament
  // finishes loading on a fresh page load).
  if (entriesCategory !== category) {
    setEntriesCategory(category);
    setEntries([newParticipantEntry(category)]);
    setFormErrors([]);
  }

  const parsed = useMemo(
    () => validateEntries(entries, category),
    [entries, category],
  );

  if (!tournament) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-semibold text-ink">Tournament not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            Back to home
          </Button>
        </CardContent>
      </Card>
    );
  }

  const count = tournament.participants.length;
  const hasMatches = tournament.matches.length > 0;

  const handleAdd = (e) => {
    e.preventDefault();
    if (parsed.errors.length > 0) {
      setFormErrors(parsed.errors);
      return;
    }
    if (parsed.participants.length === 0) {
      setFormErrors(["Add at least one entry first."]);
      return;
    }
    setFormErrors([]);
    addParticipants(tournament.id, parsed.participants);
    setEntries([newParticipantEntry(category)]);
  };

  const handleGenerate = () => {
    if (count < 2) return;
    generateMatches(tournament.id);
    navigate(`/tournament/${tournament.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={`/tournament/${tournament.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Tournament
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {tournament.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? hasMatches
              ? `Manage the ${isDoubles ? "teams" : "players"} in this tournament.`
              : `Add ${isDoubles ? "pairs" : "players"} — minimum 2 required to generate fixtures.`
            : `View the ${isDoubles ? "teams" : "players"} in this tournament.`}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Bulk add */}
        {isAdmin && (
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add {isDoubles ? "pairs" : "players"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <ParticipantEditor
                category={category}
                entries={entries}
                onChange={(next) => {
                  setEntries(next);
                  setFormErrors([]);
                }}
              />

              {formErrors.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-md border border-accent/30 bg-red-50 p-3 text-sm text-accent">
                  {formErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}

              {hasMatches && (
                <p className="rounded-md bg-mist/70 p-3 text-xs text-muted">
                  Matches are already generated — new entries won't be added to
                  the existing schedule.
                </p>
              )}

              <Button
                type="submit"
                variant="secondary"
                className="w-full sm:w-auto sm:self-end"
              >
                <Plus className="h-4 w-4" />
                Add {isDoubles ? "pairs" : "players"}
              </Button>
            </form>
          </CardContent>
          </Card>
        )}

        {/* Participant list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isDoubles ? (
                <Users className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
              {isDoubles ? "Teams" : "Players"} ({count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {count === 0 ? (
              <p className="rounded-md bg-mist/50 px-4 py-8 text-center text-sm text-muted">
                No {isDoubles ? "teams" : "players"} yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {tournament.participants.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {displayName(p)}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(tournament.id, p.id)}
                        className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-accent"
                        aria-label={`Remove ${displayName(p)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Generate — only for tournaments that don't have fixtures yet */}
        {isAdmin && !hasMatches && (
          <Card className="border-primary/20 bg-mist/40">
            <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted">
                {count < 2 ? (
                  <span>
                    Add at least{" "}
                    <strong className="text-ink">2 {isDoubles ? "pairs" : "players"}</strong>{" "}
                    to generate fixtures.
                  </span>
                ) : (
                  <span>
                    {tournament.format === "bracket"
                      ? "Ready — the bracket will be generated."
                      : "Ready to generate the round-robin schedule."}
                  </span>
                )}
              </div>
              <Button
                size="lg"
                disabled={count < 2}
                onClick={handleGenerate}
                className="shrink-0"
              >
                Generate matches
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
