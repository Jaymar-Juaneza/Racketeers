import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, Save } from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { displayName } from "../lib/participants.js";
import { scoreError } from "../lib/tournament/scoring.js";
import { statusLabel, statusVariant } from "../lib/matchStatus.js";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.jsx";
import TournamentNav from "../components/TournamentNav.jsx";

function MatchCard({ match, tournament, participantMap, onSave, onReopen }) {
  const [scoreA, setScoreA] = useState(
    match.scoreA == null ? "" : String(match.scoreA),
  );
  const [scoreB, setScoreB] = useState(
    match.scoreB == null ? "" : String(match.scoreB),
  );
  const [error, setError] = useState("");

  const a = match.participantAId ? participantMap.get(match.participantAId) : null;
  const b = match.participantBId ? participantMap.get(match.participantBId) : null;

  const isBye = match.status === "bye";
  const isTbd = !a || !b;

  const handleSave = () => {
    if (isTbd) return;
    const aNum = scoreA === "" ? null : Number.parseInt(scoreA, 10);
    const bNum = scoreB === "" ? null : Number.parseInt(scoreB, 10);

    const err = scoreError(aNum, bNum, tournament.pointSystem);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    onSave(match.id, aNum, bNum);
  };

  const handleReopen = () => {
    setScoreA("");
    setScoreB("");
    setError("");
    onReopen(match.id);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge variant={statusVariant(match.status)}>
          {statusLabel(match.status)}
        </Badge>
        {match.status === "completed" && (
          <Button variant="destructiveOutline" size="sm" onClick={handleReopen}>
            <RotateCcw className="h-3.5 w-3.5" />
            Re-open
          </Button>
        )}
      </div>

      {isBye ? (
        <div className="py-2 text-center text-sm font-semibold text-slate-600">
          {displayName(a ?? b)} advances on a bye
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-bold text-slate-800">
              {a ? displayName(a) : "TBD"}
            </p>
            {a?.type === "team" && (
              <p className="truncate text-xs text-slate-500">
                {a.player1} & {a.player2}
              </p>
            )}
          </div>

          <span className="text-xs font-extrabold uppercase text-slate-400">
            vs
          </span>

          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-bold text-slate-800">
              {b ? displayName(b) : "TBD"}
            </p>
            {b?.type === "team" && (
              <p className="truncate text-xs text-slate-500">
                {b.player1} & {b.player2}
              </p>
            )}
          </div>
        </div>
      )}

      {!isBye && (
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              value={scoreA}
              disabled={isTbd}
              onChange={(e) => {
                setScoreA(e.target.value);
                setError("");
              }}
              placeholder="0"
              className="text-center text-lg font-bold"
              aria-label={`Score for ${a ? displayName(a) : "TBD"}`}
            />
            <span className="text-lg font-extrabold text-slate-300">–</span>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              value={scoreB}
              disabled={isTbd}
              onChange={(e) => {
                setScoreB(e.target.value);
                setError("");
              }}
              placeholder="0"
              className="text-center text-lg font-bold"
              aria-label={`Score for ${b ? displayName(b) : "TBD"}`}
            />
          </div>

          {isTbd ? (
            <p className="mt-3 text-center text-xs font-medium text-slate-400">
              Waiting for earlier results before this match can be scored.
            </p>
          ) : (
            <>
              {error && (
                <p className="mt-3 text-center text-sm font-medium text-accent">
                  {error}
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={handleSave}
              >
                <Save className="h-4 w-4" />
                {match.status === "completed" ? "Update score" : "Save score"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));
  const saveScore = useTournamentStore((s) => s.saveScore);
  const reopenMatch = useTournamentStore((s) => s.reopenMatch);

  const participantMap = useMemo(() => {
    if (!tournament) return new Map();
    return new Map(tournament.participants.map((p) => [p.id, p]));
  }, [tournament]);

  const grouped = useMemo(() => {
    if (!tournament) return [];
    const groups = new Map();
    for (const m of tournament.matches) {
      const key = m.roundName ?? `Round ${m.round}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    return [...groups.entries()].map(([round, matches]) => ({
      round,
      matches: matches.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
    }));
  }, [tournament]);

  if (!tournament) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-semibold text-slate-700">
            Tournament not found
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/home")}>
            Back to home
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (tournament.matches.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to={`/tournament/${tournament.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <TournamentNav tournament={tournament} />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold text-slate-700">
              No fixtures generated yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Add participants and generate matches first.
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate(`/tournament/${tournament.id}/participants`)}
            >
              Add participants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/tournament/${tournament.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <TournamentNav tournament={tournament} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Match Management
        </h2>
        <p className="text-sm text-slate-500">
          Win by 2 · {tournament.pointSystem}-point games
        </p>
      </div>

      {grouped.map((group) => (
        <Card key={group.round}>
          <CardHeader>
            <CardTitle>{group.round}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {group.matches.map((m) => (
              <MatchCard
                key={`${m.id}:${m.status}:${m.scoreA}:${m.scoreB}`}
                match={m}
                tournament={tournament}
                participantMap={participantMap}
                onSave={(matchId, a, b) =>
                  saveScore(tournament.id, matchId, a, b)
                }
                onReopen={(matchId) => reopenMatch(tournament.id, matchId)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
