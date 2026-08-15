import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListChecks, Swords, Table2 } from "lucide-react";
import { cn } from "../lib/utils.js";

export default function TournamentNav({ tournament }) {
  const base = `/tournament/${tournament.id}`;

  const tabs = [
    { to: base, label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: `${base}/matches`, label: "Matches", icon: ListChecks },
  ];

  if (tournament.format === "round-robin") {
    tabs.push({ to: `${base}/standings`, label: "Standings", icon: Table2 });
  } else {
    tabs.push({ to: `${base}/bracket`, label: "Bracket", icon: Swords });
  }

  return (
    <nav className="scroll-area flex gap-1 overflow-x-auto rounded-lg border border-line bg-white p-1 shadow-panel">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-primary text-white shadow-glow"
                : "text-muted hover:bg-mist hover:text-primary",
            )
          }
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
