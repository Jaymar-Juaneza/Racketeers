import { Link, Outlet, useNavigate } from "react-router-dom";
import { LogIn, LogOut, ShieldCheck, Trophy } from "lucide-react";
import { Logo } from "./Logo.jsx";
import { Button } from "./ui/button.jsx";
import { useAuthStore } from "../store/authStore.js";

export default function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-mist hover:text-primary sm:inline-flex"
            >
              <Trophy className="h-4 w-4" />
              Dashboard
            </Link>

            {isAdmin ? (
              <>
                <span className="hidden items-center gap-1.5 rounded-full border border-line bg-mist px-3 py-1 text-xs font-semibold text-muted md:inline-flex">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  {profile.username}
                  <span className="font-mono text-[10px] uppercase tracking-wide text-primary">
                    admin
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logout();
                    navigate("/", { replace: true });
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => navigate("/login")}>
                <LogIn className="h-4 w-4" />
                Login as admin
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="animate-rise mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white py-4">
        <p className="text-center font-mono text-xs text-muted">
          ATSI Racketeers · Badminton Tournament Manager
        </p>
      </footer>
    </div>
  );
}
