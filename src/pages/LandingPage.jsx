import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Plus, Trash2 } from "lucide-react";
import { useTournamentStore } from "../store/tournamentStore.js";
import { useAuthStore } from "../store/authStore.js";
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
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="animate-rise relative overflow-hidden rounded-lg border border-line bg-gradient-to-br from-mist via-white to-mist-deep/60 px-6 py-14 text-ink shadow-panel sm:px-12 sm:py-20">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-secondary/20 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            Tournament Manager
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            ATSI <span className="text-secondary-dark">Racketeers</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Paste your players once and get the matchmaking instantly — for
            Singles and Doubles badminton competitions.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            {isAdmin ? (
              <Button
                size="lg"
                className="sm:min-w-52"
                onClick={() => navigate("/new")}
              >
                <Plus className="h-5 w-5" />
                New Tournament
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <p className="text-sm font-medium text-muted">
                Spectators can view live scores and standings without signing
                in.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Existing tournaments */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Your Tournaments
          </h2>
          {tournaments.length > 0 && (
            <span className="font-mono text-sm font-medium text-muted">
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
              <p className="text-lg font-semibold text-ink">
                No tournaments yet
              </p>
              <p className="max-w-sm text-sm text-muted">
                {isAdmin
                  ? "Create your first competition with the New Tournament button above."
                  : "No tournaments have been created yet — check back later."}
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
                      {isAdmin && (
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
                          className="rounded-md p-1 text-muted/70 hover:bg-red-50 hover:text-accent"
                          aria-label="Delete tournament"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="blue">{categoryLabel[t.category]}</Badge>
                      <Badge>{formatLabel[t.format]}</Badge>
                      <Badge variant="slate">{t.pointSystem} pts</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-3">
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
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
