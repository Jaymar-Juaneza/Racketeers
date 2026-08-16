import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  Crown,
  ListChecks,
  RotateCcw,
  Trophy,
  User,
  Users,
} from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { computeStandings } from "../lib/tournament/roundRobin.js";
import { displayName } from "../lib/participants.js";
import { cn } from "../lib/utils.js";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.jsx";
import TournamentNav from "../components/TournamentNav.jsx";
import { useAuthStore } from "../store/authStore.js";

function StatCard({ icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-light text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="text-2xl font-extrabold text-ink">{value}</p>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PlaceRow({ rank, participants }) {
  const tied = participants.length > 1;
  return (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-extrabold",
          rank === 1
            ? "h-14 w-14 bg-primary text-xl text-white"
            : "h-11 w-11 bg-mist text-lg text-muted",
        )}
      >
        {rank}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {rank === 1 ? "1st place" : rank === 2 ? "2nd place" : "3rd place"}
        </p>
        {participants.map((p) => (
          <p
            key={p.id}
            className={cn(
              "font-bold text-ink",
              rank === 1 ? "text-xl" : "text-lg",
            )}
          >
            {displayName(p)}
          </p>
        ))}
        {tied && <p className="text-xs font-medium text-muted">tied</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");

  const stats = useMemo(() => {
    if (!tournament) return null;

    const completed = tournament.matches.filter(
      (m) => m.status === "completed",
    );
    const remaining = tournament.matches.filter(
      (m) => m.status === "scheduled" || m.status === "live",
    );

    // First round that still has unfinished matches.
    let currentRound = "—";
    const playable = tournament.matches.filter((m) => !m.isBye);
    const unfinishedRounds = [...new Set(playable
      .filter((m) => m.status !== "completed")
      .map((m) => m.round))]
      .sort((a, b) => a - b);
    if (unfinishedRounds.length === 0 && playable.length > 0) {
      currentRound = "Complete";
    } else if (unfinishedRounds.length > 0) {
      const r = unfinishedRounds[0];
      const match = playable.find((m) => m.round === r);
      currentRound = match?.roundName ?? `Round ${r}`;
    }

    const isComplete =
      playable.length > 0 && remaining.length === 0;

    let leaderLabel = "Tournament Leader";
    const podium = [];
    let hasWinner = false;

    if (tournament.format === "round-robin") {
      const standings = computeStandings(
        tournament.participants,
        tournament.matches,
      );
      if (isComplete && standings.length > 0) {
        hasWinner = true;
        for (let i = 0; i < Math.min(3, standings.length); i += 1) {
          const participant = tournament.participants.find(
            (p) => p.id === standings[i].participantId,
          );
          if (participant) {
            podium.push({ rank: i + 1, participants: [participant] });
          }
        }
      }
    } else {
      leaderLabel = "Champion";
      const finalMatch = tournament.matches.find(
        (m) => m.roundName === "Final" && m.status === "completed",
      );
      const champId = finalMatch?.winnerId ?? null;
      if (champId) {
        hasWinner = true;
        const champion =
          tournament.participants.find((p) => p.id === champId) ?? null;
        if (champion) podium.push({ rank: 1, participants: [champion] });

        const runnerUpId =
          finalMatch.winnerId === finalMatch.participantAId
            ? finalMatch.participantBId
            : finalMatch.participantAId;
        const runnerUp = runnerUpId
          ? tournament.participants.find((p) => p.id === runnerUpId) ?? null
          : null;
        if (runnerUp) podium.push({ rank: 2, participants: [runnerUp] });

        const semifinalLosers = tournament.matches
          .filter(
            (m) => m.roundName === "Semifinals" && m.status === "completed",
          )
          .map((m) => {
            const loserId =
              m.winnerId === m.participantAId
                ? m.participantBId
                : m.participantAId;
            return (
              tournament.participants.find((p) => p.id === loserId) ?? null
            );
          })
          .filter(Boolean);
        if (semifinalLosers.length > 0) {
          podium.push({ rank: 3, participants: semifinalLosers });
        }
      }
    }

    return {
      total: tournament.participants.length,
      completed: completed.length,
      remaining: remaining.length,
      currentRound,
      podium,
      hasWinner,
      leaderLabel,
      isComplete,
    };
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          All tournaments
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink break-words sm:text-3xl">
              {tournament.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant="blue">
                {tournament.category === "singles" ? "Singles" : "Doubles"}
              </Badge>
              <Badge>
                {tournament.format === "round-robin"
                  ? "Round Robin"
                  : "Tournament Bracket"}
              </Badge>
              <Badge variant="slate">{tournament.pointSystem} points</Badge>
              {tournament.format === "bracket" && (
                <Badge variant="green">Best of 3 · Final Best of 5</Badge>
              )}
            </div>
          </div>

          {isAdmin ? (
            tournament.status === "setup" ? (
              <Button onClick={() => navigate(`/tournament/${tournament.id}/participants`)}>
                Add participants
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate(`/tournament/${tournament.id}/matches`)}
              >
                <ListChecks className="h-4 w-4" />
                Manage scores
              </Button>
            )
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate(`/tournament/${tournament.id}/matches`)}
            >
              <ListChecks className="h-4 w-4" />
              View matches
            </Button>
          )}
        </div>
      </div>

      <TournamentNav tournament={tournament} />

      {stats.isComplete && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <Trophy className="h-5 w-5 shrink-0" />
          {tournament.format === "round-robin"
            ? "All round-robin matches are complete — final standings are ready."
            : "The bracket is complete — a champion has been crowned."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={
            tournament.category === "singles" ? (
              <User className="h-6 w-6" />
            ) : (
              <Users className="h-6 w-6" />
            )
          }
          label="Total Participants"
          value={stats.total}
          sub={tournament.category === "singles" ? "players" : "teams"}
        />
        <StatCard
          icon={<CalendarCheck2 className="h-6 w-6" />}
          label="Matches Completed"
          value={stats.completed}
        />
        <StatCard
          icon={<CalendarClock className="h-6 w-6" />}
          label="Matches Remaining"
          value={stats.remaining}
        />
        <StatCard
          icon={<RotateCcw className="h-6 w-6" />}
          label="Current Round"
          value={stats.currentRound}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {stats.leaderLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.hasWinner ? (
              <div className="flex flex-col gap-4">
                {stats.podium.map((entry, index) => (
                  <div
                    key={entry.rank}
                    className={cn(index > 0 && "border-t border-line pt-4")}
                  >
                    <PlaceRow rank={entry.rank} participants={entry.participants} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 py-6">
                <RotateCcw className="h-5 w-5 text-muted" />
                <p className="text-sm font-semibold text-muted">
                  Match in progress
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate(`/tournament/${tournament.id}/participants`)}
            >
              <Users className="h-4 w-4" />
              View participants
            </Button>
            {tournament.format === "round-robin" ? (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate(`/tournament/${tournament.id}/standings`)}
              >
                <Crown className="h-4 w-4" />
                View standings
              </Button>
            ) : (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate(`/tournament/${tournament.id}/bracket`)}
              >
                <Trophy className="h-4 w-4" />
                View bracket
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
