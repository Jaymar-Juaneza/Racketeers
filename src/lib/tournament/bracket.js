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

function totalRoundsFor(participantCount) {
  let teams = participantCount;
  let rounds = 0;
  while (teams > 1) {
    teams = Math.ceil(teams / 2);
    rounds += 1;
  }
  return rounds;
}

function createDynamicMatch({
  round,
  index,
  totalRounds,
  participantAId,
  participantBId,
  isBye,
  winnerId,
}) {
  const name = roundName(round, totalRounds);
  return {
    id: uid("m"),
    round,
    index,
    roundName: name,
    participantAId,
    participantBId,
    games: [],
    live: null,
    gamesToWin: name === "Final" ? FINALS_GAMES_TO_WIN : REGULAR_GAMES_TO_WIN,
    winnerId: winnerId ?? null,
    status: isBye ? "bye" : "scheduled",
    isBye: !!isBye,
    scheme: "dynamic",
  };
}

/**
 * Generate a single-elimination bracket that pairs every team whenever
 * possible. A bye is only used when a round has an odd number of remaining
 * teams — so with 6 teams everyone gets a first-round matchup (3 matches)
 * instead of two teams being parked on power-of-two byes.
 *
 * @param {Array<{id: string}>} participants
 * @param {"auto" | "random"} seeding
 * @returns {{ size: number, rounds: number, matches: Array }}
 */
export function generateBracket(participants, seeding = "auto") {
  const n = participants.length;
  if (n < 2) return { size: bracketSizeFor(n), rounds: 0, matches: [] };

  const ordered =
    seeding === "random" ? shuffle(participants) : [...participants];
  const totalRounds = totalRoundsFor(n);
  const matches = [];

  let advancing = n;
  let round = 1;

  while (advancing > 1) {
    const count = Math.ceil(advancing / 2);

    for (let i = 0; i < count; i += 1) {
      const hasOpponent = i * 2 + 1 < advancing;

      if (round === 1) {
        const a = ordered[i * 2];
        const b = hasOpponent ? ordered[i * 2 + 1] : null;
        matches.push(
          createDynamicMatch({
            round,
            index: i,
            totalRounds,
            participantAId: a.id,
            participantBId: b ? b.id : null,
            isBye: !b,
            winnerId: !b ? a.id : null,
          }),
        );
      } else {
        matches.push(
          createDynamicMatch({
            round,
            index: i,
            totalRounds,
            participantAId: null,
            participantBId: null,
            isBye: !hasOpponent,
            winnerId: null,
          }),
        );
      }
    }

    advancing = count;
    round += 1;
  }

  return {
    size: bracketSizeFor(n),
    rounds: totalRounds,
    matches: refreshBracket(matches),
  };
}

function refreshDynamicBracket(matches) {
  const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  if (maxRound <= 0) return [];

  const byRound = new Map();
  for (const m of matches) {
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round).push(m);
  }
  for (const list of byRound.values()) {
    list.sort((a, b) => a.index - b.index);
  }

  const result = [];

  for (let round = 1; round <= maxRound; round += 1) {
    const inRound = byRound.get(round) ?? [];

    if (round === 1) {
      for (const m of inRound) {
        if (m.isBye) {
          const playerId = m.participantAId ?? m.participantBId ?? null;
          result.push({
            ...m,
            participantAId: playerId,
            participantBId: null,
            winnerId: playerId,
            status: "bye",
            isBye: true,
          });
        } else {
          result.push({ ...m, isBye: false });
        }
      }
      continue;
    }

    const prev = result
      .filter((m) => m.round === round - 1)
      .sort((a, b) => a.index - b.index);
    const winners = prev.map((m) => m.winnerId ?? null);

    for (let i = 0; i < inRound.length; i += 1) {
      const m = inRound[i];
      const aId = winners[i * 2] ?? null;
      const bId = winners[i * 2 + 1] ?? null;

      if (m.isBye) {
        result.push({
          ...m,
          participantAId: aId,
          participantBId: null,
          winnerId: aId,
          status: "bye",
          games: [],
          live: null,
          isBye: true,
        });
        continue;
      }

      const changed =
        m.participantAId !== aId || m.participantBId !== bId;

      if (changed) {
        result.push({
          ...m,
          participantAId: aId,
          participantBId: bId,
          winnerId: null,
          status: "scheduled",
          games: [],
          live: null,
          isBye: false,
        });
      } else {
        result.push({ ...m, isBye: false });
      }
    }
  }

  return result;
}

/**
 * Legacy refresh for power-of-two brackets generated before the dynamic
 * bracket format. Kept so existing tournaments keep working as-is.
 */
function refreshPowerBracket(matches) {
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
            live: null,
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

/**
 * Derive participants for every round > 1 from the winners of the previous
 * round. Supports both the new dynamic bracket format and legacy power-of-two
 * brackets. If a matchup changes (e.g. an earlier result was edited or
 * reopened), the affected downstream match is reset.
 *
 * Pure: returns a new matches array.
 */
export function refreshBracket(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return [];
  if (matches.every((m) => m.scheme === "dynamic")) {
    return refreshDynamicBracket(matches);
  }
  return refreshPowerBracket(matches);
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
