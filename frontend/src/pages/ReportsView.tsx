import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Download, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Audit Reports & Exports</h1>
          <p className="text-sm text-muted mt-1">
            Download comprehensive audit reports in CSV and PDF formats containing verified evidence and recommendations.
          </p>
        </div>

        {summary?.latest_audit && (
          <div className="flex items-center gap-2">
            <a href={getExportCsvUrl(summary.latest_audit.id)} download>
              <Button variant="secondary" className="flex items-center gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Export CSV
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
        <div className="max-w-md">
          <Label>Select Website</Label>
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
            description="Run a website answer-readiness audit or visibility check first to generate a full report."
            icon={<FileText className="w-8 h-8 text-primary" />}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Executive Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Capability A card */}
            <Card className="p-5 bg-surface border-border space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="primary">Capability A</Badge>
                  <h3 className="text-base font-bold text-text mt-1">Website Answer-Readiness</h3>
                </div>
                {summary.latest_audit && (
                  <Badge variant={summary.latest_audit.overall_score >= 75 ? "success" : "warning"}>
                    {summary.latest_audit.overall_score.toFixed(1)} / 100
                  </Badge>
                )}
              </div>

              {summary.latest_audit ? (
                <div className="space-y-2 text-xs text-muted">
                  <p>
                    Analyzed <b>{summary.latest_audit.questions_analyzed}</b> questions. Direct answers confirmed:{" "}
                    <b>{summary.latest_audit.answered_count}</b>. Unanswered:{" "}
                    <b>{summary.latest_audit.unanswered_count}</b>.
                  </p>
                  <p>
                    Readiness Level: <b className="capitalize">{summary.latest_audit.readiness_level}</b>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted">No answer-readiness audit run yet.</p>
              )}
            </Card>

            {/* Capability B card */}
            <Card className="p-5 bg-surface border-border space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="info">Capability B</Badge>
                  <h3 className="text-base font-bold text-text mt-1">AI Search Visibility</h3>
                </div>
                {summary.latest_visibility && (
                  <Badge variant="secondary">
                    {summary.latest_visibility.brand_mention_rate.toFixed(1)}% Mention Rate
                  </Badge>
                )}
              </div>

              {summary.latest_visibility ? (
                <div className="space-y-2 text-xs text-muted">
                  <p>
                    Provider: <b>{summary.latest_visibility.provider_name}</b> (
                    {summary.latest_visibility.is_live_provider ? "Live Provider" : "Test Fixture"}).
                  </p>
                  <p>
                    Logged <b>{summary.latest_visibility.brand_mentions_count}</b> brand mentions and{" "}
                    <b>{summary.latest_visibility.citations_count}</b> citations across{" "}
                    <b>{summary.latest_visibility.total_questions}</b> questions.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted">No visibility observations recorded yet.</p>
              )}
            </Card>
          </div>

          {/* Top Recommendations */}
          {summary.top_recommendations.length > 0 && (
            <Card className="p-5 bg-surface border-border space-y-3">
              <h3 className="text-sm font-semibold text-text">Top Content Priorities</h3>
              <div className="space-y-2">
                {summary.top_recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-md bg-background border border-border flex items-start gap-3">
                    <span className="font-mono text-xs text-muted">#{i + 1}</span>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning">{rec.priority.toUpperCase()}</Badge>
                        <span className="font-semibold text-text">{rec.issue}</span>
                      </div>
                      <p className="text-muted">{rec.suggested_action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Data Limitations & Disclosures */}
          <Card className="p-5 bg-surface border-border space-y-2">
            <div className="flex items-center gap-2 text-muted">
              <ShieldAlert className="w-4 h-4 text-warning" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text">Audit Scope & Methodological Disclosures</h3>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted">
              {summary.data_limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
