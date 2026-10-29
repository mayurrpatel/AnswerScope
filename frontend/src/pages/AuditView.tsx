import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  FileCheck2,
  Play,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Info,
  Filter,
  PlusCircle,
  HelpCircle,
} from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select, Label } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { QuickAuditModal } from "../components/QuickAuditModal";
import { QueryExplorer } from "../components/QueryExplorer";
import {
  fetchWebsites,
  fetchAudits,
  fetchAuditDetails,
  runAudit,
  getExportCsvUrl,
  getExportPdfUrl,
  getExportHtmlUrl,
  type Website,
  type AnswerReadinessAudit,
} from "../services/api";

export function AuditView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlWebsiteId = searchParams.get("website_id") || "";
  const initialTab = searchParams.get("tab") || "overview";

  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(urlWebsiteId);
  const [audits, setAudits] = useState<AnswerReadinessAudit[]>([]);
  const [currentAudit, setCurrentAudit] = useState<AnswerReadinessAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "explorer" | "recommendations">(
    initialTab as any
  );

  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedWebsiteId) {
      loadAuditsForSite(selectedWebsiteId);
    }
  }, [selectedWebsiteId]);

  async function loadInitial() {
    try {
      const siteList = await fetchWebsites();
      setWebsites(siteList);
      if (siteList.length > 0) {
        const activeSite = selectedWebsiteId || siteList[0].id;
        setSelectedWebsiteId(activeSite);
        await loadAuditsForSite(activeSite);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditsForSite(siteId: string) {
    try {
      const auditList = await fetchAudits(siteId);
      setAudits(auditList);
      if (auditList.length > 0) {
        const fullDetails = await fetchAuditDetails(auditList[0].id);
        setCurrentAudit(fullDetails);
      } else {
        setCurrentAudit(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRunAudit() {
    if (!selectedWebsiteId) return;
    setRunning(true);
    try {
      const newAudit = await runAudit(selectedWebsiteId);
      const fullAudit = await fetchAuditDetails(newAudit.id);
      setCurrentAudit(fullAudit);
      setAudits((prev) => [newAudit, ...prev]);
    } catch (err: any) {
      alert(`Audit failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function selectAudit(id: string) {
    try {
      setLoading(true);
      const full = await fetchAuditDetails(id);
      setCurrentAudit(full);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredRecommendations = (currentAudit?.recommendations || []).filter((r) => {
    if (priorityFilter === "all") return true;
    if (priorityFilter === "high") return r.priority === "critical" || r.priority === "high";
    return r.priority === priorityFilter;
  });

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 65) return "text-info";
    if (score >= 50) return "text-warning";
    return "text-danger";
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">Answer-Readiness Audit</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-text">AnswerScope Evaluation</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Evaluates whether crawled website pages directly answer relevant user questions and are structured for answer engines.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentAudit && (
            <>
              <a href={getExportCsvUrl(currentAudit.id)} download>
                <Button variant="secondary" className="flex items-center gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              </a>
              <a href={getExportHtmlUrl(currentAudit.id)} download>
                <Button variant="secondary" className="flex items-center gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> HTML
                </Button>
              </a>
              <a href={getExportPdfUrl(currentAudit.id)} download>
                <Button variant="secondary" className="flex items-center gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
              </a>
            </>
          )}

          <Button
            variant="secondary"
            onClick={() => setShowRubricModal(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Info className="w-3.5 h-3.5 text-primary" /> Rubric Formula
          </Button>

          <Button
            variant="primary"
            onClick={() => setShowQuickModal(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" /> New Audit
          </Button>
        </div>
      </div>

      {/* Website & Audit Selector */}
      <Card className="p-4 bg-surface border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Selected Website</Label>
            <Select
              value={selectedWebsiteId}
              onChange={(e) => {
                setSelectedWebsiteId(e.target.value);
                setSearchParams({ website_id: e.target.value, tab: activeTab });
              }}
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.domain})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Audit History</Label>
            <Select
              value={currentAudit?.id || ""}
              onChange={(e) => selectAudit(e.target.value)}
              disabled={audits.length === 0}
            >
              {audits.length === 0 && <option value="">No previous audits</option>}
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  {new Date(a.created_at).toLocaleString()} — Score: {a.overall_score.toFixed(1)} ({a.readiness_level})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      {currentAudit && (
        <div className="flex border-b border-border gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("overview");
              setSearchParams({ website_id: selectedWebsiteId, tab: "overview" });
            }}
            className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            Overview & Score Summary
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("explorer");
              setSearchParams({ website_id: selectedWebsiteId, tab: "explorer" });
            }}
            className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === "explorer"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            <Sparkles size={13} /> Dedicated Query Explorer ({currentAudit.question_results?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("recommendations");
              setSearchParams({ website_id: selectedWebsiteId, tab: "recommendations" });
            }}
            className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 ${
              activeTab === "recommendations"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            Prioritized Recommendations ({currentAudit.recommendations?.length || 0})
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner className="w-8 h-8" />
        </div>
      ) : !currentAudit ? (
        <Card className="p-8">
          <EmptyState
            title="No Audits Run Yet"
            description="Run a new audit to evaluate website answer readiness, extract evidence, and uncover content gaps."
            icon={<FileCheck2 className="w-8 h-8 text-primary" />}
            action={
              <Button variant="primary" onClick={() => setShowQuickModal(true)}>
                Start First Audit
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {activeTab === "explorer" && (
            <QueryExplorer
              questionResults={currentAudit.question_results || []}
              recommendations={currentAudit.recommendations || []}
            />
          )}

          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Score Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 bg-surface border-border">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Content Readiness</span>
                  <div className={`mt-2 text-3xl font-extrabold ${getScoreColorClass(currentAudit.overall_score)}`}>
                    {currentAudit.overall_score.toFixed(1)} <span className="text-sm text-muted font-normal">/ 100</span>
                  </div>
                  <Badge variant={currentAudit.overall_score >= 75 ? "success" : currentAudit.overall_score >= 50 ? "warning" : "danger"} className="mt-2 text-xs">
                    {currentAudit.readiness_level.toUpperCase()}
                  </Badge>
                </Card>

                <Card className="p-5 bg-surface border-border">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Queries Analyzed</span>
                  <div className="mt-2 text-3xl font-bold text-text">{currentAudit.questions_analyzed}</div>
                  <p className="text-xs text-muted mt-1">{currentAudit.answered_count} directly answered</p>
                </Card>

                <Card className="p-5 bg-surface border-border">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Unanswered Queries</span>
                  <div className="mt-2 text-3xl font-bold text-danger">{currentAudit.unanswered_count}</div>
                  <p className="text-xs text-muted mt-1">High-priority content gaps</p>
                </Card>

                <Card className="p-5 bg-surface border-border">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Auditing Confidence</span>
                  <div className="mt-2 text-3xl font-bold text-text">
                    {(currentAudit.confidence_score * 100).toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted mt-1">Based on verifiable snippet overlap</p>
                </Card>
              </div>

              {/* Explanatory Banner */}
              <div className="p-4 rounded-lg bg-surface border border-border text-xs text-muted space-y-1">
                <p className="font-semibold text-text flex items-center gap-1.5">
                  <Info size={14} className="text-primary" /> Internal Content-Readiness Score Disclaimer
                </p>
                <p className="leading-relaxed">
                  This score measures observable on-page clarity, direct answer placement, heading semantics, and machine-readable schema markup across successfully crawled pages. It is an internal readiness assessment and does not fabricate external AI rankings or citation counts.
                </p>
              </div>

              {/* Query Results Table */}
              <Card className="p-5 bg-surface border-border">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-text">Target Query Results</h3>
                    <p className="text-xs text-muted">Click any question to view evidence and content gap recommendations</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setActiveTab("explorer")}
                    className="text-xs flex items-center gap-1"
                  >
                    Open in Query Explorer <Sparkles size={12} />
                  </Button>
                </div>

                <div className="space-y-3">
                  {(currentAudit.question_results || []).map((qr) => {
                    const isExpanded = expandedQuestions[qr.id];
                    return (
                      <div key={qr.id} className="border border-border rounded-lg overflow-hidden bg-background">
                        <div
                          onClick={() => toggleExpand(qr.id)}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface/50 transition gap-4"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-semibold text-xs text-text truncate">
                              {qr.question_text || "Target Question"}
                            </span>
                            <Badge variant="default" className="text-[10px] py-0 shrink-0">
                              {qr.question_intent}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-bold ${getScoreColorClass(qr.readiness_score)}`}>
                              {qr.readiness_score.toFixed(0)} / 100
                            </span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t border-border bg-surface text-xs space-y-3">
                            <div>
                              <span className="font-semibold text-text block mb-1">Direct Answer Evidence:</span>
                              <div className="p-2.5 rounded bg-background border border-border">
                                {qr.direct_answer_found && qr.direct_answer_snippet ? (
                                  <p className="text-text font-medium">"{qr.direct_answer_snippet}"</p>
                                ) : (
                                  <p className="text-danger italic">No direct answer found near the top of the content.</p>
                                )}
                              </div>
                            </div>

                            {qr.missing_subtopics && qr.missing_subtopics.length > 0 && (
                              <div>
                                <span className="font-semibold text-text block mb-1">Missing Subtopics:</span>
                                <div className="flex flex-wrap gap-1">
                                  {qr.missing_subtopics.map((st, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                                      {st}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {qr.suggested_headings && qr.suggested_headings.length > 0 && (
                              <div>
                                <span className="font-semibold text-text block mb-1">Recommended Section Headings:</span>
                                <div className="space-y-1 font-mono text-[11px] text-muted">
                                  {qr.suggested_headings.map((h, i) => (
                                    <div key={i} className="p-1 rounded bg-background border border-border">{h}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "recommendations" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-muted" />
                  <span className="text-xs text-muted font-medium">Priority Filter:</span>
                  <div className="flex gap-1.5">
                    {["all", "high", "medium", "low"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriorityFilter(p)}
                        className={`text-xs px-2.5 py-1 rounded-md border font-medium transition ${
                          priorityFilter === p
                            ? "bg-primary text-primary-contrast border-primary"
                            : "bg-surface text-muted border-border hover:bg-background"
                        }`}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted">Showing {filteredRecommendations.length} recommendations</span>
              </div>

              <div className="space-y-3">
                {filteredRecommendations.map((rec) => {
                  const isHigh = rec.priority === "critical" || rec.priority === "high";
                  return (
                    <Card key={rec.id} className={`p-4 border-border bg-surface ${isHigh ? "border-l-4 border-l-danger" : ""}`}>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={isHigh ? "danger" : rec.priority === "medium" ? "warning" : "default"} className="text-[10px]">
                              {rec.priority.toUpperCase()} PRIORITY
                            </Badge>
                            <span className="text-[11px] text-muted">Effort: <b>{rec.estimated_effort}</b></span>
                          </div>
                          <h4 className="text-sm font-bold text-text">{rec.issue}</h4>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {rec.target_query && (
                          <p className="text-muted">
                            <b>Target Query:</b> <span className="text-text font-medium">{rec.target_query}</span>
                          </p>
                        )}
                        {rec.affected_page_url && (
                          <p className="text-muted">
                            <b>Affected Page:</b> <code>{rec.affected_page_url}</code>
                          </p>
                        )}
                        <p className="text-text">
                          <b>Suggested Action:</b> {rec.suggested_action}
                        </p>
                        <p className="text-muted text-[11px]">
                          <b>Why It Matters:</b> {rec.why_it_helps}
                        </p>
                        {rec.owner_confirmation_note && (
                          <div className="p-2 rounded bg-warning/10 border border-warning/20 text-warning text-[11px]">
                            {rec.owner_confirmation_note}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Audit Modal */}
      <QuickAuditModal
        isOpen={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        onSuccess={(audit) => {
          setSelectedWebsiteId(audit.website_id);
          loadAuditsForSite(audit.website_id);
        }}
      />

      {/* Rubric Explainer Dialog */}
      {showRubricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text">AnswerScope Scoring Methodology (0 to 100)</h3>
              <button
                type="button"
                onClick={() => setShowRubricModal(false)}
                className="text-muted hover:text-text text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              AnswerScope computes a deterministic content-readiness score from measurable on-page signals:
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded bg-background border border-border">
                <b className="text-text">1. Direct Answer Presence & Placement (0–30 pts)</b>
                <p className="text-muted mt-0.5">Scored by detecting explicit concise answer sentences near the top of relevant pages.</p>
              </div>
              <div className="p-2.5 rounded bg-background border border-border">
                <b className="text-text">2. Content Depth & Topical Coverage (0–30 pts)</b>
                <p className="text-muted mt-0.5">Evaluates word count sufficiency and coverage of intent-specific subtopics (pricing, steps, alternatives).</p>
              </div>
              <div className="p-2.5 rounded bg-background border border-border">
                <b className="text-text">3. Structured Data Markup (0–15 pts)</b>
                <p className="text-muted mt-0.5">Valid JSON-LD schema (FAQPage, Article, Product, Service) that helps answer engines parse data.</p>
              </div>
              <div className="p-2.5 rounded bg-background border border-border">
                <b className="text-text">4. Semantic Heading Hierarchy (0–15 pts)</b>
                <p className="text-muted mt-0.5">Logical H1 framing and descriptive H2/H3 headings clearly scoping the topic.</p>
              </div>
              <div className="p-2.5 rounded bg-background border border-border">
                <b className="text-text">5. Evidence Specificity & Facts (0–10 pts)</b>
                <p className="text-muted mt-0.5">Presence of specific specifications, figures, examples, or steps over vague marketing claims.</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setShowRubricModal(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
