// Badminton scoring rules: win by 2, with no upper cap.
//
//  15-point mode:  first to 15, win by 2 — no maximum score.
//  21-point mode:  first to 21, win by 2 — no maximum score.
//
// Valid example finishes: 15-13, 21-19, 22-20, 25-23, 30-28, 35-33
// Invalid:               15-14, 21-20, 21-19 (not a 2-point lead)

export const POINT_SYSTEMS = {
  15: { label: "15 Points", target: 15 },
  21: { label: "21 Points", target: 21 },
};

/**
 * Returns true if the two scores represent a finished, legal match.
 * A match is finished when the winner has reached the target points AND leads
 * by at least 2. There is no upper limit.
 *
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

  if (winner < system.target) return false; // nobody reached the target yet

  return winner - loser >= 2; // win by two, no cap
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
  if (diff < 2) {
    return "A match must be won by a 2-point lead.";
  }
  return null;
}
