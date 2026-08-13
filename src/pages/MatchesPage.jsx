import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, RotateCcw, Save, Swords, Undo2 } from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { displayName } from "../lib/participants.js";
import { scoreError } from "../lib/tournament/scoring.js";
import {
  bestOfLabel,
  firstToLabel,
  resolveSeries,
} from "../lib/tournament/bracket.js";
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
import { cn } from "../lib/utils.js";

/* ------------------------------------------------------------------ */
/* Single-game match card (used for round robin)                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Best-of series match card (used for brackets)                       */
/* ------------------------------------------------------------------ */

function GamePips({ won, target }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${won} of ${target} games won`}>
      {Array.from({ length: target }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors",
            i < won ? "bg-primary" : "bg-slate-200",
          )}
        />
      ))}
    </span>
  );
}

function SeriesMatchCard({
  match,
  tournament,
  participantMap,
  onRecord,
  onReopen,
  onUndo,
}) {
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [error, setError] = useState("");

  const a = match.participantAId ? participantMap.get(match.participantAId) : null;
  const b = match.participantBId ? participantMap.get(match.participantBId) : null;

  const isBye = match.status === "bye";
  const isTbd = !a || !b;
  const games = Array.isArray(match.games) ? match.games : [];
  const { seriesScoreA, seriesScoreB, gamesToWin } = resolveSeries(match);
  const seriesOver = match.status === "completed";
  const winner =
    seriesOver && match.winnerId === match.participantAId ? a : b;

  const handleSave = () => {
    if (isTbd || seriesOver) return;
    const aNum = scoreA === "" ? null : Number.parseInt(scoreA, 10);
    const bNum = scoreB === "" ? null : Number.parseInt(scoreB, 10);

    const err = scoreError(aNum, bNum, tournament.pointSystem);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    onRecord(match.id, aNum, bNum);
    setScoreA("");
    setScoreB("");
  };

  const handleReopen = () => {
    setScoreA("");
    setScoreB("");
    setError("");
    onReopen(match.id);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(match.status)}>
            {statusLabel(match.status)}
          </Badge>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {bestOfLabel(match)} · {firstToLabel(match).toLowerCase()}
          </span>
        </div>
        {seriesOver && (
          <Button variant="destructiveOutline" size="sm" onClick={handleReopen}>
            <RotateCcw className="h-3.5 w-3.5" />
            Re-open series
          </Button>
        )}
      </div>

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

        <span className="text-xs font-extrabold uppercase text-slate-400">vs</span>

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

      {isBye ? (
        <div className="py-2 text-center text-sm font-semibold text-slate-600">
          {displayName(a ?? b)} advances on a bye
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {/* Series progress */}
          <div className="rounded-lg bg-light/50 px-4 py-3">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-extrabold tabular-nums text-slate-900">
                  {seriesScoreA}
                </span>
                <GamePips won={seriesScoreA} target={gamesToWin} />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                games won
              </span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-extrabold tabular-nums text-slate-900">
                  {seriesScoreB}
                </span>
                <GamePips won={seriesScoreB} target={gamesToWin} />
              </div>
            </div>
          </div>

          {/* Game log */}
          {games.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Games played
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    onUndo(match.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-accent"
                >
                  <Undo2 className="h-3 w-3" />
                  Undo last game
                </button>
              </div>
              {games.map((g, i) => {
                const aWon = g.scoreA > g.scoreB;
                const bWon = g.scoreB > g.scoreA;
                return (
                  <div
                    key={g.id ?? i}
                    className="flex items-center gap-3 border-b border-slate-100 px-3 py-1.5 text-sm last:border-0"
                  >
                    <span className="w-14 shrink-0 text-xs font-semibold text-slate-400">
                      Game {i + 1}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-right font-bold tabular-nums",
                        aWon ? "text-primary" : "text-slate-400",
                      )}
                    >
                      {g.scoreA}
                    </span>
                    <span className="text-xs text-slate-300">–</span>
                    <span
                      className={cn(
                        "flex-1 text-left font-bold tabular-nums",
                        bWon ? "text-primary" : "text-slate-400",
                      )}
                    >
                      {g.scoreB}
                    </span>
                    <span className="w-20 shrink-0 truncate text-right text-xs font-medium text-slate-500">
                      {aWon
                        ? displayName(a)
                        : bWon
                          ? displayName(b)
                          : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {seriesOver ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
              <Check className="h-4 w-4" />
              {displayName(winner)} wins the series
            </div>
          ) : isTbd ? (
            <p className="text-center text-xs font-medium text-slate-400">
              Waiting for earlier results before this match can be played.
            </p>
          ) : (
            <>
              <p className="text-center text-xs font-semibold text-slate-500">
                Record game {games.length + 1} score
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={scoreA}
                  onChange={(e) => {
                    setScoreA(e.target.value);
                    setError("");
                  }}
                  placeholder="0"
                  className="text-center text-lg font-bold"
                  aria-label={`Game ${games.length + 1} score for ${a ? displayName(a) : "TBD"}`}
                />
                <span className="text-lg font-extrabold text-slate-300">–</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={scoreB}
                  onChange={(e) => {
                    setScoreB(e.target.value);
                    setError("");
                  }}
                  placeholder="0"
                  className="text-center text-lg font-bold"
                  aria-label={`Game ${games.length + 1} score for ${b ? displayName(b) : "TBD"}`}
                />
              </div>

              {error && (
                <p className="text-center text-sm font-medium text-accent">
                  {error}
                </p>
              )}

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleSave}
              >
                <Save className="h-4 w-4" />
                Save game
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MatchesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));
  const saveScore = useTournamentStore((s) => s.saveScore);
  const recordGame = useTournamentStore((s) => s.recordGame);
  const undoGame = useTournamentStore((s) => s.undoGame);
  const reopenMatch = useTournamentStore((s) => s.reopenMatch);

  const isBracket = tournament?.format === "bracket";

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
          {isBracket
            ? "Best of 3 · Finals best of 5"
            : `Win by 2 · ${tournament.pointSystem}-point games`}
        </p>
      </div>

      {isBracket && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-600">
          <Swords className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <strong className="text-slate-800">Best-of series:</strong> regular
            matches are first to 2 wins, and the Final is first to 3 wins. A
            team that wins games in a row closes the series early — no extra
            games needed.
          </p>
        </div>
      )}

      {grouped.map((group) => (
        <Card key={group.round}>
          <CardHeader>
            <CardTitle>{group.round}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {group.matches.map((m) => {
              const matchKey = isBracket
                ? `${m.id}:${m.status}:${m.games?.length ?? 0}`
                : `${m.id}:${m.status}:${m.scoreA}:${m.scoreB}`;
              return isBracket ? (
                <SeriesMatchCard
                  key={matchKey}
                  match={m}
                  tournament={tournament}
                  participantMap={participantMap}
                  onRecord={(matchId, a, b) =>
                    recordGame(tournament.id, matchId, a, b)
                  }
                  onUndo={(matchId) => undoGame(tournament.id, matchId)}
                  onReopen={(matchId) => reopenMatch(tournament.id, matchId)}
                />
              ) : (
                <MatchCard
                  key={matchKey}
                  match={m}
                  tournament={tournament}
                  participantMap={participantMap}
                  onSave={(matchId, a, b) =>
                    saveScore(tournament.id, matchId, a, b)
                  }
                  onReopen={(matchId) => reopenMatch(tournament.id, matchId)}
                />
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
