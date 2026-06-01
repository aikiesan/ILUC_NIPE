import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Info,
  LayoutDashboard,
  Map as MapIcon,
  ListOrdered,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/overview", label: "Visão Nacional", icon: LayoutDashboard },
  { to: "/map", label: "Mapa Interativo", icon: MapIcon },
  { to: "/transitions", label: "Transições", icon: Shuffle },
  { to: "/ranking", label: "Ranking", icon: ListOrdered },
  { to: "/about", label: "Metodologia", icon: Info },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-2 flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
        <BarChart3 className="h-3.5 w-3.5" />
        Navegação
      </div>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-white"
                : "text-muted hover:bg-highlight hover:text-foreground",
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
