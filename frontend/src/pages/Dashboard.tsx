import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  HelpCircle,
  FileCheck2,
  Eye,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  PlusCircle,
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
import {
  fetchWebsites,
  fetchQuestions,
  fetchAudits,
  fetchVisibilityJobs,
  fetchHealth,
  type Website,
  type TargetQuestion,
  type AnswerReadinessAudit,
  type VisibilityJob,
  type HealthResponse,
} from "../services/api";
import { CHART_COLOR_VARS } from "../config/theme";

export function Dashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [questions, setQuestions] = useState<TargetQuestion[]>([]);
  const [audits, setAudits] = useState<AnswerReadinessAudit[]>([]);
  const [visibilityJobs, setVisibilityJobs] = useState<VisibilityJob[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  // Capability A metrics
  const totalAudits = audits.length;
  const avgReadiness =
    totalAudits > 0
      ? (audits.reduce((acc, curr) => acc + curr.overall_score, 0) / totalAudits).toFixed(1)
      : "0.0";
  const totalQuestions = questions.length;
  const answeredQuestions = audits.reduce((acc, curr) => acc + curr.answered_count, 0);

  // Capability B metrics
  const totalObservations = visibilityJobs.reduce((acc, curr) => acc + curr.total_questions, 0);
  const totalBrandMentions = visibilityJobs.reduce((acc, curr) => acc + curr.brand_mentions_count, 0);
  const totalCitations = visibilityJobs.reduce((acc, curr) => acc + curr.citations_count, 0);
  const totalCompetitorMentions = visibilityJobs.reduce(
    (acc, curr) => acc + curr.competitor_mentions_count,
    0
  );

  const readinessData = audits.slice(0, 5).map((a) => {
    const site = websites.find((w) => w.id === a.website_id);
    return {
      name: site?.name || a.website_id.slice(0, 6),
      score: a.overall_score,
      answered: a.answered_count,
      unanswered: a.unanswered_count,
    };
  });

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Platform Overview</h1>
          <p className="text-sm text-muted mt-1">
            Separated auditing for Website Answer-Readiness and AI Search Visibility.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/websites">
            <Button variant="secondary" className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> Manage Sites
            </Button>
          </Link>
          <Link to="/audits">
            <Button variant="primary" className="flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> Start Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Backend Status Notice */}
      {health && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface text-xs">
          <div className="flex items-center gap-2 text-muted">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>Backend API: <b>{health.version}</b></span>
            <span>•</span>
            <span>Database: <b className="text-success">{health.database.toUpperCase()}</b></span>
          </div>
          <span className="text-muted">Strict Separation: Content Readiness vs Search Observations</span>
        </div>
      )}

      {/* Empty State when no websites registered */}
      {websites.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No Websites Configured Yet"
            description="Register your canonical domain and add target user questions to begin auditing answer readiness."
            icon={<Globe className="w-10 h-10 text-primary" />}
            action={
              <Link to="/websites">
                <Button variant="primary">Add Your First Website</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Capability A: Answer-Readiness Metrics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="primary">Capability A</Badge>
              <h2 className="text-lg font-semibold text-text">Website Content Answer-Readiness</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-surface border-border">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Registered Sites</span>
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{websites.length}</div>
                <p className="text-xs text-muted mt-1">Domains configured for crawling</p>
              </Card>

              <Card className="p-4 bg-surface border-border">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Avg Readiness Score</span>
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{avgReadiness} / 100</div>
                <p className="text-xs text-muted mt-1">Content completeness across audits</p>
              </Card>

              <Card className="p-4 bg-surface border-border">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Questions Tracked</span>
                  <HelpCircle className="w-4 h-4 text-info" />
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{totalQuestions}</div>
                <p className="text-xs text-muted mt-1">User target queries across sites</p>
              </Card>

              <Card className="p-4 bg-surface border-border">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Audits Run</span>
                  <FileCheck2 className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{totalAudits}</div>
                <p className="text-xs text-muted mt-1">{answeredQuestions} questions directly answered</p>
              </Card>
            </div>
          </div>

          {/* Capability B: AI Search Visibility Metrics */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Badge variant="info">Capability B</Badge>
              <h2 className="text-lg font-semibold text-text">AI Search & Engine Visibility (Provider Observations)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-surface border-border">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Queries Observed</span>
                  <Eye className="w-4 h-4 text-secondary" />
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{totalObservations}</div>
                <p className="text-xs text-muted mt-1">Recorded via search/AI engines</p>
              </Card>

              <Card className="p-4 bg-surface border-border">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Brand Mentions</span>
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{totalBrandMentions}</div>
                <p className="text-xs text-muted mt-1">Documented in answer texts & snippets</p>
              </Card>

              <Card className="p-4 bg-surface border-border">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Citations Extracted</span>
                  <TrendingUp className="w-4 h-4 text-accent" />
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{totalCitations}</div>
                <p className="text-xs text-muted mt-1">Direct source references logged</p>
              </Card>

              <Card className="p-4 bg-surface border-border">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Competitor References</span>
                  <AlertTriangle className="w-4 h-4 text-warning" />
                </div>
                <div className="mt-2 text-2xl font-bold text-text">{totalCompetitorMentions}</div>
                <p className="text-xs text-muted mt-1">Observed in same query results</p>
              </Card>
            </div>
          </div>

          {/* Activity Chart & Recent Audits */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            <Card className="lg:col-span-2 p-5 bg-surface border-border">
              <h3 className="text-sm font-semibold text-text mb-4">Recent Audit Readiness Scores</h3>
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
                          borderRadius: "0.375rem",
                          color: "var(--color-text)",
                        }}
                      />
                      <Bar dataKey="score" fill={CHART_COLOR_VARS[0]} radius={[4, 4, 0, 0]} name="Readiness Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted text-sm">
                  Run your first audit to see activity trends
                </div>
              )}
            </Card>

            <Card className="p-5 bg-surface border-border flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text mb-2">Audit Quick Links</h3>
                <p className="text-xs text-muted mb-4">
                  Compare content readiness against competitor coverage and external visibility.
                </p>
                <div className="space-y-2">
                  <Link to="/audits" className="block">
                    <div className="p-3 rounded-md border border-border hover:bg-background transition flex items-center justify-between text-xs font-medium text-text">
                      <span>Run Answer-Readiness Audit</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted" />
                    </div>
                  </Link>
                  <Link to="/visibility" className="block">
                    <div className="p-3 rounded-md border border-border hover:bg-background transition flex items-center justify-between text-xs font-medium text-text">
                      <span>Inspect AI Search Visibility</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted" />
                    </div>
                  </Link>
                  <Link to="/competitors" className="block">
                    <div className="p-3 rounded-md border border-border hover:bg-background transition flex items-center justify-between text-xs font-medium text-text">
                      <span>Competitor Content Gap Analyzer</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted" />
                    </div>
                  </Link>
                  <Link to="/reports" className="block">
                    <div className="p-3 rounded-md border border-border hover:bg-background transition flex items-center justify-between text-xs font-medium text-text">
                      <span>Export CSV & PDF Reports</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted" />
                    </div>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
