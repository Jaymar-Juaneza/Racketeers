import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "../lib/utils.js";
import { generateRoundRobinMatches } from "../lib/tournament/roundRobin.js";
import { generateBracket, refreshBracket } from "../lib/tournament/bracket.js";
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

      reopenMatch: (tournamentId, matchId) => {
        set((state) => ({
          tournaments: state.tournaments.map((t) => {
            if (t.id !== tournamentId) return t;

            const matches = t.matches.map((m) =>
              m.id === matchId
                ? {
                    ...m,
                    scoreA: null,
                    scoreB: null,
                    winnerId: null,
                    status: "scheduled",
                  }
                : m,
            );

            const resolved =
              t.format === "bracket" ? refreshBracket(matches) : matches;

            return { ...t, matches: resolved };
          }),
        }));
      },
    }),
    {
      name: "atsi-racketeers-tournaments",
    },
  ),
);

export function selectTournament(state, id) {
  return state.tournaments.find((t) => t.id === id) ?? null;
}
