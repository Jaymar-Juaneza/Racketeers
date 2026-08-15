import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  RotateCcw,
  Swords,
  Undo2,
} from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { useAuthStore } from "../store/authStore.js";
import { displayName } from "../lib/participants.js";
import {
  bestOfLabel,
  firstToLabel,
  resolveSeries,
} from "../lib/tournament/bracket.js";
import { statusLabel, statusVariant } from "../lib/matchStatus.js";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.jsx";
import TournamentNav from "../components/TournamentNav.jsx";
import { cn } from "../lib/utils.js";

/* ------------------------------------------------------------------ */
/* Live score controls                                                */
/* ------------------------------------------------------------------ */

function ScoreButton({ children, onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-xl font-extrabold text-ink shadow-sm transition-all hover:border-primary/40 hover:bg-mist hover:text-primary active:scale-95 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function LiveScoreControl({ value, onIncrement, disabled = false, label }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      <ScoreButton
        onClick={() => onIncrement(-1)}
        disabled={disabled}
        label={`Decrease ${label} score`}
      >
        <Minus className="h-5 w-5" />
      </ScoreButton>
      <span className="min-w-12 text-center text-3xl font-extrabold tabular-nums text-ink sm:text-4xl">
        {value}
      </span>
      <ScoreButton
        onClick={() => onIncrement(1)}
        disabled={disabled}
        label={`Increase ${label} score`}
      >
        <Plus className="h-5 w-5" />
      </ScoreButton>
    </div>
  );
}

function NameBlock({ participant, align = "right" }) {
  if (!participant) {
    return (
      <div className={cn("min-w-0", align === "right" ? "text-right" : "text-left")}>
        <p className="truncate text-sm font-bold text-ink">TBD</p>
      </div>
    );
  }
  return (
    <div className={cn("min-w-0", align === "right" ? "text-right" : "text-left")}>
      <p className="truncate text-sm font-bold text-ink">
        {displayName(participant)}
      </p>
      {participant.type === "team" && (
        <p className="truncate text-xs text-muted">
          {participant.player1} & {participant.player2}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Single-game match card (round robin)                                */
/* ------------------------------------------------------------------ */

function MatchCard({
  match,
  participantMap,
  onIncrement,
  onReopen,
  readOnly = false,
}) {
  const a = match.participantAId ? participantMap.get(match.participantAId) : null;
  const b = match.participantBId ? participantMap.get(match.participantBId) : null;

  const isBye = match.status === "bye";
  const isTbd = !a || !b;
  const isCompleted = match.status === "completed";
  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge variant={statusVariant(match.status)}>
          {statusLabel(match.status)}
        </Badge>
        {!readOnly && isCompleted && (
          <Button
            variant="destructiveOutline"
            size="sm"
            onClick={() => onReopen(match.id)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Re-open
          </Button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <NameBlock participant={a} align="right" />
        <span className="text-xs font-extrabold uppercase text-muted/70">vs</span>
        <NameBlock participant={b} align="left" />
      </div>

      {isBye ? (
        <div className="py-2 text-center text-sm font-semibold text-muted">
          {displayName(a ?? b)} advances on a bye
        </div>
      ) : isTbd ? (
        <p className="mt-3 text-center text-xs font-medium text-muted/70">
          To be decided
        </p>
      ) : readOnly ? (
        match.status === "scheduled" ? (
          <p className="mt-3 py-1 text-center text-xs font-medium text-muted/70">
            Not yet played
          </p>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-3 text-2xl font-extrabold tabular-nums text-ink">
            <span>{match.scoreA}</span>
            <span className="text-muted/40">–</span>
            <span>{match.scoreB}</span>
          </div>
        )
      ) : isCompleted ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-2xl font-extrabold tabular-nums text-ink">
          <span>{match.scoreA}</span>
          <span className="text-muted/40">–</span>
          <span>{match.scoreB}</span>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <LiveScoreControl
            value={scoreA}
            onIncrement={(d) => onIncrement(match.id, "A", d)}
            label={a ? displayName(a) : "TBD"}
          />
          <span className="text-lg font-extrabold text-muted/40">–</span>
          <LiveScoreControl
            value={scoreB}
            onIncrement={(d) => onIncrement(match.id, "B", d)}
            label={b ? displayName(b) : "TBD"}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Best-of series match card (brackets)                                */
/* ------------------------------------------------------------------ */

function GamePips({ won, target }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`${won} of ${target} games won`}
    >
      {Array.from({ length: target }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors",
            i < won ? "bg-primary" : "bg-line",
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
  onIncrement,
  onUndo,
  onReopen,
  readOnly = false,
}) {
  const a = match.participantAId ? participantMap.get(match.participantAId) : null;
  const b = match.participantBId ? participantMap.get(match.participantBId) : null;

  const isBye = match.status === "bye";
  const isTbd = !a || !b;
  const games = Array.isArray(match.games) ? match.games : [];
  const live = match.live ?? null;
  const liveScoreA = live?.scoreA ?? 0;
  const liveScoreB = live?.scoreB ?? 0;
  const { seriesScoreA, seriesScoreB, gamesToWin } = resolveSeries(match);
  const seriesOver = match.status === "completed";
  const winner = seriesOver && match.winnerId === match.participantAId ? a : b;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(match.status)}>
            {statusLabel(match.status)}
          </Badge>
          <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {bestOfLabel(match)} · {firstToLabel(match).toLowerCase()}
          </span>
        </div>
        {!readOnly && seriesOver && (
          <Button
            variant="destructiveOutline"
            size="sm"
            onClick={() => onReopen(match.id)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Re-open series
          </Button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <NameBlock participant={a} align="right" />
        <span className="text-xs font-extrabold uppercase text-muted/70">vs</span>
        <NameBlock participant={b} align="left" />
      </div>

      {isBye ? (
        <div className="py-2 text-center text-sm font-semibold text-muted">
          {displayName(a ?? b)} advances on a bye
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {/* Series progress */}
          <div className="rounded-lg bg-light/50 px-4 py-3">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-extrabold tabular-nums text-ink">
                  {seriesScoreA}
                </span>
                <GamePips won={seriesScoreA} target={gamesToWin} />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wide text-muted/70">
                games won
              </span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-extrabold tabular-nums text-ink">
                  {seriesScoreB}
                </span>
                <GamePips won={seriesScoreB} target={gamesToWin} />
              </div>
            </div>
          </div>

          {/* Game log */}
          {games.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="flex items-center justify-between border-b border-line bg-mist px-3 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted/70">
                  Games played
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onUndo(match.id)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted hover:bg-mist hover:text-accent"
                  >
                    <Undo2 className="h-3 w-3" />
                    Undo last game
                  </button>
                )}
              </div>
              {games.map((g, i) => {
                const aWon = g.scoreA > g.scoreB;
                const bWon = g.scoreB > g.scoreA;
                return (
                  <div
                    key={g.id ?? i}
                    className="flex items-center gap-3 border-b border-line px-3 py-1.5 text-sm last:border-0"
                  >
                    <span className="w-14 shrink-0 text-xs font-semibold text-muted/70">
                      Game {i + 1}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-right font-bold tabular-nums",
                        aWon ? "text-primary" : "text-muted/70",
                      )}
                    >
                      {g.scoreA}
                    </span>
                    <span className="text-xs text-muted/40">–</span>
                    <span
                      className={cn(
                        "flex-1 text-left font-bold tabular-nums",
                        bWon ? "text-primary" : "text-muted/70",
                      )}
                    >
                      {g.scoreB}
                    </span>
                    <span className="w-20 shrink-0 truncate text-right text-xs font-medium text-muted">
                      {aWon ? displayName(a) : bWon ? displayName(b) : ""}
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
            <p className="text-center text-xs font-medium text-muted/70">
              Waiting for earlier results before this match can be played.
            </p>
          ) : readOnly ? (
            live || games.length > 0 ? (
              <div className="flex items-center justify-center gap-3 py-1 text-2xl font-extrabold tabular-nums text-ink">
                <span>{liveScoreA}</span>
                <span className="text-muted/40">–</span>
                <span>{liveScoreB}</span>
              </div>
            ) : (
              <p className="py-1 text-center text-xs font-medium text-muted/70">
                Not yet played
              </p>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-center text-xs font-semibold text-muted">
                Game {games.length + 1} · first to {tournament.pointSystem}, win by 2
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <LiveScoreControl
                  value={liveScoreA}
                  onIncrement={(d) => onIncrement(match.id, "A", d)}
                  label={a ? displayName(a) : "TBD"}
                />
                <span className="text-lg font-extrabold text-muted/40">–</span>
                <LiveScoreControl
                  value={liveScoreB}
                  onIncrement={(d) => onIncrement(match.id, "B", d)}
                  label={b ? displayName(b) : "TBD"}
                />
              </div>
            </div>
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
  const incrementScore = useTournamentStore((s) => s.incrementScore);
  const undoGame = useTournamentStore((s) => s.undoGame);
  const reopenMatch = useTournamentStore((s) => s.reopenMatch);
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");

  const isBracket = tournament?.format === "bracket";
  const readOnly = !isAdmin;

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
          <p className="text-lg font-semibold text-ink">
            Tournament not found
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
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
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <TournamentNav tournament={tournament} />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold text-ink">
              No fixtures generated yet
            </p>
            <p className="mt-1 text-sm text-muted">
              Add participants and generate matches first.
            </p>
            {isAdmin && (
              <Button
                className="mt-4"
                onClick={() => navigate(`/tournament/${tournament.id}/participants`)}
              >
                Add participants
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/tournament/${tournament.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <TournamentNav tournament={tournament} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          {isAdmin ? "Match Management" : "Matches"}
        </h2>
        <p className="text-sm text-muted">
          {isBracket
            ? "Best of 3 · Finals best of 5"
            : `First to ${tournament.pointSystem} · win by 2 (no cap)`}
        </p>
      </div>

      {isBracket && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-mist/70 px-4 py-3 text-sm text-muted">
          <Swords className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <strong className="text-ink">Best-of series:</strong> regular
            matches are first to 2 wins, and the Final is first to 3 wins. Each
            game is won by reaching {tournament.pointSystem} points with a
            2-point lead.
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
                ? `${m.id}:${m.status}:${m.games?.length ?? 0}:${m.live?.scoreA ?? 0}:${m.live?.scoreB ?? 0}`
                : `${m.id}:${m.status}:${m.scoreA}:${m.scoreB}`;
              return isBracket ? (
                <SeriesMatchCard
                  key={matchKey}
                  match={m}
                  tournament={tournament}
                  participantMap={participantMap}
                  readOnly={readOnly}
                  onIncrement={(matchId, side, delta) =>
                    incrementScore(tournament.id, matchId, side, delta)
                  }
                  onUndo={(matchId) => undoGame(tournament.id, matchId)}
                  onReopen={(matchId) => reopenMatch(tournament.id, matchId)}
                />
              ) : (
                <MatchCard
                  key={matchKey}
                  match={m}
                  participantMap={participantMap}
                  readOnly={readOnly}
                  onIncrement={(matchId, side, delta) =>
                    incrementScore(tournament.id, matchId, side, delta)
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
