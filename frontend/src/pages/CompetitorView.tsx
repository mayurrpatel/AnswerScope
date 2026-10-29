import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Users2, Play, ExternalLink, AlertCircle, ArrowUpRight, CheckCircle2 } from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select, Input, Label } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  fetchWebsites,
  analyzeCompetitor,
  fetchCompetitorFindings,
  type Website,
  type CompetitorFinding,
} from "../services/api";

export function CompetitorView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlWebsiteId = searchParams.get("website_id") || "";

  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(urlWebsiteId);
  const [competitorDomain, setCompetitorDomain] = useState<string>("");
  const [findings, setFindings] = useState<CompetitorFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadWebsites();
  }, []);

  useEffect(() => {
    if (selectedWebsiteId) {
      loadFindings(selectedWebsiteId);
      const site = websites.find((w) => w.id === selectedWebsiteId);
      if (site && site.competitor_domains && site.competitor_domains.length > 0) {
        setCompetitorDomain(site.competitor_domains[0]);
      }
    }
  }, [selectedWebsiteId, websites]);

  async function loadWebsites() {
    try {
      const siteList = await fetchWebsites();
      setWebsites(siteList);
      if (siteList.length > 0) {
        const activeSite = selectedWebsiteId || siteList[0].id;
        setSelectedWebsiteId(activeSite);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadFindings(siteId: string) {
    try {
      const data = await fetchCompetitorFindings(siteId);
      setFindings(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAnalyze() {
    if (!selectedWebsiteId || !competitorDomain) return;
    setAnalyzing(true);
    try {
      const res = await analyzeCompetitor(selectedWebsiteId, competitorDomain);
      setFindings(res.findings);
    } catch (err: any) {
      alert(`Competitor analysis failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">Content Gap Analysis</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-text">Competitor Content Gap Analyzer</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Compare target question answer-readiness against competitor pages and detect missing subtopics.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleAnalyze}
          disabled={analyzing || !selectedWebsiteId || !competitorDomain}
          className="flex items-center gap-1.5"
        >
          {analyzing ? <LoadingSpinner className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{analyzing ? "Analyzing Content..." : "Analyze Competitor Gaps"}</span>
        </Button>
      </div>

      {/* Selector Card */}
      <Card className="p-4 bg-surface border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Your Website</Label>
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
            <Label>Competitor Domain</Label>
            <Input
              placeholder="e.g. competitor.com"
              value={competitorDomain}
              onChange={(e) => setCompetitorDomain(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Findings List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner className="w-8 h-8" />
        </div>
      ) : findings.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No Competitor Gap Findings Recorded"
            description="Enter a competitor domain above and click 'Analyze Competitor Gaps' to compare content coverage."
            icon={<Users2 className="w-8 h-8 text-primary" />}
            action={
              <Button variant="primary" onClick={handleAnalyze} disabled={analyzing || !competitorDomain}>
                Run Initial Analysis
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">
            Content Gap Findings for {competitorDomain || "Competitor"} ({findings.length})
          </h2>

          <div className="space-y-4">
            {findings.map((f) => (
              <Card key={f.id} className="p-5 bg-surface border-border space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-text">{f.question_text || "Target Question"}</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted">Your Site Score: <b>{f.user_site_score.toFixed(0)}/100</b></span>
                      <span>•</span>
                      <span className="text-muted">Competitor Score: <b>{f.competitor_score.toFixed(0)}/100</b></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={f.gap_type === "unanswered_by_user" ? "danger" : f.gap_type === "competitor_superior" ? "warning" : "info"}>
                      {f.gap_type.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <Badge variant="secondary">Effort: {f.estimated_effort}</Badge>
                  </div>
                </div>

                {/* 3 Clearly Separated Layers */}
                <div className="grid grid-cols-1 gap-2 pt-2 text-xs">
                  <div className="p-2.5 rounded bg-background border border-border">
                    <span className="font-semibold text-text block mb-1">1. Observed Facts:</span>
                    <p className="text-muted">{f.observed_facts}</p>
                  </div>

                  <div className="p-2.5 rounded bg-background border border-border">
                    <span className="font-semibold text-text block mb-1">2. Derived Findings:</span>
                    <p className="text-muted">{f.derived_findings}</p>
                  </div>

                  {f.ai_suggestions && (
                    <div className="p-2.5 rounded bg-primary/10 border border-primary/20 text-primary">
                      <span className="font-semibold block mb-1">3. Recommended Action (for human review):</span>
                      <p>{f.ai_suggestions}</p>
                    </div>
                  )}
                </div>

                {/* Competitor URLs */}
                {f.competitor_urls.length > 0 && (
                  <div className="pt-1 text-xs text-muted flex items-center gap-2">
                    <span>Competitor Source:</span>
                    <a
                      href={f.competitor_urls[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-mono truncate"
                    >
                      <span>{f.competitor_urls[0]}</span>
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
