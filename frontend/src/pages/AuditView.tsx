import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select, Label } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  fetchWebsites,
  fetchAudits,
  fetchAuditDetails,
  runAudit,
  getExportCsvUrl,
  getExportPdfUrl,
  type Website,
  type AnswerReadinessAudit,
  type QuestionAuditResult,
} from "../services/api";

export function AuditView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlWebsiteId = searchParams.get("website_id") || "";

  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(urlWebsiteId);
  const [audits, setAudits] = useState<AnswerReadinessAudit[]>([]);
  const [currentAudit, setCurrentAudit] = useState<AnswerReadinessAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
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

  const getScoreBadge = (score: number) => {
    if (score >= 75) return <Badge variant="success">{score.toFixed(0)}/100</Badge>;
    if (score >= 50) return <Badge variant="warning">{score.toFixed(0)}/100</Badge>;
    return <Badge variant="danger">{score.toFixed(0)}/100</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">Capability A</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-text">Website Answer-Readiness Audit</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Evaluates whether your crawled pages contain clear, complete answers, headings, and structured data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentAudit && (
            <>
              <a href={getExportCsvUrl(currentAudit.id)} download>
                <Button variant="secondary" className="flex items-center gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> CSV
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
            variant="primary"
            onClick={handleRunAudit}
            disabled={running || !selectedWebsiteId}
            className="flex items-center gap-1.5"
          >
            {running ? <LoadingSpinner className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{running ? "Analyzing..." : "Run Audit"}</span>
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
                setSearchParams({ website_id: e.target.value });
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

      {/* Audit Results View */}
      {loading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner className="w-8 h-8" />
        </div>
      ) : !currentAudit ? (
        <Card className="p-8">
          <EmptyState
            title="No Audits Run Yet"
            description="Ensure the website has crawled pages and target questions, then click 'Run Audit'."
            icon={<FileCheck2 className="w-8 h-8 text-primary" />}
            action={
              <Button variant="primary" onClick={handleRunAudit} disabled={running}>
                Start First Audit
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Score Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-surface border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Overall Readiness Score</span>
              <div className="mt-2 text-3xl font-bold text-text">
                {currentAudit.overall_score.toFixed(1)} <span className="text-sm font-normal text-muted">/ 100</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Badge variant={currentAudit.overall_score >= 75 ? "success" : currentAudit.overall_score >= 50 ? "warning" : "danger"}>
                  {currentAudit.readiness_level.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted">Confidence: {(currentAudit.confidence_score * 100).toFixed(0)}%</span>
              </div>
            </Card>

            <Card className="p-5 bg-surface border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Questions Directly Answered</span>
              <div className="mt-2 text-3xl font-bold text-success">{currentAudit.answered_count}</div>
              <p className="text-xs text-muted mt-2">Clear direct answers extracted</p>
            </Card>

            <Card className="p-5 bg-surface border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Partially Answered</span>
              <div className="mt-2 text-3xl font-bold text-warning">{currentAudit.partially_answered_count}</div>
              <p className="text-xs text-muted mt-2">Missing structured data or subtopics</p>
            </Card>

            <Card className="p-5 bg-surface border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Unanswered Questions</span>
              <div className="mt-2 text-3xl font-bold text-danger">{currentAudit.unanswered_count}</div>
              <p className="text-xs text-muted mt-2">No relevant crawled content found</p>
            </Card>
          </div>

          {/* Question Breakdown */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text">Target Question Evaluations ({currentAudit.question_results?.length || 0})</h2>

            <div className="space-y-3">
              {currentAudit.question_results?.map((qr) => {
                const isExpanded = !!expandedQuestions[qr.id];
                return (
                  <Card key={qr.id} className="p-5 bg-surface border-border">
                    <div
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer"
                      onClick={() => toggleExpand(qr.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-text">{qr.question_text}</h3>
                          {getScoreBadge(qr.readiness_score)}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted">
                          <span>Intent: <b>{qr.question_intent || "unknown"}</b></span>
                          <span>•</span>
                          <span>Status: <b className="capitalize">{qr.status.replace("_", " ")}</b></span>
                          <span>•</span>
                          <span>Structured Data: <b>{qr.structured_data_present ? "Detected" : "None"}</b></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button variant="secondary" className="text-xs px-2.5 py-1">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Evidence & Explanation */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3 text-xs">
                        {qr.direct_answer_snippet && (
                          <div className="p-3 rounded-md bg-background border border-border">
                            <span className="font-semibold text-text block mb-1">Direct Answer Evidence:</span>
                            <p className="text-muted italic">"{qr.direct_answer_snippet}"</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="font-semibold text-text block mb-1">Relevant Page URLs:</span>
                            {qr.relevant_page_urls.length > 0 ? (
                              <ul className="list-disc list-inside text-muted space-y-0.5">
                                {qr.relevant_page_urls.map((u, i) => (
                                  <li key={i} className="truncate">
                                    <a href={u} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                      {u}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted">No relevant page found.</p>
                            )}
                          </div>

                          <div>
                            <span className="font-semibold text-text block mb-1">Missing Subtopics:</span>
                            {qr.missing_subtopics.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {qr.missing_subtopics.map((st, i) => (
                                  <Badge key={i} variant="secondary">
                                    {st}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-success">Comprehensive coverage</p>
                            )}
                          </div>
                        </div>

                        {qr.explanation && (
                          <p className="text-muted text-xs leading-relaxed">
                            <b>Evaluation Note:</b> {qr.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Actionable Recommendations */}
          {currentAudit.recommendations && currentAudit.recommendations.length > 0 && (
            <div className="space-y-3 pt-4">
              <h2 className="text-lg font-semibold text-text">Prioritized Content Recommendations</h2>
              <div className="grid grid-cols-1 gap-3">
                {currentAudit.recommendations.map((rec) => (
                  <Card key={rec.id} className="p-4 bg-surface border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              rec.priority === "critical"
                                ? "danger"
                                : rec.priority === "high"
                                ? "warning"
                                : "info"
                            }
                          >
                            {rec.priority.toUpperCase()} PRIORITY
                          </Badge>
                          <span className="text-xs text-muted">Effort: <b>{rec.estimated_effort}</b></span>
                        </div>
                        <h4 className="text-sm font-semibold text-text pt-1">{rec.issue}</h4>
                        <p className="text-xs text-muted"><b>Action:</b> {rec.suggested_action}</p>
                        <p className="text-xs text-muted"><b>Why it helps:</b> {rec.why_it_helps}</p>
                        {rec.affected_page_url && (
                          <p className="text-xs text-primary font-mono truncate pt-1">
                            Target: {rec.affected_page_url}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
