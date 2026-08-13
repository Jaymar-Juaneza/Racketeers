/**
 * Helpers for participant display and validation.
 * Singles participants: { id, type: "player", name }
 * Doubles participants: { id, type: "team", name, player1, player2 }
 */

export function displayName(participant) {
  if (!participant) return "TBD";
  if (participant.type === "team") {
    return participant.name || "Unnamed team";
  }
  return participant.name || "Unnamed player";
}

export function subLabel(participant) {
  if (!participant) return "";
  if (participant.type === "team") {
    const players = [participant.player1, participant.player2]
      .filter(Boolean)
      .join(" & ");
    return players || "Team";
  }
  return "Singles";
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
