import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { useAuthStore } from "./store/authStore.js";
import LoginPage from "./pages/LoginPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import TournamentSetupPage from "./pages/TournamentSetupPage.jsx";
import ParticipantsPage from "./pages/ParticipantsPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import MatchesPage from "./pages/MatchesPage.jsx";
import StandingsPage from "./pages/StandingsPage.jsx";
import BracketPage from "./pages/BracketPage.jsx";

function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function HomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/home" : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<LandingPage />} />
          <Route path="/setup/:category" element={<TournamentSetupPage />} />
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

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
