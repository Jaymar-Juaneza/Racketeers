import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown } from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { computeStandings } from "../lib/tournament/roundRobin.js";
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

export default function StandingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));

  const standings = useMemo(() => {
    if (!tournament || tournament.format !== "round-robin") return [];
    return computeStandings(tournament.participants, tournament.matches);
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

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Standings
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ranked by wins, head-to-head, point difference, then points scored.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{tournament.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="scroll-area overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-light/50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">
                    {tournament.category === "doubles" ? "Team" : "Player"}
                  </th>
                  <th className="px-3 py-3 text-center">W</th>
                  <th className="px-3 py-3 text-center">L</th>
                  <th className="px-3 py-3 text-center">PF</th>
                  <th className="px-3 py-3 text-center">PA</th>
                  <th className="px-5 py-3 text-center">PD</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => {
                  const participant = tournament.participants.find(
                    (p) => p.id === row.participantId,
                  );
                  const isLeader = row.rank === 1;
                  return (
                    <tr
                      key={row.participantId}
                      className={cn(
                        "border-b border-slate-50 last:border-0",
                        isLeader && "bg-amber-50/60",
                      )}
                    >
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold",
                            isLeader
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {displayName(participant)}
                          </span>
                          {isLeader && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        {participant?.type === "team" && (
                          <p className="text-xs text-slate-500">
                            {participant.player1} & {participant.player2}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">
                        {row.wins}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-500">
                        {row.losses}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">
                        {row.pointsFor}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-500">
                        {row.pointsAgainst}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Badge
                          variant={
                            row.pointDifference > 0
                              ? "green"
                              : row.pointDifference < 0
                                ? "red"
                                : "slate"
                          }
                        >
                          {row.pointDifference > 0 ? "+" : ""}
                          {row.pointDifference}
                        </Badge>
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
