import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown, Trophy } from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { championOf, groupByRound } from "../lib/tournament/bracket.js";
import { displayName } from "../lib/participants.js";
import { Button } from "../components/ui/button.jsx";
import {
  Card,
  CardContent,
} from "../components/ui/card.jsx";
import TournamentNav from "../components/TournamentNav.jsx";
import { cn } from "../lib/utils.js";

function BracketRow({ player, won, score }) {
  if (!player) {
    return (
      <div className="flex items-center justify-between px-3 py-2 text-sm text-slate-400">
        <span className="truncate">TBD</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2",
        won && "bg-primary text-white",
        !won && "text-slate-700",
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

  if (match.status === "bye") {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
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
        isChampion ? "border-amber-300 ring-2 ring-amber-200" : "border-slate-200",
      )}
    >
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {match.roundName}
      </div>
      <BracketRow player={a} won={aWon} score={match.scoreA} />
      <div className="h-px bg-slate-100" />
      <BracketRow player={b} won={bWon} score={match.scoreB} />
    </div>
  );
}

export default function BracketPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));

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
              No bracket generated yet
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
          Tournament Bracket
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/tournament/${tournament.id}/matches`)}
        >
          Manage scores
        </Button>
      </div>

      <div className="scroll-area overflow-x-auto rounded-2xl border border-blue-100 bg-gradient-to-b from-light/40 to-white p-4">
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
                    <p className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                      <Crown className="h-4 w-4 text-amber-500" />
                      {displayName(champion)}
                    </p>
                    {champion.type === "team" && (
                      <p className="mt-0.5 text-sm text-slate-500">
                        {champion.player1} & {champion.player2}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-400">
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
