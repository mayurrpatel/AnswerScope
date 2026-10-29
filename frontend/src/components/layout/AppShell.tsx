import { NavLink, Outlet, Link } from "react-router-dom";
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
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { applyTheme, getInitialTheme, THEME_STORAGE_KEY, type Theme } from "../../config/theme";
import { Button } from "../ui/Button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/websites", label: "Websites & Audits", icon: Globe },
  { to: "/questions", label: "Target Queries", icon: HelpCircle },
  { to: "/audits", label: "Answer Readiness & Explorer", icon: FileCheck2 },
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
    <div className="min-h-screen flex flex-col bg-background text-text">
      {/* Top Studio Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand Logo & Product Identity */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-contrast font-bold text-sm shadow-md transition-transform group-hover:scale-105">
                <Zap size={18} className="fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight text-base text-text">AnswerScope</span>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    Studio
                  </span>
                </div>
                <p className="hidden sm:block text-[11px] text-muted -mt-0.5">AI Engine Visibility & Answer Audit</p>
              </div>
            </Link>

            {/* Main Navigation Tabs */}
            <nav
              aria-label="Main"
              className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none"
            >
              {nav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-primary text-primary-contrast shadow-sm font-semibold"
                        : "text-muted hover:text-text hover:bg-surface"
                    }`
                  }
                >
                  <Icon size={14} aria-hidden />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Right Action & Utility Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Security Shield Indicator */}
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] text-muted font-medium">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <ShieldCheck size={13} className="text-success" />
                <span>SSRF Shield</span>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="secondary"
                onClick={toggle}
                aria-label="Toggle theme"
                className="p-2 h-9 w-9 flex items-center justify-center rounded-lg"
              >
                {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-Header / Protocol Bar */}
      <div className="border-b border-border bg-surface/50 text-[11px] text-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text">Protocol Integrity:</span>
            <span>Observable Content & Technical Signals Only</span>
            <span className="text-border">•</span>
            <span className="text-muted">Strictly No Fabricated AI Citations or Synthetic Rankings</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span>Deterministic 0–100 Rubric</span>
            <span className="text-border">•</span>
            <span>Schema.org JSON-LD Verification</span>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Studio Footer */}
      <footer className="border-t border-border bg-surface py-5 mt-auto text-xs text-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text">AnswerScope</span>
            <span>— AI Search Visibility & Answer Engine Audit Platform</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>FastAPI 0.115</span>
            <span>•</span>
            <span>React 19 + Vite</span>
            <span>•</span>
            <span>SQLite / PostgreSQL</span>
            <span>•</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
