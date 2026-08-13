import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import {
  selectTournament,
  useTournamentStore,
} from "../store/tournamentStore.js";
import { displayName, participantErrors, subLabel } from "../lib/participants.js";
import { bracketSizeFor, SUPPORTED_BRACKET_SIZES } from "../lib/tournament/bracket.js";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.jsx";

function buildSchema(category) {
  if (category === "doubles") {
    return z
      .object({
        name: z.string().trim().min(1, "Team name is required"),
        player1: z.string().trim().min(1, "Player 1 is required"),
        player2: z.string().trim().min(1, "Player 2 is required"),
      })
      .refine(
        (d) =>
          d.player1.trim().toLowerCase() !== d.player2.trim().toLowerCase(),
        {
          path: ["player2"],
          message: "Player 1 and Player 2 must be different",
        },
      );
  }
  return z.object({
    name: z.string().trim().min(1, "Player name is required"),
  });
}

export default function ParticipantsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => selectTournament(s, id));
  const addParticipant = useTournamentStore((s) => s.addParticipant);
  const removeParticipant = useTournamentStore((s) => s.removeParticipant);
  const generateMatches = useTournamentStore((s) => s.generateMatches);

  const isDoubles = tournament?.category === "doubles";

  const schema = useMemo(
    () => buildSchema(tournament?.category ?? "singles"),
    [tournament?.category],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isDoubles
      ? { name: "", player1: "", player2: "" }
      : { name: "" },
  });

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

  const count = tournament.participants.length;
  const minMet = count >= 2;
  const bracketSize =
    tournament.format === "bracket" ? bracketSizeFor(count) : null;
  const bracketOverflow =
    tournament.format === "bracket" && count > SUPPORTED_BRACKET_SIZES[SUPPORTED_BRACKET_SIZES.length - 1];

  const onSubmit = (values) => {
    const draft = isDoubles
      ? {
          type: "team",
          name: values.name,
          player1: values.player1,
          player2: values.player2,
        }
      : { type: "player", name: values.name };

    const dupErrors = participantErrors(tournament.participants, draft);
    if (dupErrors.name) {
      setError("name", { message: dupErrors.name });
      return;
    }
    if (isDoubles && dupErrors.player2) {
      setError("player2", { message: dupErrors.player2 });
      return;
    }

    addParticipant(tournament.id, draft);
    reset(isDoubles ? { name: "", player1: "", player2: "" } : { name: "" });
  };

  const handleGenerate = () => {
    if (!minMet || bracketOverflow) return;
    generateMatches(tournament.id);
    navigate(`/tournament/${tournament.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={`/tournament/${tournament.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Tournament
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {tournament.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Add {isDoubles ? "teams" : "players"} — minimum 2 required to
          generate fixtures.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Add form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add {isDoubles ? "team" : "player"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              {isDoubles ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Team name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Smash Bros"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm font-medium text-accent">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="player1">Player 1</Label>
                      <Input
                        id="player1"
                        placeholder="Player 1 name"
                        {...register("player1")}
                      />
                      {errors.player1 && (
                        <p className="text-sm font-medium text-accent">
                          {errors.player1.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="player2">Player 2</Label>
                      <Input
                        id="player2"
                        placeholder="Player 2 name"
                        {...register("player2")}
                      />
                      {errors.player2 && (
                        <p className="text-sm font-medium text-accent">
                          {errors.player2.message}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Player name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Maria Santos"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm font-medium text-accent">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" variant="secondary" className="w-full sm:w-auto sm:self-end">
                <Plus className="h-4 w-4" />
                Add {isDoubles ? "team" : "player"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Participant list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isDoubles ? (
                <Users className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
              {isDoubles ? "Teams" : "Players"} ({count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {count === 0 ? (
              <p className="rounded-lg bg-light/50 px-4 py-8 text-center text-sm text-slate-500">
                No {isDoubles ? "teams" : "players"} yet. Add the first one above.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {tournament.participants.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-light text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {displayName(p)}
                      </p>
                      {isDoubles && (
                        <p className="truncate text-xs text-slate-500">
                          {subLabel(p)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParticipant(tournament.id, p.id)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-accent"
                      aria-label={`Remove ${displayName(p)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Generate */}
        <Card className="border-primary/20 bg-light/40">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              {!minMet ? (
                <span>
                  Add at least <strong>2 {isDoubles ? "teams" : "players"}</strong> to generate
                  fixtures.
                </span>
              ) : bracketOverflow ? (
                <span className="font-medium text-accent">
                  Maximum {SUPPORTED_BRACKET_SIZES[SUPPORTED_BRACKET_SIZES.length - 1]}{" "}
                  participants for a bracket — remove{" "}
                  {count - SUPPORTED_BRACKET_SIZES[SUPPORTED_BRACKET_SIZES.length - 1]}.
                </span>
              ) : (
                <span>
                  {tournament.format === "bracket"
                    ? `Ready — bracket size will be ${bracketSize}.`
                    : "Ready to generate the round-robin schedule."}
                </span>
              )}
            </div>
            <Button
              size="lg"
              disabled={!minMet || bracketOverflow}
              onClick={handleGenerate}
              className="shrink-0"
            >
              Generate matches
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
