import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Websites } from "./pages/Websites";
import { Questions } from "./pages/Questions";
import { AuditView } from "./pages/AuditView";
import { VisibilityView } from "./pages/VisibilityView";
import { CompetitorView } from "./pages/CompetitorView";
import { ReportsView } from "./pages/ReportsView";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="websites" element={<Websites />} />
        <Route path="questions" element={<Questions />} />
        <Route path="audits" element={<AuditView />} />
        <Route path="visibility" element={<VisibilityView />} />
        <Route path="competitors" element={<CompetitorView />} />
        <Route path="reports" element={<ReportsView />} />
      </Route>
    </Routes>
  );
}
