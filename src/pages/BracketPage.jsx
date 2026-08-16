import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown, Trophy } from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import {
  championOf,
  groupByRound,
  resolveSeries,
  bestOfLabel,
} from "../lib/tournament/bracket.js";
import { displayName } from "../lib/participants.js";
import { Button } from "../components/ui/button.jsx";
import {
  Card,
  CardContent,
} from "../components/ui/card.jsx";
import TournamentNav from "../components/TournamentNav.jsx";
import { cn } from "../lib/utils.js";
import { useAuthStore } from "../store/authStore.js";

function BracketRow({ player, won, score }) {
  if (!player) {
    return (
      <div className="flex items-center justify-between px-3 py-2 text-sm text-muted/70">
        <span className="truncate">TBD</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2",
        won && "bg-primary text-white",
        !won && "text-ink",
      )}
    >
      <span className="min-w-0 truncate text-sm font-semibold">
        {displayName(player)}
        {player.type === "team" && (
          <span className="block truncate text-xs font-normal opacity-70">
            {player.player1} & {player.player2}
          </span>
        )}
      </span>
      {score != null && (
        <span className="text-sm font-extrabold tabular-nums">{score}</span>
      )}
    </div>
  );
}

function BracketMatchCard({ match, participantMap, isChampion }) {
  const a = match.participantAId
    ? participantMap.get(match.participantAId)
    : null;
  const b = match.participantBId
    ? participantMap.get(match.participantBId)
    : null;

  const aWon = match.status === "completed" && match.winnerId === match.participantAId;
  const bWon = match.status === "completed" && match.winnerId === match.participantBId;

  const { seriesScoreA, seriesScoreB } = resolveSeries(match);
  const showSeries =
    match.status === "completed" || (match.games?.length ?? 0) > 0;

  if (match.status === "bye") {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line bg-mist px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted/70">
          Bye
        </div>
        <BracketRow player={a ?? b} won score={null} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white shadow-sm",
        isChampion ? "border-amber-300 ring-2 ring-amber-200" : "border-line",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line bg-mist px-3 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted/70">
          {match.roundName}
        </span>
        <span className="rounded-full bg-mist px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
          {bestOfLabel(match)}
        </span>
      </div>
      <BracketRow player={a} won={aWon} score={showSeries ? seriesScoreA : null} />
      <div className="h-px bg-mist" />
      <BracketRow player={b} won={bWon} score={showSeries ? seriesScoreB : null} />
    </div>
  );
}

export default function BracketPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");

  const participantMap = useMemo(() => {
    if (!tournament) return new Map();
    return new Map(tournament.participants.map((p) => [p.id, p]));
  }, [tournament]);

  const rounds = useMemo(() => {
    if (!tournament || tournament.format !== "bracket") return [];
    return groupByRound(tournament.matches);
  }, [tournament]);

  const championId = useMemo(
    () => (tournament ? championOf(tournament.matches) : null),
    [tournament],
  );
  const champion = championId ? participantMap.get(championId) : null;

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
              No bracket generated yet
            </p>
            {isAdmin && (
              <Button
                className="mt-4"
                onClick={() => navigate(`/tournament/${tournament.id}/participants`)}
              >
                View participants
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
          Tournament Bracket
        </h2>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/tournament/${tournament.id}/matches`)}
          >
            Manage scores
          </Button>
        )}
      </div>

      <p className="text-center text-xs font-medium text-muted sm:hidden">
        Swipe left or right to see the full bracket
      </p>

      <div className="scroll-area overflow-x-auto rounded-lg border border-line bg-gradient-to-b from-light/40 to-white p-4">
        <div className="flex min-w-max items-stretch gap-6">
          {rounds.map((roundMatches, ri) => (
            <div key={ri} className="flex w-60 shrink-0 flex-col gap-3">
              <div className="h-6 text-center text-xs font-extrabold uppercase tracking-wider text-primary">
                {roundMatches[0]?.roundName}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-6">
                {roundMatches.map((m) => (
                  <BracketMatchCard
                    key={m.id}
                    match={m}
                    participantMap={participantMap}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Champion column */}
          <div className="flex w-60 shrink-0 flex-col gap-3">
            <div className="h-6 text-center text-xs font-extrabold uppercase tracking-wider text-accent">
              Champion
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <div className="overflow-hidden rounded-lg border border-amber-300 bg-white shadow-md">
                <div className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary px-4 py-3 text-white">
                  <Trophy className="h-5 w-5" />
                  <span className="text-sm font-bold">Champion</span>
                </div>
                {champion ? (
                  <div className="px-4 py-3">
                    <p className="flex items-center gap-2 text-base font-extrabold text-ink">
                      <Crown className="h-4 w-4 text-amber-500" />
                      {displayName(champion)}
                    </p>
                    {champion.type === "team" && (
                      <p className="mt-0.5 text-sm text-muted">
                        {champion.player1} & {champion.player2}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted/70">
                    To be decided
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
