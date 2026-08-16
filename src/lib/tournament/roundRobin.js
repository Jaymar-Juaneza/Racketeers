import { uid } from "../utils.js";

/**
 * Generate a single round-robin schedule where every participant plays every
 * other participant exactly once (circle method). An odd number of
 * participants produces one explicit bye match each round so every team is
 * always represented on the schedule.
 *
 * @param {Array<{id: string}>} participants
 * @returns {Array<{id: string, round: number, roundName: string, participantAId: string, participantBId: string|null, isBye: boolean}>}
 */
export function generateRoundRobinMatches(participants) {
  const n = participants.length;
  if (n < 2) return [];

  const ids = participants.map((p) => p.id);
  const odd = n % 2 === 1;
  // A "bye" sentinel makes the count even so the circle method works cleanly.
  const slots = odd ? [...ids, null] : [...ids];
  const slotCount = slots.length;
  const totalRounds = slotCount - 1;

  const matches = [];

  for (let round = 0; round < totalRounds; round += 1) {
    const roundNumber = round + 1;
    for (let i = 0; i < slotCount / 2; i += 1) {
      const a = slots[i];
      const b = slots[slotCount - 1 - i];

      if (a === null || b === null) {
        // Explicit bye so the team without an opponent is still shown.
        const player = a ?? b;
        matches.push({
          id: uid("m"),
          round: roundNumber,
          roundName: `Round ${roundNumber}`,
          participantAId: player,
          participantBId: null,
          isBye: true,
        });
        continue;
      }

      matches.push({
        id: uid("m"),
        round: roundNumber,
        roundName: `Round ${roundNumber}`,
        participantAId: a,
        participantBId: b,
        isBye: false,
      });
    }

    // Rotate: keep slots[0] fixed, shift everything else by one.
    slots.splice(1, 0, slots.pop());
  }

  return matches;
}

/**
 * Compute round-robin standings with the PRD ranking order:
 *   1. Wins (desc)
 *   2. Head-to-head result (two-way ties only)
 *   3. Point difference (desc)
 *   4. Total points scored (desc)
 *
 * @param {Array<{id: string}>} participants
 * @param {Array<{participantAId: string, participantBId: string, scoreA: number|null, scoreB: number|null, winnerId: string|null}>} matches
 */
export function computeStandings(participants, matches) {
  const stats = new Map();

  for (const p of participants) {
    stats.set(p.id, {
      participantId: p.id,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifference: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== "completed") continue;

    const a = stats.get(match.participantAId);
    const b = stats.get(match.participantBId);
    if (!a || !b) continue;

    a.pointsFor += match.scoreA;
    a.pointsAgainst += match.scoreB;
    b.pointsFor += match.scoreB;
    b.pointsAgainst += match.scoreA;

    if (match.winnerId === match.participantAId) {
      a.wins += 1;
      b.losses += 1;
    } else if (match.winnerId === match.participantBId) {
      b.wins += 1;
      a.losses += 1;
    }
  }

  for (const row of stats.values()) {
    row.pointDifference = row.pointsFor - row.pointsAgainst;
  }

  const rows = [...stats.values()];

  // Head-to-head lookup: did these two play, and who won?
  const headToHead = new Map();
  for (const match of matches) {
    if (match.status !== "completed") continue;
    const key = [match.participantAId, match.participantBId].sort().join("|");
    headToHead.set(key, match.winnerId);
  }

  const h2hKey = (x, y) => [x, y].sort().join("|");
  const h2hWinner = (x, y) => {
    const key = h2hKey(x, y);
    return headToHead.get(key) ?? null;
  };

  // Group by wins, resolve two-way ties with head-to-head, then fall back to
  // point difference and points scored.
  rows.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (y.pointDifference !== x.pointDifference) {
      return y.pointDifference - x.pointDifference;
    }
    return y.pointsFor - x.pointsFor;
  });

  // Apply head-to-head only within groups of exactly two tied participants.
  const result = [];
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j < rows.length && rows[j].wins === rows[i].wins) j += 1;

    const group = rows.slice(i, j);
    if (group.length === 2) {
      const winner = h2hWinner(group[0].participantId, group[1].participantId);
      if (winner === group[1].participantId) {
        group.reverse();
      }
    }
    result.push(...group);
    i = j;
  }

  return result.map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Find the current leader of a round-robin tournament.
 */
export function getLeader(standings) {
  return standings.length > 0 ? standings[0] : null;
}
