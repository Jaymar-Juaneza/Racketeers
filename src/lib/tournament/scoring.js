// Badminton scoring rules: win by 2, with a hard cap.
//
//  15-point mode:  first to 15, win by 2, maximum score 17-15
//  21-point mode:  first to 21, win by 2, maximum score 30-29
//
// Valid example finals: 15-13, 21-19, 22-20, 23-21
// Invalid:             15-14, 21-20 (not a 2-point lead)

export const POINT_SYSTEMS = {
  15: { label: "15 Points", target: 15, cap: 17 },
  21: { label: "21 Points", target: 21, cap: 30 },
};

/**
 * Returns true if the two scores represent a finished, legal match.
 * @param {number} a
 * @param {number} b
 * @param {number} pointSystem 15 | 21
 */
export function isValidFinishedScore(a, b, pointSystem) {
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    a < 0 ||
    b < 0 ||
    a === b
  ) {
    return false;
  }

  const system = POINT_SYSTEMS[pointSystem];
  if (!system) return false;

  const winner = Math.max(a, b);
  const loser = Math.min(a, b);
  const diff = winner - loser;

  if (winner < system.target) return false; // nobody reached the target yet
  if (winner > system.cap) return false; // past the cap

  // Hard cap: 17 can only be reached as 17-15 (15-point), and 30 can only be
  // reached as 30-29 (21-point).
  if (winner === system.cap) {
    return pointSystem === 21
      ? loser === system.cap - 1
      : loser === system.cap - 2;
  }

  // Win by two.
  if (diff < 2) return false;

  // Once we go past the target (deuce), the game ends the moment a player
  // leads by exactly two — so beyond the target the lead is always exactly 2.
  if (winner > system.target && diff !== 2) {
    return false;
  }

  return true;
}

/**
 * Given a partial/finished score, produce the match status + winner id.
 * Returns { status, winnerId } where status is "scheduled" | "live" | "completed".
 * @param {number|null} scoreA
 * @param {number|null} scoreB
 * @param {string|null} winnerIdA id of participant A
 * @param {string|null} winnerIdB id of participant B
 * @param {number} pointSystem
 */
export function resolveScoreState(
  scoreA,
  scoreB,
  participantAId,
  participantBId,
  pointSystem,
) {
  const hasA = Number.isInteger(scoreA);
  const hasB = Number.isInteger(scoreB);

  if (!hasA && !hasB) return { status: "scheduled", winnerId: null };
  if (!hasA || !hasB) return { status: "live", winnerId: null };

  if (isValidFinishedScore(scoreA, scoreB, pointSystem)) {
    return {
      status: "completed",
      winnerId: scoreA > scoreB ? participantAId : participantBId,
    };
  }

  return { status: "live", winnerId: null };
}

/**
 * Human-readable reason a score is not (yet) a legal finished score.
 * Returns null when the score is valid.
 */
export function scoreError(scoreA, scoreB, pointSystem) {
  const hasA = Number.isInteger(scoreA);
  const hasB = Number.isInteger(scoreB);

  if (!hasA || !hasB) return "Enter both scores to finish the match.";
  if (scoreA === scoreB) return "Scores cannot be tied — a winner needs a 2-point lead.";
  if (scoreA < 0 || scoreB < 0) return "Scores cannot be negative.";

  const system = POINT_SYSTEMS[pointSystem];
  const winner = Math.max(scoreA, scoreB);
  const loser = Math.min(scoreA, scoreB);
  const diff = winner - loser;

  if (winner < system.target) {
    return `The winner must reach at least ${system.target} points.`;
  }
  if (winner > system.cap) {
    return `The maximum allowed score is ${system.cap}-${system.cap - (pointSystem === 21 ? 1 : 2)}.`;
  }
  if (winner === system.cap) {
    const maxLoser = pointSystem === 21 ? system.cap - 1 : system.cap - 2;
    if (loser !== maxLoser) {
      return `The only valid ${system.cap}-point finish is ${system.cap}-${maxLoser}.`;
    }
    return null;
  }
  if (diff < 2) {
    return `A match must be won by 2 points (e.g. ${system.target}-${system.target - 2}).`;
  }
  if (winner > system.target && diff !== 2) {
    return `Past ${system.target} points, the winning margin must be exactly 2.`;
  }
  return null;
}
