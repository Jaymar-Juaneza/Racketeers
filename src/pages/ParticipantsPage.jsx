import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown, Medal, Swords, Trophy } from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { useAuthStore } from "../store/authStore.js";
import { computeStandings } from "../lib/tournament/roundRobin.js";
import { championOf } from "../lib/tournament/bracket.js";
import { displayName } from "../lib/participants.js";
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
/* Live participant ranking                                           */
/* ------------------------------------------------------------------ */

function statusBadgeVariant(status) {
  switch (status) {
    case "Champion":
      return "amber";
    case "Leader":
      return "green";
    case "Eliminated":
      return "red";
    case "Active":
      return "blue";
    default:
      return "slate";
  }
}

function StatusBadge({ status }) {
  return <Badge variant={statusBadgeVariant(status)}>{status}</Badge>;
}

function computeRoundRobinRows(tournament) {
  const standings = computeStandings(tournament.participants, tournament.matches);
  const realMatches = tournament.matches.filter((m) => !m.isBye);
  const isComplete =
    realMatches.length > 0 && realMatches.every((m) => m.status === "completed");
  const leaderWins = standings[0]?.wins ?? 0;

  return standings.map((row) => {
    const participant = tournament.participants.find(
      (p) => p.id === row.participantId,
    );
    const remaining = realMatches.filter(
      (m) =>
        (m.participantAId === row.participantId ||
          m.participantBId === row.participantId) &&
        m.status !== "completed",
    ).length;
    const maxWins = row.wins + remaining;

    let status = "Active";
    if (isComplete) {
      if (row.rank === 1) status = "Champion";
      else if (row.rank === 2) status = "Runner-up";
      else if (row.rank === 3) status = "Third place";
      else status = "Final";
    } else if (row.rank === 1) {
      status = "Leader";
    } else if (maxWins < leaderWins) {
      status = "Eliminated";
    }

    return {
      rank: row.rank,
      participantId: row.participantId,
      participant,
      wins: row.wins,
      losses: row.losses,
      status,
    };
  });
}

function computeBracketRows(tournament) {
  const participants = tournament.participants;
  const stats = new Map(
    participants.map((p) => [
      p.id,
      { participantId: p.id, wins: 0, losses: 0, status: "Active" },
    ]),
  );

  const championId = championOf(tournament.matches);

  for (const match of tournament.matches) {
    if (match.status !== "completed" || match.isBye) continue;

    const winnerId = match.winnerId;
    const loserId =
      winnerId === match.participantAId
        ? match.participantBId
        : match.participantAId;

    if (winnerId && stats.has(winnerId)) {
      stats.get(winnerId).wins += 1;
    }
    if (loserId && stats.has(loserId)) {
      stats.get(loserId).losses += 1;
      stats.get(loserId).status = "Eliminated";
    }
  }

  if (championId && stats.has(championId)) {
    stats.get(championId).status = "Champion";
  }

  const order = { Champion: 0, Active: 1, Eliminated: 2 };
  const rows = [...stats.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return rows.map((row, index) => {
    const participant = participants.find((p) => p.id === row.participantId);
    return {
      rank: index + 1,
      participantId: row.participantId,
      participant,
      wins: row.wins,
      losses: row.losses,
      status: row.status,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ParticipantsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");

  const rows = useMemo(() => {
    if (!tournament) return [];
    if (tournament.format === "round-robin") {
      return computeRoundRobinRows(tournament);
    }
    return computeBracketRows(tournament);
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

  const isDoubles = tournament.category === "doubles";
  const hasStarted = rows.some((r) => r.wins > 0 || r.losses > 0);
  const leader =
    tournament.format === "bracket"
      ? rows.find((r) => r.status === "Champion") ?? null
      : hasStarted
        ? rows[0]
        : null;
  const eliminatedCount = rows.filter((r) => r.status === "Eliminated").length;
  const hasMatches = tournament.matches.length > 0;

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
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Participants
          </h2>
          <p className="mt-1 text-sm text-muted">
            Live ranking — updates automatically as scores are recorded.
          </p>
        </div>
        {isAdmin && hasMatches && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/tournament/${tournament.id}/matches`)}
          >
            Manage scores
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {tournament.format === "round-robin" ? "Current leader" : "Champion"}
              </p>
              <p className="truncate text-sm font-bold text-ink">
                {leader?.participant ? displayName(leader.participant) : "TBD"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Medal className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Total {isDoubles ? "teams" : "players"}
              </p>
              <p className="text-sm font-bold text-ink">{rows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Swords className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Eliminated
              </p>
              <p className="text-sm font-bold text-ink">{eliminatedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Live ranking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="scroll-area overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y border-line bg-light/50 text-left text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">
                    {isDoubles ? "Team" : "Player"}
                  </th>
                  <th className="px-3 py-3 text-center">W</th>
                  <th className="px-3 py-3 text-center">L</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isTop = row.rank === 1;
                  return (
                    <tr
                      key={row.participantId}
                      className={cn(
                        "border-b border-line last:border-0",
                        isTop && "bg-amber-50/60",
                      )}
                    >
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold",
                            isTop
                              ? "bg-primary text-white"
                              : "bg-mist text-muted",
                          )}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">
                            {displayName(row.participant)}
                          </span>
                          {isTop && row.status !== "Active" && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        {row.participant?.type === "team" && (
                          <p className="text-xs text-muted">
                            {row.participant.player1} &{" "}
                            {row.participant.player2}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-ink">
                        {row.wins}
                      </td>
                      <td className="px-3 py-3 text-center text-muted">
                        {row.losses}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
