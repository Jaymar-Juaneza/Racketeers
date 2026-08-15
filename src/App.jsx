import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { useAuthStore } from "./store/authStore.js";
import { useTournamentStore } from "./store/tournamentStore.js";
import LoginPage from "./pages/LoginPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import CreateTournamentPage from "./pages/CreateTournamentPage.jsx";
import ParticipantsPage from "./pages/ParticipantsPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import MatchesPage from "./pages/MatchesPage.jsx";
import StandingsPage from "./pages/StandingsPage.jsx";
import BracketPage from "./pages/BracketPage.jsx";

export default function App() {
  useEffect(() => {
    // Restore any existing admin session on first load (no redirects — the
    // dashboard is public, admins just get management controls).
    useAuthStore.getState().init();
    // Subscribe to the live tournament state from Firestore for everyone.
    useTournamentStore.getState().subscribeTournaments();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/new" element={<CreateTournamentPage />} />
          <Route path="/tournament/:id" element={<DashboardPage />} />
          <Route
            path="/tournament/:id/participants"
            element={<ParticipantsPage />}
          />
          <Route path="/tournament/:id/matches" element={<MatchesPage />} />
          <Route
            path="/tournament/:id/standings"
            element={<StandingsPage />}
          />
          <Route path="/tournament/:id/bracket" element={<BracketPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
