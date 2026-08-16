import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "../lib/utils.js";
import { generateRoundRobinMatches } from "../lib/tournament/roundRobin.js";
import {
  generateBracket,
  refreshBracket,
  resolveSeries,
} from "../lib/tournament/bracket.js";
import {
  isValidFinishedScore,
  resolveScoreState,
  scoreCap,
} from "../lib/tournament/scoring.js";
import { logGameResult } from "../lib/history.js";
import { db } from "../lib/firebase.js";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { useAuthStore } from "./authStore.js";

/* ------------------------------------------------------------------ */
/* Firestore mapping helpers                                           */
/* ------------------------------------------------------------------ */

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    format: row.format,
    pointSystem: row.pointSystem,
    seeding: row.seeding ?? null,
    participants: Array.isArray(row.participants) ? row.participants : [],
    matches: Array.isArray(row.matches) ? row.matches : [],
    status: row.status,
    createdAt: row.createdAt,
  };
}

/**
 * Publish the current tournament state to Firestore so spectators can view it
 * live from any device. The permanent history is written separately to
 * `game_logs` (see lib/history.js).
 */
function syncTournament(tournament) {
  const userId = useAuthStore.getState().user?.uid ?? null;
  const ref = doc(db, "tournaments", tournament.id);
  return setDoc(ref, {
    name: tournament.name,
    category: tournament.category,
    format: tournament.format,
    pointSystem: tournament.pointSystem,
    seeding: tournament.seeding ?? null,
    participants: tournament.participants,
    matches: tournament.matches,
    status: tournament.status,
    createdBy: userId,
    createdAt: tournament.createdAt,
  });
}

/**
 * Live, local-first tournament store.
 *
 * - Admin device: edits the local state and publishes it to Firestore.
 * - Spectator devices: read the live state from Firestore (read-only UI).
 * - `game_logs` keeps an append-only history of every finished game.
 */
let liveListenerAttached = false;

