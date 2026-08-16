import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Repeat,
  Shuffle,
  Sparkles,
  Swords,
  User,
  Users,
} from "lucide-react";
import { useTournamentStore } from "../store/tournamentStore.js";
import { useAuthStore } from "../store/authStore.js";
import { newParticipantEntry, validateEntries } from "../lib/participants.js";
import { shuffle, SUPPORTED_BRACKET_SIZES } from "../lib/tournament/bracket.js";
import { Dialog } from "../components/ui/dialog.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Button } from "../components/ui/button.jsx";
import { Label } from "../components/ui/label.jsx";
import { Select } from "../components/ui/select.jsx";
import { ParticipantEditor } from "../components/ParticipantEditor.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { cn } from "../lib/utils.js";

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const createTournament = useTournamentStore((s) => s.createTournament);
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");

  const [category, setCategory] = useState("singles");
  const [format, setFormat] = useState("round-robin");
  const [pointSystem, setPointSystem] = useState(21);
  const [entries, setEntries] = useState(() => [
    newParticipantEntry("singles"),
    newParticipantEntry("singles"),
  ]);
  const [randomizerOpen, setRandomizerOpen] = useState(false);
  const [randomizerNames, setRandomizerNames] = useState("");
  const [randomizerTeams, setRandomizerTeams] = useState([]);
  const [randomizerError, setRandomizerError] = useState("");

  const isDoubles = category === "doubles";
  const parsed = useMemo(
    () => validateEntries(entries, category),
    [entries, category],
  );

  const maxBracket = SUPPORTED_BRACKET_SIZES[SUPPORTED_BRACKET_SIZES.length - 1];
  const overBracket =
    format === "bracket" && parsed.participants.length > maxBracket;
  const ready =
    parsed.participants.length >= 2 && parsed.errors.length === 0 && !overBracket;

  const switchCategory = (next) => {
    setCategory(next);
    setEntries([
      newParticipantEntry(next),
      newParticipantEntry(next),
    ]);
    setRandomizerOpen(false);
    setRandomizerNames("");
    setRandomizerTeams([]);
    setRandomizerError("");
  };

  const runRandomizer = () => {
    const names = String(randomizerNames)
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length < 4) {
      setRandomizerError("Enter at least 4 player names to create at least 2 teams.");
      setRandomizerTeams([]);
      return;
    }
    if (names.length % 2 !== 0) {
      setRandomizerError("Enter an even number of players so everyone can be paired.");
      setRandomizerTeams([]);
      return;
    }
    if (new Set(names).size !== names.length) {
      setRandomizerError("Player names must be unique.");
      setRandomizerTeams([]);
      return;
    }

    const shuffled = shuffle(names);
    const teams = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      teams.push({ player1: shuffled[i], player2: shuffled[i + 1] });
    }

    setRandomizerError("");
    setRandomizerTeams(teams);
  };

  const acceptRandomizer = () => {
    if (randomizerTeams.length === 0) return;
    setEntries(randomizerTeams.map((team) => ({ ...team })));
    setRandomizerOpen(false);
    setRandomizerNames("");
    setRandomizerTeams([]);
    setRandomizerError("");
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!ready) return;
    const id = createTournament({
      category,
      format,
      pointSystem,
      seeding: "auto",
      participants: parsed.participants,
    });
    navigate(`/tournament/${id}`);
  };

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        All tournaments
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          New Tournament
        </h1>
        <p className="mt-1 text-sm text-muted">
          Enter each player or team below and the matchmaking is generated
          automatically.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card className="animate-rise">
          <CardHeader>
            <CardTitle>Matchmaking details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* Category */}
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md bg-mist p-1">
                <button
                  type="button"
                  onClick={() => switchCategory("singles")}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-colors",
                    !isDoubles
                      ? "bg-white text-primary shadow-panel"
                      : "text-muted hover:text-primary",
                  )}
                >
                  <User className="h-4 w-4" />
                  Singles
                </button>
                <button
                  type="button"
                  onClick={() => switchCategory("doubles")}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-colors",
                    isDoubles
                      ? "bg-white text-primary shadow-panel"
                      : "text-muted hover:text-primary",
                  )}
                >
                  <Users className="h-4 w-4" />
                  Doubles
                </button>
              </div>
            </div>

            {/* Format + points */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="format">Format</Label>
                <Select
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <option value="round-robin">Round Robin</option>
                  <option value="bracket">Tournament Bracket</option>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pointSystem">Point system</Label>
                <Select
                  id="pointSystem"
                  value={pointSystem}
                  onChange={(e) => setPointSystem(Number(e.target.value))}
                >
                  <option value={15}>15 points</option>
                  <option value={21}>21 points</option>
                </Select>
              </div>
            </div>

            {format === "bracket" && (
              <div className="flex items-start gap-3 rounded-md bg-mist/70 p-3 text-sm text-muted">
                <Swords className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-ink">Single elimination:</strong>{" "}
                  best of 3 series · Final is best of 5. Byes are only added
                  when a round has an odd number of teams.
                </span>
              </div>
            )}
            {format === "round-robin" && (
              <div className="flex items-start gap-3 rounded-md bg-mist/70 p-3 text-sm text-muted">
                <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-ink">Round robin:</strong> everyone
                  plays everyone once. An odd count gets one bye match each
                  round.
                </span>
              </div>
            )}

            {/* Participants — separate input per name */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>{isDoubles ? "Teams" : "Players"}</Label>
                {isDoubles && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRandomizerError("");
                      setRandomizerTeams([]);
                      setRandomizerNames("");
                      setRandomizerOpen(true);
                    }}
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Randomize teams
                  </Button>
                )}
              </div>
              <ParticipantEditor
                category={category}
                entries={entries}
                onChange={setEntries}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted">
                  {isDoubles
                    ? "Each team needs two player names."
                    : "One player name per box."}
                </span>
                <span
                  className={cn(
                    "font-mono font-medium",
                    parsed.participants.length >= 2
                      ? "text-primary"
                      : "text-muted",
                  )}
                >
                  {parsed.participants.length}{" "}
                  {isDoubles ? "team" : "player"}
                  {parsed.participants.length === 1 ? "" : "s"} ready
                </span>
              </div>

              {parsed.errors.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-md border border-accent/30 bg-red-50 p-3 text-sm text-accent">
                  {parsed.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={!ready} className="w-full">
          <Sparkles className="h-5 w-5" />
          Generate matchmaking
        </Button>
        {!ready && (
          <p className="-mt-3 text-center text-xs text-muted">
            {overBracket
              ? `Brackets support up to ${maxBracket} entries.`
              : `Add at least 2 ${isDoubles ? "teams" : "players"} to generate the matchmaking.`}
          </p>
        )}
      </form>

      <Dialog
        open={randomizerOpen}
        onClose={() => setRandomizerOpen(false)}
        title="Randomize doubles teams"
        description="Enter player names one per line. The randomizer shuffles them into pairs and replaces your current team list when accepted."
      >
        <div className="flex flex-col gap-4">
          <Textarea
            value={randomizerNames}
            onChange={(e) => {
              setRandomizerNames(e.target.value);
              setRandomizerTeams([]);
              setRandomizerError("");
            }}
            rows={8}
            placeholder={"Player names (one per line)\nAlice\nBob\nCharlie\nDana"}
            aria-label="Player names for the randomizer"
          />

          {randomizerError && (
            <p className="rounded-md border border-accent/30 bg-red-50 p-3 text-sm text-accent">
              {randomizerError}
            </p>
          )}

          {randomizerTeams.length > 0 && (
            <div className="rounded-lg border border-line bg-mist/50 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                Randomized teams
              </p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {randomizerTeams.map((team, index) => (
                  <li key={index} className="flex items-center justify-between gap-3">
                    <span className="text-muted">Team {index + 1}</span>
                    <span className="font-semibold text-ink">
                      {team.player1} & {team.player2}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={runRandomizer}>
              <Shuffle className="h-4 w-4" />
              Randomize
            </Button>
            <Button
              type="button"
              disabled={randomizerTeams.length === 0}
              onClick={acceptRandomizer}
            >
              <Check className="h-4 w-4" />
              Accept teams
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
