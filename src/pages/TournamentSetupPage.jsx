import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Repeat,
  Shuffle,
  Swords,
  User,
  Users,
} from "lucide-react";
import { useTournamentStore } from "../store/tournamentStore.js";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.jsx";
import { cn } from "../lib/utils.js";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tournament name is required")
    .max(80, "Keep the name under 80 characters"),
  format: z.enum(["round-robin", "bracket"]),
  pointSystem: z.coerce
    .number()
    .refine((v) => v === 15 || v === 21, "Choose 15 or 21 points"),
  seeding: z.enum(["auto", "random"]).optional(),
});

function OptionCard({ active, onClick, icon, title, description, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all",
        active
          ? "border-primary bg-light/60 shadow-sm"
          : "border-slate-200 bg-white hover:border-primary/40 hover:bg-blue-50/40",
      )}
    >
      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {badge}
        </span>
      )}
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          active ? "bg-primary text-white" : "bg-light text-primary",
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-bold text-slate-900">{title}</span>
      <span className="text-xs leading-relaxed text-slate-500">
        {description}
      </span>
    </button>
  );
}

export default function TournamentSetupPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const createTournament = useTournamentStore((s) => s.createTournament);

  const valid = category === "singles" || category === "doubles";

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      format: "round-robin",
      pointSystem: 21,
      seeding: "auto",
    },
  });

  const format = useWatch({ control, name: "format" });
  const pointSystem = useWatch({ control, name: "pointSystem" });
  const seeding = useWatch({ control, name: "seeding" });

  if (!valid) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-semibold text-slate-700">
            Unknown category
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/home")}>
            Back to home
          </Button>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = (values) => {
    const id = createTournament({
      name: values.name,
      category,
      format: values.format,
      pointSystem: values.pointSystem,
      seeding: values.seeding,
    });
    navigate(`/tournament/${id}/participants`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/home"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          New {category === "singles" ? "Singles" : "Doubles"} Tournament
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure the competition, then add{" "}
          {category === "singles" ? "players" : "teams"} in the next step.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tournament details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Tournament name</Label>
              <Input
                id="name"
                placeholder={`e.g. ${category === "singles" ? "Summer Singles Open" : "Doubles Championship 2025"}`}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm font-medium text-accent">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-light/60 p-3 text-sm text-slate-600">
              {category === "singles" ? (
                <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
              <span>
                <strong className="text-slate-800">
                  {category === "singles" ? "Singles" : "Doubles"}
                </strong>{" "}
                · minimum 2{" "}
                {category === "singles" ? "players" : "teams"}, no maximum.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tournament format</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              active={format === "round-robin"}
              onClick={() => setValue("format", "round-robin")}
              icon={<Repeat className="h-5 w-5" />}
              title="Round Robin"
              description="Every participant plays everyone else once. Standings by wins, head-to-head, and point difference."
            />
            <OptionCard
              active={format === "bracket"}
              onClick={() => setValue("format", "bracket")}
              icon={<Swords className="h-5 w-5" />}
              title="Tournament Bracket"
              description="Single-elimination knockout with auto-seeding and automatic BYEs."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Match point system</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              active={pointSystem === 15}
              onClick={() => setValue("pointSystem", 15)}
              icon={<span className="text-lg font-extrabold">15</span>}
              title="15 Points"
              description="Win by 2 · maximum score 17-15."
            />
            <OptionCard
              active={pointSystem === 21}
              onClick={() => setValue("pointSystem", 21)}
              icon={<span className="text-lg font-extrabold">21</span>}
              title="21 Points"
              description="Win by 2 · maximum score 30-29."
            />
          </CardContent>
        </Card>

        {format === "bracket" && (
          <Card>
            <CardHeader>
              <CardTitle>Seeding</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <OptionCard
                active={seeding === "auto"}
                onClick={() => setValue("seeding", "auto")}
                icon={<User className="h-5 w-5" />}
                title="Auto-seeding"
                description="Seed players in the order they are added (1st added = top seed)."
              />
              <OptionCard
                active={seeding === "random"}
                onClick={() => setValue("seeding", "random")}
                icon={<Shuffle className="h-5 w-5" />}
                title="Random seeding"
                description="Shuffle participants randomly before placing them."
              />
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/home")}
          >
            Cancel
          </Button>
          <Button type="submit" size="lg">
            Next: Add {category === "singles" ? "players" : "teams"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