export const useTournamentStore = create(
  persist(
    (set, get) => {
      const syncById = (tournamentId) => {
        const tournament = get().tournaments.find((t) => t.id === tournamentId);
        if (tournament) {
          syncTournament(tournament).catch((err) =>
            console.error("Firestore sync failed:", err),
          );
        }
      };

      return {
        tournaments: [],
        activeTournamentId: null,

        /**
         * Subscribe to the live tournament state in Firestore. Updates stream
         * in automatically for spectators (and other admins) as scores change.
         */
        subscribeTournaments: () => {
          if (liveListenerAttached) return;
          liveListenerAttached = true;

          const q = query(
            collection(db, "tournaments"),
            orderBy("createdAt", "desc"),
          );
          onSnapshot(
            q,
            (snap) => {
              const tournaments = snap.docs.map((d) =>
                mapRow({ id: d.id, ...d.data() }),
              );
              set({
                tournaments,
                activeTournamentId: tournaments[0]?.id ?? null,
              });
            },
            (err) => {
              console.error("Failed to load tournaments:", err);
            },
          );
        },

        createTournament: ({
          name,
          category,
          format,
          pointSystem,
          seeding,
          participants = [],
        }) => {
          const id = uid("t");
          const now = new Date();

          // Auto-name from the current date + time the tournament took place.
          const label = category === "doubles" ? "Doubles" : "Singles";
          const stamp = now.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          const autoName = `${label} · ${stamp}`;

          const records = participants.map((p) => ({ ...p, id: uid("p") }));

          const tournament = {
            id,
            name: name?.trim() || autoName,
            category,
            format,
            pointSystem: Number(pointSystem),
            seeding: format === "bracket" ? seeding ?? "auto" : null,
            participants: records,
            matches: [],
            status: records.length >= 2 ? "active" : "setup",
            createdAt: now.toISOString(),
          };

          if (records.length >= 2) {
            if (format === "round-robin") {
              tournament.matches = generateRoundRobinMatches(records).map(
                (m) => ({
                  ...m,
                  scoreA: null,
                  scoreB: null,
                  winnerId: null,
                  status: m.isBye ? "bye" : "scheduled",
                  isBye: m.isBye ?? false,
                }),
              );
            } else {
              tournament.matches = generateBracket(
                records,
                tournament.seeding,
              ).matches;
            }
          }

          set((state) => ({
            tournaments: [tournament, ...state.tournaments],
            activeTournamentId: id,
          }));

          syncTournament(tournament).catch((err) =>
            console.error("Firestore sync failed:", err),
          );

          return id;
        },

        deleteTournament: (tournamentId) => {
          set((state) => ({
            tournaments: state.tournaments.filter((t) => t.id !== tournamentId),
            activeTournamentId:
              state.activeTournamentId === tournamentId
                ? null
                : state.activeTournamentId,
          }));

          deleteDoc(doc(db, "tournaments", tournamentId)).catch((err) =>
            console.error("Firestore delete failed:", err),
          );
        },

        addParticipant: (tournamentId, participant) => {
          const record = { ...participant, id: uid("p") };
          set((state) => ({
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId
                ? { ...t, participants: [...t.participants, record] }
                : t,
            ),
          }));
          syncById(tournamentId);
          return record;
        },

        addParticipants: (tournamentId, participants) => {
          const records = participants.map((p) => ({ ...p, id: uid("p") }));
          set((state) => ({
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId
                ? { ...t, participants: [...t.participants, ...records] }
                : t,
            ),
          }));
          syncById(tournamentId);
          return records;
        },

        removeParticipant: (tournamentId, participantId) => {
          set((state) => ({
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId
                ? {
                    ...t,
                    participants: t.participants.filter(
                      (p) => p.id !== participantId,
                    ),
                  }
                : t,
            ),
          }));
          syncById(tournamentId);
        },

        generateMatches: (tournamentId) => {
          set((state) => ({
            tournaments: state.tournaments.map((t) => {
              if (t.id !== tournamentId) return t;

              let matches;
              if (t.format === "round-robin") {
                matches = generateRoundRobinMatches(t.participants).map((m) => ({
                  ...m,
                  scoreA: null,
                  scoreB: null,
                  winnerId: null,
                  status: m.isBye ? "bye" : "scheduled",
                  isBye: m.isBye ?? false,
                }));
              } else {
                matches = generateBracket(t.participants, t.seeding).matches;
              }

              return { ...t, matches, status: "active" };
            }),
          }));
          syncById(tournamentId);
        },

        incrementScore: (tournamentId, matchId, side, delta) => {
          const tournament = get().tournaments.find((t) => t.id === tournamentId);
          if (!tournament) return;

          let logEntry = null;
          let nextTournament;

          if (tournament.format === "round-robin") {
            const cap = scoreCap(tournament.pointSystem) ?? Infinity;
            const matches = tournament.matches.map((m) => {
              if (m.id !== matchId || m.status === "bye" || m.status === "completed") {
                return m;
              }
              const scoreA = Math.min(
                cap,
                Math.max(0, (m.scoreA ?? 0) + (side === "A" ? delta : 0)),
              );
              const scoreB = Math.min(
                cap,
                Math.max(0, (m.scoreB ?? 0) + (side === "B" ? delta : 0)),
              );
              const { status, winnerId } = resolveScoreState(
                scoreA,
                scoreB,
                m.participantAId,
                m.participantBId,
                tournament.pointSystem,
              );
              const next = { ...m, scoreA, scoreB, status, winnerId };
              if (status === "completed") {
                logEntry = { match: next, scoreA, scoreB };
              }
              return next;
            });
            nextTournament = { ...tournament, matches };
          } else {
            const cap = scoreCap(tournament.pointSystem) ?? Infinity;
            const matches = tournament.matches.map((m) => {
              if (m.id !== matchId || m.status === "bye" || m.status === "completed") {
                return m;
              }
              const live = m.live ?? { scoreA: 0, scoreB: 0 };
              const scoreA = Math.min(
                cap,
                Math.max(0, (live.scoreA ?? 0) + (side === "A" ? delta : 0)),
              );
              const scoreB = Math.min(
                cap,
                Math.max(0, (live.scoreB ?? 0) + (side === "B" ? delta : 0)),
              );

              if (isValidFinishedScore(scoreA, scoreB, tournament.pointSystem)) {
                const games = [
                  ...(Array.isArray(m.games) ? m.games : []),
                  { id: uid("g"), scoreA, scoreB },
                ];
                const { status, winnerId, seriesScoreA, seriesScoreB } = resolveSeries({
                  ...m,
                  games,
                });
                const nextLive = status === "completed" ? null : { scoreA: 0, scoreB: 0 };
                const next = { ...m, games, live: nextLive, status, winnerId };
                logEntry = {
                  match: next,
                  scoreA,
                  scoreB,
                  gameNumber: games.length,
                  seriesScoreA,
                  seriesScoreB,
                };
                return next;
              }

              return { ...m, live: { scoreA, scoreB }, status: "live" };
            });
            nextTournament = { ...tournament, matches: refreshBracket(matches) };
          }

          set((state) => ({
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId ? nextTournament : t,
            ),
          }));

          syncTournament(nextTournament).catch((err) =>
            console.error("Firestore sync failed:", err),
          );

          if (logEntry) {
            logGameResult({
              tournament: nextTournament,
              match: logEntry.match,
              scoreA: logEntry.scoreA,
              scoreB: logEntry.scoreB,
              gameNumber: logEntry.gameNumber ?? null,
              seriesScoreA: logEntry.seriesScoreA ?? null,
              seriesScoreB: logEntry.seriesScoreB ?? null,
            });
          }
        },

        undoGame: (tournamentId, matchId) => {
          set((state) => ({
            tournaments: state.tournaments.map((t) => {
              if (t.id !== tournamentId || t.format !== "bracket") return t;

              const matches = t.matches.map((m) => {
                if (m.id !== matchId || m.status === "bye") return m;
                const games = Array.isArray(m.games)
                  ? m.games.slice(0, -1)
                  : [];
                const { status, winnerId } = resolveSeries({ ...m, games });
                return { ...m, games, live: null, status, winnerId };
              });

              return { ...t, matches: refreshBracket(matches) };
            }),
          }));
          syncById(tournamentId);
        },

        reopenMatch: (tournamentId, matchId) => {
          set((state) => ({
            tournaments: state.tournaments.map((t) => {
              if (t.id !== tournamentId) return t;

              const matches = t.matches.map((m) => {
                if (m.id !== matchId) return m;
                if (t.format === "bracket") {
                  return {
                    ...m,
                    games: [],
                    live: null,
                    winnerId: null,
                    status: "scheduled",
                  };
                }
                return {
                  ...m,
                  scoreA: null,
                  scoreB: null,
                  winnerId: null,
                  status: "scheduled",
                };
              });

              const resolved =
                t.format === "bracket" ? refreshBracket(matches) : matches;

              return { ...t, matches: resolved };
            }),
          }));
          syncById(tournamentId);
        },
      };
    },
    {
      name: "atsi-racketeers-tournaments",
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState ?? {};
        const tournaments = (state.tournaments ?? []).map((t) => {
          if (t.format !== "bracket") return t;

          const matches = (t.matches ?? []).map((m) => ({
            ...m,
            games: Array.isArray(m.games) ? m.games : [],
            gamesToWin: m.gamesToWin ?? (m.roundName === "Final" ? 3 : 2),
            live: m.live ?? null,
            status: m.status ?? "scheduled",
            winnerId: m.winnerId ?? null,
          }));

          const isLegacyPowerBracket =
            matches.length > 0 && !matches.every((m) => m.scheme === "dynamic");
          const hasProgress = matches.some(
            (m) => m.status === "completed" || m.status === "live",
          );

          // Fresh legacy brackets are safely regenerated into the new dynamic
          // format so teams are paired whenever possible. Brackets with
          // recorded results are left untouched to avoid losing scores.
          if (isLegacyPowerBracket && !hasProgress) {
            return {
              ...t,
              matches: generateBracket(
                Array.isArray(t.participants) ? t.participants : [],
                t.seeding,
              ).matches,
            };
          }

          return { ...t, matches };
        });
        return { ...state, tournaments };
      },
    },
  ),
);

export function selectTournament(state, id) {
  return state.tournaments.find((t) => t.id === id) ?? null;
}
