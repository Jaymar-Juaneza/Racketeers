import { Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { Input } from "./ui/input.jsx";
import { newParticipantEntry } from "../lib/participants.js";

/**
 * Controlled participant editor — one input box per name (no "&" or "," needed).
 *
 * Singles: one input per player.
 * Doubles: two inputs per team (Player 1 + Player 2).
 */
export function ParticipantEditor({ category, entries, onChange }) {
  const isDoubles = category === "doubles";

  const update = (index, patch) => {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const remove = (index) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...entries, newParticipantEntry(category)]);
  };

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, index) => (
        <div key={index} className="rounded-lg border border-line bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              {isDoubles ? `Team ${index + 1}` : `Player ${index + 1}`}
            </span>
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-md p-1 text-muted hover:bg-red-50 hover:text-accent"
              aria-label={`Remove ${isDoubles ? "team" : "player"} ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {isDoubles ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={entry.player1}
                onChange={(e) => update(index, { player1: e.target.value })}
                placeholder="Player 1 name"
                aria-label={`Team ${index + 1} player 1`}
              />
              <Input
                value={entry.player2}
                onChange={(e) => update(index, { player2: e.target.value })}
                placeholder="Player 2 name"
                aria-label={`Team ${index + 1} player 2`}
              />
            </div>
          ) : (
            <Input
              value={entry.name}
              onChange={(e) => update(index, { name: e.target.value })}
              placeholder="Player name"
              aria-label={`Player ${index + 1} name`}
            />
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="self-start"
      >
        <Plus className="h-4 w-4" />
        {isDoubles ? "Add team" : "Add player"}
      </Button>
    </div>
  );
}
