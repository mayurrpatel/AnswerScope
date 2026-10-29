import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Download, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Info } from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select, Label } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  fetchWebsites,
  fetchReportSummary,
  getExportCsvUrl,
  getExportPdfUrl,
  getExportHtmlUrl,
  seedSampleAudit,
  type Website,
  type ReportSummary,
} from "../services/api";

export function ReportsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlWebsiteId = searchParams.get("website_id") || "";

  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(urlWebsiteId);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadWebsites();
  }, []);

  useEffect(() => {
    if (selectedWebsiteId) {
      loadReport(selectedWebsiteId);
    }
  }, [selectedWebsiteId]);

  async function loadWebsites() {
    try {
      const siteList = await fetchWebsites();
      setWebsites(siteList);
      if (siteList.length > 0) {
        const active = selectedWebsiteId || siteList[0].id;
        setSelectedWebsiteId(active);
        await loadReport(active);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(siteId: string) {
    try {
      setLoading(true);
      const data = await fetchReportSummary(siteId);
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSample() {
    setSeeding(true);
    try {
      const audit = await seedSampleAudit();
      const siteList = await fetchWebsites();
      setWebsites(siteList);
      setSelectedWebsiteId(audit.website_id);
      await loadReport(audit.website_id);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Audit Reports & Exports</h1>
          <p className="text-sm text-muted mt-1">
            Download comprehensive audit reports in CSV, HTML, and PDF formats containing verified evidence and recommendations.
          </p>
        </div>

        {summary?.latest_audit && (
          <div className="flex items-center gap-2 flex-wrap">
            <a href={getExportCsvUrl(summary.latest_audit.id)} download>
              <Button variant="secondary" className="flex items-center gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </a>
            <a href={getExportHtmlUrl(summary.latest_audit.id)} download>
              <Button variant="secondary" className="flex items-center gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Export HTML
              </Button>
            </a>
            <a href={getExportPdfUrl(summary.latest_audit.id)} download>
              <Button variant="primary" className="flex items-center gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Export PDF
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Website Selector */}
      <Card className="p-4 bg-surface border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="max-w-md w-full">
            <Label>Select Website for Report</Label>
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

          <Button
            variant="secondary"
            onClick={handleLoadSample}
            disabled={seeding}
            className="text-xs flex items-center gap-1.5 shrink-0"
          >
            {seeding ? <LoadingSpinner className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
            <span>Load Sample Report (NexusFlow)</span>
          </Button>
        </div>
      </Card>

      {/* Report Summary */}
      {loading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner className="w-8 h-8" />
        </div>
      ) : !summary || (!summary.latest_audit && !summary.latest_visibility) ? (
        <Card className="p-8">
          <EmptyState
            title="No Completed Audits Found"
            description="Run an answer-readiness audit or load the sample report to inspect findings."
            icon={<FileText className="w-8 h-8 text-primary" />}
            action={
              <Button variant="primary" onClick={handleLoadSample} disabled={seeding}>
                Load Sample Report
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Capability A card */}
            <Card className="p-5 bg-surface border-border space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="primary" className="text-[10px]">Capability A</Badge>
                  <h3 className="text-sm font-bold text-text mt-1">Answer-Readiness Summary</h3>
                </div>
                {summary.latest_audit && (
                  <span className="text-xl font-extrabold text-success">
                    {summary.latest_audit.overall_score.toFixed(1)} <span className="text-xs text-muted font-normal">/ 100</span>
                  </span>
                )}
              </div>

              {summary.latest_audit ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted">Readiness Level:</span>
                    <span className="font-semibold text-text uppercase">{summary.latest_audit.readiness_level}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted">Target Queries Analyzed:</span>
                    <span className="font-semibold text-text">{summary.latest_audit.questions_analyzed}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted">Directly Answered:</span>
                    <span className="font-semibold text-success">{summary.latest_audit.answered_count}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted">Unanswered Content Gaps:</span>
                    <span className="font-semibold text-danger">{summary.latest_audit.unanswered_count}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted">No answer-readiness audit completed yet.</p>
              )}
            </Card>

            {/* Capability B card */}
            <Card className="p-5 bg-surface border-border space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="info" className="text-[10px]">Capability B</Badge>
                  <h3 className="text-sm font-bold text-text mt-1">AI Search Visibility Summary</h3>
                </div>
                {summary.latest_visibility && (
                  <span className="text-xl font-extrabold text-primary">
                    {summary.latest_visibility.brand_mention_rate.toFixed(0)}%
                  </span>
                )}
              </div>

              {summary.latest_visibility ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted">Data Provider:</span>
                    <span className="font-semibold text-text">{summary.latest_visibility.provider_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted">Provider Status:</span>
                    <span className="font-semibold text-text">
                      {summary.latest_visibility.is_live_provider ? "Live Provider Query" : "Simulated Offline Fixture"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted">Brand Mentions Detected:</span>
                    <span className="font-semibold text-text">{summary.latest_visibility.brand_mentions_count}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted">Citations Indexed:</span>
                    <span className="font-semibold text-text">{summary.latest_visibility.citations_count}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted">No visibility observations recorded yet.</p>
              )}
            </Card>
          </div>

          {/* Top Prioritized Recommendations */}
          {summary.top_recommendations && summary.top_recommendations.length > 0 && (
            <Card className="p-5 bg-surface border-border">
              <h3 className="text-sm font-bold text-text mb-3">Top Actionable Content Recommendations</h3>
              <div className="space-y-2.5 text-xs">
                {summary.top_recommendations.map((rec, i) => {
                  const isHigh = rec.priority === "critical" || rec.priority === "high";
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-md border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isHigh ? "border-danger/20 bg-danger/5" : "border-border bg-background"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant={isHigh ? "danger" : "default"} className="text-[10px] py-0">
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <span className="font-bold text-text">{rec.issue}</span>
                        </div>
                        <p className="text-muted mt-1">{rec.suggested_action}</p>
                      </div>
                      <span className="text-[11px] text-muted shrink-0">
                        Effort: <b>{rec.estimated_effort}</b>
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Analysis Limitations & Transparency */}
          <Card className="p-5 bg-surface border-border">
            <h3 className="text-sm font-bold text-text mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" /> Audit Methodology & Data Limitations
            </h3>
            <ul className="space-y-1.5 text-xs text-muted list-disc pl-5">
              {summary.data_limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
              <li>
                AnswerScope does not fabricate rankings or search share metrics. All findings reflect observable on-page HTML, Schema.org metadata, and text clarity.
              </li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
