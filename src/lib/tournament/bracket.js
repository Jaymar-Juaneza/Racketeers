import { uid } from "../utils.js";

export const SUPPORTED_BRACKET_SIZES = [4, 8, 16, 32, 64];

export function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function bracketSizeFor(participantCount) {
  return nextPowerOfTwo(Math.max(participantCount, 4));
}

export function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Standard tournament seeding order for a power-of-two bracket, e.g.
 *   8  -> [1, 8, 4, 5, 2, 7, 3, 6]
 *   16 -> [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]
 */
export function seedOrder(size) {
  let order = [1];
  let s = 1;
  while (s < size) {
    const next = [];
    for (const x of order) {
      next.push(x);
      next.push(s * 2 + 1 - x);
    }
    order = next;
    s *= 2;
  }
  return order;
}

function roundName(round, totalRounds) {
  const remaining = totalRounds - round; // 0 = final
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semifinals";
  if (remaining === 2) return "Quarterfinals";
  return `Round of ${2 ** (remaining + 1)}`;
}

// Series ("best of") rules for bracket matches:
//   Regular rounds — best of 3 (first to 2 wins)
//   Final round    — best of 5 (first to 3 wins)
export const REGULAR_GAMES_TO_WIN = 2;
export const FINALS_GAMES_TO_WIN = 3;

export function gamesToWin(match) {
  if (typeof match?.gamesToWin === "number") return match.gamesToWin;
  return match?.roundName === "Final"
    ? FINALS_GAMES_TO_WIN
    : REGULAR_GAMES_TO_WIN;
}

export function bestOfLabel(match) {
  return `Best of ${gamesToWin(match) * 2 - 1}`;
}

export function firstToLabel(match) {
  return `First to ${gamesToWin(match)} wins`;
}

/** Count games won by each side from the recorded games array. */
export function seriesScore(match) {
  const games = Array.isArray(match?.games) ? match.games : [];
  let a = 0;
  let b = 0;
  for (const g of games) {
    if (g.scoreA > g.scoreB) a += 1;
    else if (g.scoreB > g.scoreA) b += 1;
  }
  return { a, b };
}

/**
 * Derive the series state (status, winner, games won) from the games array.
 * A side wins the moment it reaches `gamesToWin` — so 2-0 or 3-0 closes the
 * series early ("wins in a row" automatically ends the match).
 */
export function resolveSeries(match) {
  const { a, b } = seriesScore(match);
  const toWin = gamesToWin(match);
  const played = Array.isArray(match?.games) ? match.games.length : 0;

  let status = played > 0 ? "live" : "scheduled";
  let winnerId = null;

  if (a >= toWin || b >= toWin) {
    status = "completed";
    winnerId = a > b ? match.participantAId : match.participantBId;
  }

  return {
    status,
    winnerId,
    seriesScoreA: a,
    seriesScoreB: b,
    gamesToWin: toWin,
  };
}

/**
 * Generate a single-elimination bracket with auto-seeding and BYEs.
 *
 * @param {Array<{id: string}>} participants
 * @param {"auto" | "random"} seeding
 * @returns {{ size: number, rounds: number, matches: Array }}
 */
export function generateBracket(participants, seeding = "auto") {
  const n = participants.length;
  const size = bracketSizeFor(n);
  const rounds = Math.log2(size);

  const ordered =
    seeding === "random" ? shuffle(participants) : [...participants];
  const seedToParticipant = new Map();
  ordered.forEach((p, i) => seedToParticipant.set(i + 1, p));

  const order = seedOrder(size);
  const slots = order.map((seed) =>
    seed <= n ? seedToParticipant.get(seed) : null,
  );

  const matches = [];

  // Round 1 — filled from seed slots; missing slots are BYEs.
  for (let i = 0; i < size / 2; i += 1) {
    const a = slots[i * 2];
    const b = slots[i * 2 + 1];
    if (!a && !b) continue;

    if (!a || !b) {
      const player = a || b;
      matches.push({
        id: uid("m"),
        round: 1,
        index: i,
        roundName: roundName(1, rounds),
        participantAId: a ? a.id : null,
        participantBId: b ? b.id : null,
        games: [],
        gamesToWin: roundName(1, rounds) === "Final" ? 3 : 2,
        winnerId: player.id,
        status: "bye",
        isBye: true,
      });
    } else {
      matches.push({
        id: uid("m"),
        round: 1,
        index: i,
        roundName: roundName(1, rounds),
        participantAId: a.id,
        participantBId: b.id,
        games: [],
        gamesToWin: roundName(1, rounds) === "Final" ? 3 : 2,
        winnerId: null,
        status: "scheduled",
        isBye: false,
      });
    }
  }

  // Later rounds — participants are derived from winners.
  for (let round = 2; round <= rounds; round += 1) {
    const count = size / 2 ** round;
    for (let i = 0; i < count; i += 1) {
      matches.push({
        id: uid("m"),
        round,
        index: i,
        roundName: roundName(round, rounds),
        participantAId: null,
        participantBId: null,
        games: [],
        gamesToWin: roundName(round, rounds) === "Final" ? 3 : 2,
        winnerId: null,
        status: "scheduled",
        isBye: false,
      });
    }
  }

  return { size, rounds, matches: refreshBracket(matches) };
}

/**
 * Derive participants for every round > 1 from the winners of the previous
 * round. If a matchup changes (e.g. an earlier result was edited or reopened),
 * the affected downstream match is reset.
 *
 * Pure: returns a new matches array.
 */
export function refreshBracket(matches) {
  const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);

  const result = [];
  // Built incrementally so cascading resets propagate round by round.
  const resultMap = new Map();

  for (let round = 1; round <= maxRound; round += 1) {
    const inRound = matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.index - b.index);

    for (const m of inRound) {
      let next = { ...m };

      if (round > 1 && !m.isBye) {
        const prevA = resultMap.get(`${round - 1}:${m.index * 2}`);
        const prevB = resultMap.get(`${round - 1}:${m.index * 2 + 1}`);
        const aId = prevA?.winnerId ?? null;
        const bId = prevB?.winnerId ?? null;

        const changed =
          m.participantAId !== aId || m.participantBId !== bId;

        if (changed) {
          next = {
            ...m,
            participantAId: aId,
            participantBId: bId,
            games: [],
            winnerId: null,
            status: "scheduled",
          };
        }
      }

      result.push(next);
      resultMap.set(`${next.round}:${next.index}`, next);
    }
  }
  return result;
}

/** Winner of the final match, if it has been decided. */
export function championOf(matches) {
  const finalMatch = matches.find(
    (m) => m.roundName === "Final" && m.status === "completed",
  );
  return finalMatch?.winnerId ?? null;
}

/** Group bracket matches by round (ascending) for rendering. */
export function groupByRound(matches) {
  const rounds = new Map();
  for (const m of matches) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round).push(m);
  }
  return [...rounds.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) => list.sort((a, b) => a.index - b.index));
}
