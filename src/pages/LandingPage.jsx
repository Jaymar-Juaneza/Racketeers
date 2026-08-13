import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Trash2, User, Users } from "lucide-react";
import { useTournamentStore } from "../store/tournamentStore.js";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card.jsx";

const categoryLabel = {
  singles: "Singles",
  doubles: "Doubles",
};
const formatLabel = {
  "round-robin": "Round Robin",
  bracket: "Tournament Bracket",
};

export default function LandingPage() {
  const navigate = useNavigate();
  const tournaments = useTournamentStore((s) => s.tournaments);
  const deleteTournament = useTournamentStore((s) => s.deleteTournament);

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-secondary px-6 py-14 text-white sm:px-12 sm:py-20">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-50">
            <CalendarDays className="h-3.5 w-3.5" />
            Tournament Manager
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            ATSI <span className="text-red-300">Racketeers</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-blue-100">
            Organize Singles and Doubles badminton competitions. Generate
            fixtures automatically, record scores, and crown champions — all in
            one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-primary hover:bg-light sm:min-w-40"
              onClick={() => navigate("/setup/singles")}
            >
              <User className="h-5 w-5" />
              Start Singles
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className="border border-white/40 bg-white/10 text-white hover:bg-white/20 sm:min-w-40"
              onClick={() => navigate("/setup/doubles")}
            >
              <Users className="h-5 w-5" />
              Start Doubles
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Existing tournaments */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Your Tournaments
          </h2>
          {tournaments.length > 0 && (
            <span className="text-sm font-medium text-slate-500">
              {tournaments.length} total
            </span>
          )}
        </div>

        {tournaments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-light">
                <CalendarDays className="h-7 w-7 text-primary" />
              </div>
              <p className="text-lg font-semibold text-slate-700">
                No tournaments yet
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                Create your first competition with the Singles or Doubles
                buttons above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => {
              const completed = t.matches.filter(
                (m) => m.status === "completed",
              ).length;
              const total = t.matches.length;
              return (
                <Card key={t.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-1">{t.name}</CardTitle>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${t.name}"? This cannot be undone.`,
                            )
                          ) {
                            deleteTournament(t.id);
                          }
                        }}
                        className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-accent"
                        aria-label="Delete tournament"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="blue">{categoryLabel[t.category]}</Badge>
                      <Badge>{formatLabel[t.format]}</Badge>
                      <Badge variant="slate">{t.pointSystem} pts</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-3">
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                      <span>
                        {t.participants.length}{" "}
                        {t.category === "doubles" ? "teams" : "players"}
                      </span>
                      <span>
                        {completed}/{total} matches done
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/tournament/${t.id}`)}
                    >
                      {t.status === "setup" ? "Continue setup" : "Open"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
