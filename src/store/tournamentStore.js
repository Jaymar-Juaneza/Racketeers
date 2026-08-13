import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "../lib/utils.js";
import { generateRoundRobinMatches } from "../lib/tournament/roundRobin.js";
import {
  generateBracket,
  refreshBracket,
  resolveSeries,
} from "../lib/tournament/bracket.js";
import { resolveScoreState } from "../lib/tournament/scoring.js";

export const useTournamentStore = create(
  persist(
    (set) => ({
      tournaments: [],
      activeTournamentId: null,

      createTournament: ({ name, category, format, pointSystem, seeding }) => {
        const id = uid("t");
        const tournament = {
          id,
          name: name?.trim() || "Untitled Tournament",
          category, // "singles" | "doubles"
          format, // "round-robin" | "bracket"
          pointSystem: Number(pointSystem), // 15 | 21
          seeding: format === "bracket" ? seeding ?? "auto" : null,
          participants: [],
          matches: [],
          status: "setup", // setup | active | complete
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          tournaments: [tournament, ...state.tournaments],
          activeTournamentId: id,
        }));
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
      },

      addParticipant: (tournamentId, participant) => {
        const record = {
          ...participant,
          id: uid("p"),
        };
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? { ...t, participants: [...t.participants, record] }
              : t,
          ),
        }));
        return record;
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
                status: "scheduled",
                isBye: false,
              }));
            } else {
              matches = generateBracket(t.participants, t.seeding).matches;
            }

            return { ...t, matches, status: "active" };
          }),
        }));
      },

      saveScore: (tournamentId, matchId, scoreA, scoreB) => {
        set((state) => ({
          tournaments: state.tournaments.map((t) => {
            if (t.id !== tournamentId) return t;

            const matches = t.matches.map((m) => {
              if (m.id !== matchId) return m;
              const { status, winnerId } = resolveScoreState(
                scoreA,
                scoreB,
                m.participantAId,
                m.participantBId,
                t.pointSystem,
              );
              return { ...m, scoreA, scoreB, status, winnerId };
            });

            const resolved =
              t.format === "bracket" ? refreshBracket(matches) : matches;

            return { ...t, matches: resolved };
          }),
        }));
      },

      recordGame: (tournamentId, matchId, scoreA, scoreB) => {
        set((state) => ({
          tournaments: state.tournaments.map((t) => {
            if (t.id !== tournamentId || t.format !== "bracket") return t;

            const matches = t.matches.map((m) => {
              if (m.id !== matchId || m.status === "bye" || m.status === "completed") {
                return m;
              }
              const games = [
                ...(Array.isArray(m.games) ? m.games : []),
                { id: uid("g"), scoreA, scoreB },
              ];
              const { status, winnerId } = resolveSeries({ ...m, games });
              return { ...m, games, status, winnerId };
            });

            return { ...t, matches: refreshBracket(matches) };
          }),
        }));
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
              return { ...m, games, status, winnerId };
            });

            return { ...t, matches: refreshBracket(matches) };
          }),
        }));
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
      },
    }),
    {
      name: "atsi-racketeers-tournaments",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState ?? {};
        const tournaments = (state.tournaments ?? []).map((t) => {
          if (t.format !== "bracket") return t;
          const matches = (t.matches ?? []).map((m) => {
            if (Array.isArray(m.games)) return m;
            const isBye = m.status === "bye";
            return {
              ...m,
              games: [],
              gamesToWin: m.roundName === "Final" ? 3 : 2,
              status: isBye ? "bye" : "scheduled",
              winnerId: isBye ? m.winnerId : null,
            };
          });
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
