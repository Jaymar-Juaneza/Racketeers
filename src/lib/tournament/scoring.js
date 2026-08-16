// Badminton scoring rules (BWF-style):
//
//   21-point mode:  first to 21, win by 2 — capped at 30.
//                   If the score reaches 29-29, the next point wins (30-29).
//   15-point mode:  first to 15, win by 2 — no upper cap (legacy option).
//
// Valid example finishes (21-point): 21-15, 22-20, 29-27, 30-28, 30-29
// Invalid (21-point):                21-20, 22-21, 29-28, 30-27, 31-29

export const POINT_SYSTEMS = {
  15: { label: "15 Points", target: 15, max: null },
  21: { label: "21 Points", target: 21, max: 30 },
};

/**
 * Human-readable description of the point system used on match cards.
 * @param {number} pointSystem 15 | 21
 */
export function pointSystemDescription(pointSystem) {
  const system = POINT_SYSTEMS[pointSystem];
  if (!system) return "";
  return system.max
    ? `First to ${system.target} · win by 2 · ${system.max}-point cap`
    : `First to ${system.target} · win by 2 (no cap)`;
}

/**
 * The maximum points allowed in a single game, or null when uncapped.
 * @param {number} pointSystem 15 | 21
 */
export function scoreCap(pointSystem) {
  return POINT_SYSTEMS[pointSystem]?.max ?? null;
}

/**
 * Returns true if the two scores represent a finished, legal game.
 *
 * For the 21-point system a game ends when:
 *   - a side reaches 21 with a 2-point lead, or
 *   - a side reaches 30 (only reachable as 30-29 or 30-28).
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

  if (system.max != null) {
    if (winner > system.max) return false;
    if (winner === system.max) {
      // A capped game can only finish 30-29 (next point after 29-29)
      // or 30-28 (a two-point lead that also hits the cap).
      return loser >= system.max - 2;
    }
  }

  return winner >= system.target && winner - loser >= 2;
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
 * Which side(s) are one point away from winning the game (match point).
 * Returns an array containing "A", "B", or both — e.g. at 29-29 both sides
 * have match point. Returns [] when there is no match point.
 *
 * @param {number|null} scoreA
 * @param {number|null} scoreB
 * @param {number} pointSystem
 */
export function getMatchPointSides(scoreA, scoreB, pointSystem) {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) return [];

  const sides = [];
  if (isValidFinishedScore(scoreA + 1, scoreB, pointSystem)) sides.push("A");
  if (isValidFinishedScore(scoreB + 1, scoreA, pointSystem)) sides.push("B");
  return sides;
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

  if (system.max != null && winner > system.max) {
    return `Scores are capped at ${system.max} points.`;
  }

  if (system.max != null && winner === system.max && loser < system.max - 2) {
    return `A ${system.max}-point game must finish ${system.max}-${system.max - 2} or ${system.max}-${system.max - 1}.`;
  }

  if (isValidFinishedScore(scoreA, scoreB, pointSystem)) return null;

  if (winner < system.target) {
    return `The winner must reach at least ${system.target} points.`;
  }

  if (system.max != null && winner === system.max - 1 && diff === 1) {
    return `At ${system.max - 1}-${system.max - 1} the next point wins ${system.max}.`;
  }

  if (diff < 2) {
    return "A match must be won by a 2-point lead.";
  }
  return null;
}
