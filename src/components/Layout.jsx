import { Link, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Trophy } from "lucide-react";
import { Logo } from "./Logo.jsx";
import { Button } from "./ui/button.jsx";
import { useAuthStore } from "../store/authStore.js";

export default function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/home" className="shrink-0">
            <Logo />
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              to="/home"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-light hover:text-primary sm:inline-flex"
            >
              <Trophy className="h-4 w-4" />
              Tournaments
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-blue-100 bg-white py-4">
        <p className="text-center text-xs text-slate-400">
          ATSI Racketeers · Badminton Tournament Manager
        </p>
      </footer>
    </div>
  );
}
