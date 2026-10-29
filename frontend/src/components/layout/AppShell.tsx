import { NavLink, Outlet } from "react-router-dom";
import {
  Globe,
  HelpCircle,
  LayoutDashboard,
  Moon,
  Sun,
  FileCheck2,
  Eye,
  Users2,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { applyTheme, getInitialTheme, THEME_STORAGE_KEY, type Theme } from "../../config/theme";
import { Button } from "../ui/Button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/websites", label: "Websites", icon: Globe },
  { to: "/questions", label: "Questions", icon: HelpCircle },
  { to: "/audits", label: "Answer Readiness", icon: FileCheck2 },
  { to: "/visibility", label: "AI Search Visibility", icon: Eye },
  { to: "/competitors", label: "Competitor Gaps", icon: Users2 },
  { to: "/reports", label: "Reports & Exports", icon: FileText },
];

export function AppShell() {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = getInitialTheme();
    applyTheme(t);
    return t;
  });

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <aside className="border-b border-border bg-surface p-4 md:w-64 md:border-b-0 md:border-r flex flex-col justify-between shrink-0">
        <div>
          <div className="mb-6 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-contrast font-bold text-base shadow">
              AS
            </div>
            <div>
              <h1 className="text-sm font-bold text-text leading-tight">AI Search & Engine</h1>
              <p className="text-xs text-muted">Visibility & Audit</p>
            </div>
          </div>

          <nav aria-label="Main" className="flex flex-wrap gap-1 md:flex-col">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "bg-primary text-primary-contrast shadow-sm"
                      : "text-muted hover:text-text hover:bg-background"
                  }`
                }
              >
                <Icon size={16} aria-hidden /> <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden md:block pt-6 border-t border-border mt-6">
          <div className="p-3 rounded-md bg-background border border-border text-xs text-muted">
            <p className="font-semibold text-text mb-1">Audit Protocol</p>
            <p className="leading-relaxed">Capability A (Readiness) & Capability B (Search Observations) are strictly separated.</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center border-b border-border bg-surface px-6 py-3">
          <div className="text-xs text-muted font-medium">
            AI Search Visibility & Answer Engine Audit Platform
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={toggle} aria-label="Toggle theme" className="p-2">
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
