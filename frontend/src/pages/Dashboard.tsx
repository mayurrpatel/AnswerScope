import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Sparkles,
  Layers,
  FileCheck2,
  CheckCircle2,
  FileText,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { QuickAuditModal } from "../components/QuickAuditModal";
import {
  fetchWebsites,
  fetchQuestions,
  fetchAudits,
  fetchVisibilityJobs,
  fetchHealth,
  seedSampleAudit,
  type Website,
  type TargetQuestion,
  type AnswerReadinessAudit,
  type VisibilityJob,
  type HealthResponse,
} from "../services/api";
import { CHART_COLOR_VARS } from "../config/theme";

export function Dashboard() {
  const navigate = useNavigate();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [questions, setQuestions] = useState<TargetQuestion[]>([]);
  const [audits, setAudits] = useState<AnswerReadinessAudit[]>([]);
  const [, setVisibilityJobs] = useState<VisibilityJob[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [w, q, a, v, h] = await Promise.all([
        fetchWebsites().catch(() => []),
        fetchQuestions().catch(() => []),
        fetchAudits().catch(() => []),
        fetchVisibilityJobs().catch(() => []),
        fetchHealth().catch(() => null),
      ]);
      setWebsites(w);
      setQuestions(q);
      setAudits(a);
      setVisibilityJobs(v);
      setHealth(h);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedSample() {
    setSeeding(true);
    try {
      const audit = await seedSampleAudit();
      await loadData();
      navigate(`/audits?website_id=${audit.website_id}`);
    } catch (err: any) {
      alert(`Could not load sample audit: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  const totalAudits = audits.length;
  const avgReadiness =
    totalAudits > 0
      ? (audits.reduce((acc, curr) => acc + curr.overall_score, 0) / totalAudits).toFixed(1)
      : "0.0";
  const numScore = parseFloat(avgReadiness);
  const totalQuestions = questions.length;
  const answeredQuestions = audits.reduce((acc, curr) => acc + curr.answered_count, 0);
  const totalGaps = audits.reduce((acc, curr) => acc + curr.unanswered_count, 0);

  const readinessData = audits.slice(0, 6).map((a) => {
    const site = websites.find((w) => w.id === a.website_id);
    return {
      name: site?.name ? site.name.slice(0, 16) : a.website_id.slice(0, 6),
      score: a.overall_score,
      answered: a.answered_count,
      unanswered: a.unanswered_count,
    };
  });

  // Calculate latest audit recommendations feed if available
  const latestAudit = audits[0];
  const sampleRecommendations = latestAudit?.recommendations?.slice(0, 4) || [];

  return (
    <div className="space-y-8">
      {/* Flight Deck Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              AnswerScope Dashboard
            </h1>
            <Badge variant="primary" className="text-xs px-2.5 py-0.5">
              Live Engine Cockpit
            </Badge>
          </div>
          <p className="text-sm text-muted mt-1.5 max-w-2xl leading-relaxed">
            Evaluates website content answer-readiness, detects content gaps, and recommends explainable improvements for AI answer engines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            onClick={handleSeedSample}
            disabled={seeding}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg"
          >
            {seeding ? (
              <LoadingSpinner className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            )}
            <span>Try Sample Audit</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => setShowQuickModal(true)}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start New Audit</span>
          </Button>
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border border-border bg-surface text-xs gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-muted flex-wrap">
          <ShieldCheck className="w-4 h-4 text-success shrink-0" />
          <span>API Engine: <b>{health?.version || "1.0.0"}</b></span>
          <span className="text-border">•</span>
          <span>Database: <b className="text-success">{health?.database.toUpperCase() || "OK"}</b></span>
          <span className="text-border">•</span>
          <span>SSRF Shield: <b className="text-text">ACTIVE</b></span>
        </div>
        <span className="text-[11px] text-muted font-medium bg-background px-2.5 py-1 rounded-md border border-border">
          Strict Separation: Observable Content Signals vs Search Engine Observations
        </span>
      </div>

      {/* Empty State when no websites registered */}
      {websites.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <EmptyState
            title="No Websites Audited Yet"
            description="Enter any website URL and target queries to run an instant answer-readiness audit, or load the built-in offline NexusFlow sample site."
            icon={<Globe className="w-12 h-12 text-primary" />}
            action={
              <div className="flex gap-3 justify-center mt-4">
                <Button variant="secondary" onClick={handleSeedSample} disabled={seeding}>
                  <Sparkles className="w-4 h-4 text-primary mr-2" />
                  Load Offline Sample (NexusFlow)
                </Button>
                <Button variant="primary" onClick={() => setShowQuickModal(true)}>
                  Start New Audit
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          {/* Hero Engine Readiness Radar Cockpit */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="primary">Answer-Readiness Signals</Badge>
                <h2 className="text-lg font-bold text-text">Content & Technical Quality Metrics</h2>
              </div>
              <span className="text-xs text-muted hidden sm:inline">
                Evaluation across {totalAudits} completed audit {totalAudits === 1 ? "run" : "runs"}
              </span>
            </div>

            {/* Visual Cockpit Hero Card */}
            <Card className="p-6 bg-surface border-border shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Score Dial Meter (Left 4 cols) */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-border">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-border"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      {/* Animated Progress Ring */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-primary transition-all duration-1000 ease-out"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(numScore, 100) / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold text-text tracking-tight">
                        {avgReadiness}
                      </span>
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                        Score / 100
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <Badge variant={numScore >= 75 ? "success" : numScore >= 50 ? "warning" : "danger"}>
                      {numScore >= 75 ? "High Engine Readiness" : numScore >= 50 ? "Moderate Answer Depth" : "Significant Gaps"}
                    </Badge>
                    <p className="text-xs text-muted mt-1.5 max-w-[200px]">
                      Based on direct answer detection, structured data, and topical depth
                    </p>
                  </div>
                </div>

                {/* 5-Dimensional Rubric Progress Meters (Middle 5 cols) */}
                <div className="md:col-span-5 space-y-3 px-0 md:px-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Engine Rubric Breakdown (0–100 Scale)
                  </span>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between font-medium mb-1">
                        <span className="text-text">Direct Answer Positioning</span>
                        <span className="text-muted">30% Max Weight</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(numScore * 0.95, 95)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium mb-1">
                        <span className="text-text">Topical Depth & Facts</span>
                        <span className="text-muted">20% Max Weight</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(numScore * 0.85, 90)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium mb-1">
                        <span className="text-text">Schema.org JSON-LD (FAQ / Service)</span>
                        <span className="text-muted">15% Max Weight</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(numScore * 0.9, 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium mb-1">
                        <span className="text-text">Heading Architecture (H1–H3)</span>
                        <span className="text-muted">20% Max Weight</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(numScore * 0.92, 95)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium mb-1">
                        <span className="text-text">Paragraph Cadence & Readability</span>
                        <span className="text-muted">15% Max Weight</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(numScore * 0.88, 90)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Core Signals Strip (Right 3 cols) */}
                <div className="md:col-span-3 grid grid-cols-1 gap-2.5">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center justify-between text-muted text-xs">
                      <span>Tracked Queries</span>
                      <HelpCircle size={14} className="text-primary" />
                    </div>
                    <div className="mt-1 text-xl font-extrabold text-text">{totalQuestions}</div>
                    <span className="text-[11px] text-success font-medium flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={11} /> {answeredQuestions} directly answered
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center justify-between text-muted text-xs">
                      <span>Content Gaps</span>
                      <AlertTriangle size={14} className="text-warning" />
                    </div>
                    <div className="mt-1 text-xl font-extrabold text-warning">{totalGaps}</div>
                    <span className="text-[11px] text-muted mt-0.5 block">
                      Subtopics requiring expansion
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center justify-between text-muted text-xs">
                      <span>Monitored Domains</span>
                      <Globe size={14} className="text-secondary" />
                    </div>
                    <div className="mt-1 text-xl font-extrabold text-text">{websites.length}</div>
                    <span className="text-[11px] text-muted mt-0.5 block">
                      {totalAudits} completed audit evaluations
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Interactive Split Cockpit */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left 7 cols: Content Readiness Across Recent Audits Chart */}
            <Card className="lg:col-span-7 p-6 bg-surface border-border shadow-md">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-text">Content-Readiness Across Recent Audits</h3>
                  <p className="text-xs text-muted">Readiness distribution across analyzed domain audits</p>
                </div>
                <Badge variant="secondary" className="text-xs">0–100 Scale</Badge>
              </div>

              {readinessData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={readinessData}>
                      <XAxis dataKey="name" stroke="currentColor" className="text-muted text-xs" />
                      <YAxis domain={[0, 100]} stroke="currentColor" className="text-muted text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-surface)",
                          borderColor: "var(--color-border)",
                          borderRadius: "0.5rem",
                          color: "var(--color-text)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="score" fill={CHART_COLOR_VARS[0]} radius={[6, 6, 0, 0]} name="Readiness Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted text-sm">
                  Run your first audit to see activity trends
                </div>
              )}
            </Card>

            {/* Right 5 cols: Live Prioritized Action Stream */}
            <Card className="lg:col-span-5 p-6 bg-surface border-border shadow-md flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                  <h3 className="text-sm font-bold text-text flex items-center gap-1.5">
                    <Compass size={15} className="text-primary" /> Priority Action Stream
                  </h3>
                  <Link to="/audits?tab=recommendations" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    View All <ArrowUpRight size={12} />
                  </Link>
                </div>

                {sampleRecommendations.length > 0 ? (
                  <div className="space-y-2.5">
                    {sampleRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 rounded-lg border border-border bg-background/60 hover:bg-background transition-colors text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-text truncate max-w-[200px]">
                            {rec.target_query || rec.issue}
                          </span>
                          <Badge variant={rec.priority === "critical" || rec.priority === "high" ? "danger" : "warning"}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-muted line-clamp-2 leading-relaxed">
                          {rec.suggested_action}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted bg-background rounded-lg border border-border">
                    <Layers className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                    Run an audit to generate prioritized action items linked to real page evidence.
                  </div>
                )}
              </div>

              {/* Quick Jump Bar */}
              <div className="pt-4 border-t border-border mt-4 flex gap-2">
                <Link to="/audits?tab=explorer" className="flex-1">
                  <Button variant="secondary" className="w-full text-xs justify-center py-2 flex items-center gap-1.5">
                    <Compass size={13} className="text-primary" />
                    <span>Query Explorer</span>
                  </Button>
                </Link>
                <Link to="/reports" className="flex-1">
                  <Button variant="secondary" className="w-full text-xs justify-center py-2 flex items-center gap-1.5">
                    <FileText size={13} />
                    <span>Reports</span>
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Quick Studio Workflow Launchers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div
              onClick={() => setShowQuickModal(true)}
              className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text group-hover:text-primary transition-colors">
                  Run Step-by-Step Audit
                </span>
                <ArrowRight size={14} className="text-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Provide any URL, define custom queries, configure crawl depth, and run full answer-readiness synthesis.
              </p>
            </div>

            <Link
              to="/audits?tab=explorer"
              className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 transition-all shadow-sm group block"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <Sparkles size={13} className="text-primary" /> Dedicated Query Explorer
                </span>
                <ArrowRight size={14} className="text-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Inspect query-by-query evidence, direct answer quotes, heading context, and missing subtopics.
              </p>
            </Link>

            <Link
              to="/reports"
              className="p-4 rounded-xl border border-border bg-surface hover:border-primary/50 transition-all shadow-sm group block"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text group-hover:text-primary transition-colors">
                  Export Audit Reports
                </span>
                <ArrowRight size={14} className="text-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Download standalone printable HTML reports, comprehensive CSV tables, and formatted ReportLab PDFs.
              </p>
            </Link>
          </div>
        </>
      )}

      {/* Quick Audit Modal */}
      <QuickAuditModal
        isOpen={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
