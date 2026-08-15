/**
 * Helpers for participant display, parsing and validation.
 * Singles participants: { id, type: "player", name }
 * Doubles participants: { id, type: "team", name, player1, player2 }
 */

export function displayName(participant) {
  if (!participant) return "TBD";
  if (participant.type === "team") {
    const pair = [participant.player1, participant.player2]
      .filter(Boolean)
      .join(" & ");
    return pair || participant.name || "Unnamed team";
  }
  return participant.name || "Unnamed player";
}

export function subLabel(participant) {
  if (!participant) return "";
  return participant.type === "team" ? "" : "Singles";
}

/** Validate participant name(s) — no empty names, no duplicate names. */
export function participantErrors(existing, draft) {
  const errors = {};
  const name = (draft.name ?? "").trim();
  const player1 = (draft.player1 ?? "").trim();
  const player2 = (draft.player2 ?? "").trim();

  if (!name) errors.name = "Name is required.";

  if (draft.type === "team") {
    if (!player1) errors.player1 = "Player 1 is required.";
    if (!player2) errors.player2 = "Player 2 is required.";
    if (player1 && player2 && player1.toLowerCase() === player2.toLowerCase()) {
      errors.player2 = "Player 1 and Player 2 must be different.";
    }
  }

  const duplicate = existing.some((p) => {
    if (p.type === "team") {
      return (
        p.name.trim().toLowerCase() === name.toLowerCase() ||
        (p.player1?.trim().toLowerCase() === player1.toLowerCase() &&
          p.player2?.trim().toLowerCase() === player2.toLowerCase())
      );
    }
    return p.name.trim().toLowerCase() === name.toLowerCase();
  });

  if (duplicate) {
    errors.name = "This participant/team already exists.";
  }

  return errors;
}

/**
 * Parse a bulk list of participants from a single text field.
 *
 * Singles — one player per line.
 * Doubles — one pair per line, e.g. "Alice & Bob" (also accepts "," or "|").
 *
 * @param {string} raw
 * @param {"singles" | "doubles"} category
 * @returns {{ participants: Array, errors: string[] }}
 */
export function parseParticipants(raw, category) {
  const lines = String(raw ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const participants = [];
  const errors = [];
  const seen = new Set();

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (category === "doubles") {
      const parts = line
        .split(/\s*(?:&|,|\|)\s*/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (parts.length !== 2) {
        errors.push(
          `Line ${lineNo}: each entry needs exactly 2 players, e.g. "Alice & Bob".`,
        );
        return;
      }

      const [player1, player2] = parts;
      if (player1.toLowerCase() === player2.toLowerCase()) {
        errors.push(
          `Line ${lineNo}: "${player1}" can't partner with themselves.`,
        );
        return;
      }

      const key = [player1, player2].map((s) => s.toLowerCase()).sort().join("&");
      if (seen.has(key)) {
        errors.push(`Line ${lineNo}: duplicate pair "${player1} & ${player2}".`);
        return;
      }
      seen.add(key);
      participants.push({
        type: "team",
        name: `${player1} & ${player2}`,
        player1,
        player2,
      });
    } else {
      const name = line;
      const key = name.toLowerCase();
      if (seen.has(key)) {
        errors.push(`Line ${lineNo}: duplicate player "${name}".`);
        return;
      }
      seen.add(key);
      participants.push({ type: "player", name });
    }
  });

  return { participants, errors };
}

/** A blank draft entry for the participant editor (one input per name). */
export function newParticipantEntry(category) {
  return category === "doubles"
    ? { player1: "", player2: "" }
    : { name: "" };
}

/**
 * Validate and build participant records from draft entries produced by the
 * participant editor (separate input boxes instead of a single textarea).
 *
 * @param {Array<{name?: string, player1?: string, player2?: string}>} entries
 * @param {"singles" | "doubles"} category
 * @returns {{ participants: Array, errors: string[] }}
 */
export function validateEntries(entries, category) {
  const participants = [];
  const errors = [];
  const seen = new Set();

  (entries ?? []).forEach((entry, index) => {
    const row = index + 1;

    if (category === "doubles") {
      const p1 = String(entry?.player1 ?? "").trim();
      const p2 = String(entry?.player2 ?? "").trim();

      if (!p1 || !p2) {
        errors.push(`Team ${row}: both player names are required.`);
        return;
      }
      if (p1.toLowerCase() === p2.toLowerCase()) {
        errors.push(`Team ${row}: the two players must be different.`);
        return;
      }

      const key = [p1, p2].map((s) => s.toLowerCase()).sort().join("&");
      if (seen.has(key)) {
        errors.push(`Team ${row}: duplicate team "${p1} & ${p2}".`);
        return;
      }
      seen.add(key);

      participants.push({
        type: "team",
        name: `${p1} & ${p2}`,
        player1: p1,
        player2: p2,
      });
    } else {
      const name = String(entry?.name ?? "").trim();

      if (!name) {
        errors.push(`Player ${row}: name is required.`);
        return;
      }

      const key = name.toLowerCase();
      if (seen.has(key)) {
        errors.push(`Player ${row}: duplicate player "${name}".`);
        return;
      }
      seen.add(key);

      participants.push({ type: "player", name });
    }
  });

  return { participants, errors };
}
