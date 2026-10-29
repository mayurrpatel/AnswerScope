import { useState, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Code2,
  ListPlus,
  Heading,
  FileCheck2,
  Sparkles,
  Info,
} from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import type { QuestionAuditResult, AuditRecommendation } from "../services/api";

interface QueryExplorerProps {
  questionResults: QuestionAuditResult[];
  recommendations: AuditRecommendation[];
}

export function QueryExplorer({ questionResults, recommendations }: QueryExplorerProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(() => {
    return questionResults[0]?.question_id || "";
  });
  const [searchFilter, setSearchFilter] = useState("");

  const filteredQuestions = useMemo(() => {
    if (!searchFilter.trim()) return questionResults;
    const term = searchFilter.toLowerCase();
    return questionResults.filter((q) =>
      (q.question_text || "").toLowerCase().includes(term) ||
      (q.question_intent || "").toLowerCase().includes(term) ||
      q.status.toLowerCase().includes(term)
    );
  }, [questionResults, searchFilter]);

  const activeResult = useMemo(() => {
    return questionResults.find((q) => q.question_id === selectedQuestionId) || questionResults[0] || null;
  }, [questionResults, selectedQuestionId]);

  const activeRecs = useMemo(() => {
    if (!activeResult) return [];
    return recommendations.filter((r) => r.question_id === activeResult.question_id);
  }, [recommendations, activeResult]);

  if (!questionResults || questionResults.length === 0) {
    return (
      <div className="p-8 text-center text-muted text-sm border border-border rounded-lg bg-surface">
        No query audit results available to explore.
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ready":
        return "success";
      case "partially_ready":
        return "warning";
      case "needs_improvement":
      case "unanswered":
        return "danger";
      default:
        return "default";
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 65) return "text-info";
    if (score >= 50) return "text-warning";
    return "text-danger";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left List of Queries */}
      <div className="lg:col-span-5 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search queries or intents..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-border bg-surface text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
          {filteredQuestions.map((q) => {
            const isSelected = q.question_id === (activeResult?.question_id || "");
            return (
              <button
                key={q.question_id}
                type="button"
                onClick={() => setSelectedQuestionId(q.question_id)}
                className={`w-full text-left p-3 rounded-lg border transition text-xs ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border bg-surface hover:bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-text line-clamp-2">
                    {q.question_text || "Untitled Question"}
                  </span>
                  <span className={`font-bold shrink-0 ${getScoreColorClass(q.readiness_score)}`}>
                    {q.readiness_score.toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <Badge variant="default" className="text-[10px] py-0 px-1.5">
                    {q.question_intent || "unknown"}
                  </Badge>
                  <Badge variant={getStatusVariant(q.status)} className="text-[10px] py-0 px-1.5">
                    {q.status.replace("_", " ")}
                  </Badge>
                  {q.direct_answer_found && (
                    <span className="text-[10px] text-success flex items-center gap-0.5">
                      <CheckCircle2 size={11} /> Answer found
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Detail Pane */}
      <div className="lg:col-span-7 space-y-4">
        {activeResult ? (
          <>
            {/* Header Card */}
            <Card className="p-5 border-border bg-surface">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="default" className="text-xs uppercase">
                      {activeResult.question_intent || "unknown"}
                    </Badge>
                    <Badge variant={getStatusVariant(activeResult.status)} className="text-xs">
                      {activeResult.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-text leading-snug">
                    {activeResult.question_text}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-3xl font-extrabold ${getScoreColorClass(activeResult.readiness_score)}`}>
                    {activeResult.readiness_score.toFixed(0)}
                    <span className="text-xs text-muted font-normal"> / 100</span>
                  </div>
                  <p className="text-[11px] text-muted font-medium">Readiness Score</p>
                </div>
              </div>

              {/* Rubric Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
                <div className="p-2.5 rounded-md bg-background border border-border">
                  <p className="text-[10px] uppercase font-semibold text-muted">Direct Answer</p>
                  <p className="text-sm font-bold text-text mt-0.5">
                    {activeResult.answer_clarity_score.toFixed(1)} <span className="text-xs text-muted font-normal">/ 30</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-md bg-background border border-border">
                  <p className="text-[10px] uppercase font-semibold text-muted">Content Depth</p>
                  <p className="text-sm font-bold text-text mt-0.5">
                    {activeResult.content_depth_score.toFixed(1)} <span className="text-xs text-muted font-normal">/ 30</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-md bg-background border border-border">
                  <p className="text-[10px] uppercase font-semibold text-muted">Structured Data</p>
                  <p className="text-sm font-bold text-text mt-0.5">
                    {activeResult.structured_data_score.toFixed(1)} <span className="text-xs text-muted font-normal">/ 15</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-md bg-background border border-border">
                  <p className="text-[10px] uppercase font-semibold text-muted">Headings & Hierarchy</p>
                  <p className="text-sm font-bold text-text mt-0.5">
                    {activeResult.heading_structure_score.toFixed(1)} <span className="text-xs text-muted font-normal">/ 15</span>
                  </p>
                </div>
              </div>
            </Card>

            {/* Direct Answer & Evidence Snippet */}
            <Card className="p-5 border-border bg-surface">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileCheck2 size={14} className="text-primary" /> Direct Answer Extraction
              </h4>
              {activeResult.direct_answer_found && activeResult.direct_answer_snippet ? (
                <div className="p-3.5 rounded-md bg-background border border-border text-xs text-text space-y-2">
                  <p className="leading-relaxed font-medium">"{activeResult.direct_answer_snippet}"</p>
                  {activeResult.relevant_page_urls && activeResult.relevant_page_urls.length > 0 && (
                    <div className="pt-2 border-t border-border flex items-center gap-1.5 text-muted">
                      <span>Source:</span>
                      <a
                        href={activeResult.relevant_page_urls[0]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-mono inline-flex items-center gap-1"
                      >
                        {activeResult.relevant_page_urls[0]}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-md bg-danger/5 border border-danger/20 text-xs text-danger">
                  No concise, direct answer was identified near the beginning of the analyzed pages. Search engines may struggle to extract a direct answer snippet.
                </div>
              )}
            </Card>

            {/* Content Gap Analysis & Missing Subtopics */}
            <Card className="p-5 border-border bg-surface">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ListPlus size={14} className="text-primary" /> Content Gap Analysis
              </h4>

              <div className="space-y-3 text-xs">
                {activeResult.missing_subtopics && activeResult.missing_subtopics.length > 0 && (
                  <div>
                    <span className="font-semibold text-text block mb-1">Missing Subtopics & Context:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeResult.missing_subtopics.map((st, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/20 font-medium">
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeResult.suggested_headings && activeResult.suggested_headings.length > 0 && (
                  <div>
                    <span className="font-semibold text-text block mb-1 flex items-center gap-1">
                      <Heading size={12} className="text-primary" /> Recommended Section Headings:
                    </span>
                    <ul className="space-y-1 font-mono text-[11px] text-muted pl-1">
                      {activeResult.suggested_headings.map((h, i) => (
                        <li key={i} className="p-1.5 rounded bg-background border border-border">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 rounded-md bg-background border border-border text-muted space-y-1 text-[11px]">
                  <p className="font-semibold text-text flex items-center gap-1">
                    <Info size={12} className="text-primary" /> Human Editorial Verification
                  </p>
                  <p>
                    Important: AnswerScope never invents product specifications, prices, statistics, or facts. The suggested sections require verified input from the website owner.
                  </p>
                </div>
              </div>
            </Card>

            {/* Prioritized Recommendations for Query */}
            <Card className="p-5 border-border bg-surface">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" /> Actionable Recommendations ({activeRecs.length})
              </h4>

              {activeRecs.length > 0 ? (
                <div className="space-y-2.5">
                  {activeRecs.map((rec) => {
                    const isHigh = rec.priority === "critical" || rec.priority === "high";
                    return (
                      <div
                        key={rec.id}
                        className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                          isHigh
                            ? "border-danger/30 bg-danger/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-text">{rec.issue}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant={isHigh ? "danger" : "default"} className="text-[10px] py-0">
                              {rec.priority.toUpperCase()}
                            </Badge>
                            <span className="text-[10px] text-muted">
                              Effort: {rec.estimated_effort}
                            </span>
                          </div>
                        </div>
                        <p className="text-text leading-relaxed">
                          <b>Action:</b> {rec.suggested_action}
                        </p>
                        <p className="text-muted text-[11px]">
                          <b>Why it matters:</b> {rec.why_it_helps}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  No pending recommendations for this query. Content structure and clarity meet ready thresholds.
                </p>
              )}
            </Card>
          </>
        ) : (
          <div className="p-8 text-center text-muted text-sm border border-border rounded-lg bg-surface">
            Select a query from the list to inspect details.
          </div>
        )}
      </div>
    </div>
  );
}
