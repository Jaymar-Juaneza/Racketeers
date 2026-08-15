import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { displayName } from "./participants.js";
import { useAuthStore } from "../store/authStore.js";

/**
 * Game history logging.
 *
 * Tournaments now live locally (Zustand + localStorage). Firebase is used only
 * to keep a permanent, append-only log of every finished game / match result.
 *
 * Collection: `game_logs` — one document per recorded game.
 */

const HISTORY_COLLECTION = "game_logs";

function nameOf(participant) {
  return participant ? displayName(participant) : null;
}

/**
 * Append one game result to the Firestore history log.
 *
 * @param {object} args
 * @param {object} args.tournament   Tournament record (with participants array)
 * @param {object} args.match        Match that produced this result
 * @param {number} args.scoreA       Points scored by participant A
 * @param {number} args.scoreB       Points scored by participant B
 * @param {number|null} [args.gameNumber]  1-based game index (bracket series only)
 * @param {number|null} [args.seriesScoreA] Games won by A so far (bracket only)
 * @param {number|null} [args.seriesScoreB] Games won by B so far (bracket only)
 */
export function logGameResult({
  tournament,
  match,
  scoreA,
  scoreB,
  gameNumber = null,
  seriesScoreA = null,
  seriesScoreB = null,
}) {
  const participantA = tournament.participants.find(
    (p) => p.id === match.participantAId,
  );
  const participantB = tournament.participants.find(
    (p) => p.id === match.participantBId,
  );
  const winner =
    match.winnerId === match.participantAId
      ? participantA
      : match.winnerId === match.participantBId
        ? participantB
        : null;

  const entry = {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    category: tournament.category,
    format: tournament.format,
    pointSystem: tournament.pointSystem,
    round: match.round ?? null,
    roundName: match.roundName ?? null,
    matchId: match.id,
    playerAId: participantA?.id ?? null,
    playerAName: nameOf(participantA),
    playerBId: participantB?.id ?? null,
    playerBName: nameOf(participantB),
    scoreA,
    scoreB,
    winnerId: match.winnerId ?? null,
    winnerName: nameOf(winner),
    gameNumber,
    seriesScoreA,
    seriesScoreB,
    recordedBy: useAuthStore.getState().user?.uid ?? null,
    recordedAt: serverTimestamp(),
    recordedAtIso: new Date().toISOString(),
  };

  return addDoc(collection(db, HISTORY_COLLECTION), entry).catch((err) => {
    console.error("Failed to write game history:", err);
  });
}
