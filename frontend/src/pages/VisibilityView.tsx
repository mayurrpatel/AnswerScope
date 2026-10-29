import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Eye,
  Play,
  Key,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ExternalLink,
  Info,
} from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select, Label } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  fetchWebsites,
  fetchProviders,
  fetchVisibilityJobs,
  fetchVisibilityJobDetails,
  runVisibilityJob,
  type Website,
  type ProviderStatus,
  type VisibilityJob,
} from "../services/api";

export function VisibilityView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlWebsiteId = searchParams.get("website_id") || "";

  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(urlWebsiteId);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("test_fixture");
  const [jobs, setJobs] = useState<VisibilityJob[]>([]);
  const [currentJob, setCurrentJob] = useState<VisibilityJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedWebsiteId) {
      loadJobsForSite(selectedWebsiteId);
    }
  }, [selectedWebsiteId]);

  async function loadInitial() {
    try {
      const [siteList, provList] = await Promise.all([
        fetchWebsites(),
        fetchProviders(),
      ]);
      setWebsites(siteList);
      setProviders(provList);
      if (siteList.length > 0) {
        const activeSite = selectedWebsiteId || siteList[0].id;
        setSelectedWebsiteId(activeSite);
        await loadJobsForSite(activeSite);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadJobsForSite(siteId: string) {
    try {
      const jobList = await fetchVisibilityJobs(siteId);
      setJobs(jobList);
      if (jobList.length > 0) {
        const details = await fetchVisibilityJobDetails(jobList[0].id);
        setCurrentJob(details);
      } else {
        setCurrentJob(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRunJob() {
    if (!selectedWebsiteId) return;
    setRunning(true);
    try {
      const isFixture = selectedProvider === "test_fixture";
      const newJob = await runVisibilityJob(selectedWebsiteId, selectedProvider, isFixture);
      const full = await fetchVisibilityJobDetails(newJob.id);
      setCurrentJob(full);
      setJobs((prev) => [newJob, ...prev]);
    } catch (err: any) {
      alert(`Visibility run failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function selectJob(jobId: string) {
    try {
      setLoading(true);
      const full = await fetchVisibilityJobDetails(jobId);
      setCurrentJob(full);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info">Capability B</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-text">AI Search & Engine Visibility</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Measures whether your brand is mentioned or cited in real external search and AI engine queries.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleRunJob}
          disabled={running || !selectedWebsiteId}
          className="flex items-center gap-1.5"
        >
          {running ? <LoadingSpinner className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{running ? "Querying Providers..." : "Run Visibility Audit"}</span>
        </Button>
      </div>

      {/* Provider Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {providers.map((p) => (
          <Card key={p.provider_name} className="p-4 bg-surface border-border">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-wider text-text">
                {p.provider_name.replace("_", " ")}
              </span>
              <Badge variant={p.is_configured ? "success" : "secondary"}>
                {p.is_configured ? "Configured" : "Unconfigured"}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-2">{p.description}</p>
            <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-xs text-muted">
              <span>Required Key:</span>
              <code className="text-text font-mono text-xs">{p.requires_key}</code>
            </div>
          </Card>
        ))}
      </div>

      {/* Controls Card */}
      <Card className="p-4 bg-surface border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Website</Label>
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
            <Label>Data Provider</Label>
            <Select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
              <option value="test_fixture">Test Fixture (Built-in Demo / Verification)</option>
              <option value="tavily">Tavily Search API (Live)</option>
              <option value="serpapi">SerpAPI Google Search (Live)</option>
            </Select>
          </div>

          <div>
            <Label>Observation History</Label>
            <Select
              value={currentJob?.id || ""}
              onChange={(e) => selectJob(e.target.value)}
              disabled={jobs.length === 0}
            >
              {jobs.length === 0 && <option value="">No previous records</option>}
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {new Date(j.created_at).toLocaleString()} — {j.provider_name} ({j.brand_mention_rate}% mentions)
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Visibility Job Results */}
      {loading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner className="w-8 h-8" />
        </div>
      ) : !currentJob ? (
        <Card className="p-8">
          <EmptyState
            title="No Visibility Observations Recorded"
            description="Select a provider and click 'Run Visibility Audit' to query external search and answer providers."
            icon={<Eye className="w-8 h-8 text-secondary" />}
            action={
              <Button variant="primary" onClick={handleRunJob} disabled={running}>
                Record Initial Observations
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Synthetic Fixture Notice */}
          {!currentJob.is_live_provider && (
            <div className="p-3 rounded-md border border-accent/40 bg-accent/10 text-accent text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                <b>Deterministic Test Fixture:</b> These observations are generated by the verification fixture for testing. Live external API credentials were not used for this recording.
              </span>
            </div>
          )}

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-surface border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Brand Mention Rate</span>
              <div className="mt-2 text-3xl font-bold text-text">
                {currentJob.brand_mention_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted mt-2">
                Denominator: {currentJob.brand_mentions_count} mentions in {currentJob.total_questions} questions
              </p>
            </Card>

            <Card className="p-5 bg-surface border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Citations Logged</span>
              <div className="mt-2 text-3xl font-bold text-accent">{currentJob.citations_count}</div>
              <p className="text-xs text-muted mt-2">Source URLs referenced</p>
            </Card>

            <Card className="p-5 bg-surface border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Competitor References</span>
              <div className="mt-2 text-3xl font-bold text-warning">{currentJob.competitor_mentions_count}</div>
              <p className="text-xs text-muted mt-2">Competitor brands mentioned</p>
            </Card>

            <Card className="p-5 bg-surface border-border">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Competitor Only Mentions</span>
              <div className="mt-2 text-3xl font-bold text-danger">
                {currentJob.questions_with_competitor_without_brand}
              </div>
              <p className="text-xs text-muted mt-2">Questions where competitor appeared but you did not</p>
            </Card>
          </div>

          {/* Observations List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text">Query Observations ({currentJob.observations?.length || 0})</h2>

            <div className="space-y-3">
              {currentJob.observations?.map((obs, idx) => (
                <Card key={obs.id || idx} className="p-5 bg-surface border-border space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted">Q{idx + 1}:</span>
                      <h3 className="text-sm font-semibold text-text">{obs.query_text}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={obs.brand_mentioned ? "success" : "danger"}>
                        {obs.brand_mentioned ? "Brand Mentioned" : "No Brand Mention"}
                      </Badge>
                      <Badge variant="secondary">{obs.provider_name}</Badge>
                    </div>
                  </div>

                  {obs.raw_response_snippet && (
                    <div className="p-3 rounded-md bg-background border border-border text-xs text-muted">
                      <span className="font-semibold text-text block mb-1">Answer Summary / Overview:</span>
                      <p>{obs.raw_response_snippet}</p>
                    </div>
                  )}

                  {/* Mentions & Citations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="font-semibold text-text block mb-1">Competitor Mentions:</span>
                      {obs.competitor_mentions.length > 0 ? (
                        <div className="space-y-1">
                          {obs.competitor_mentions.map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-warning">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{c.competitor}: {c.snippet}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted">None detected</p>
                      )}
                    </div>

                    <div>
                      <span className="font-semibold text-text block mb-1">Cited Domains & Sources:</span>
                      {obs.citations.length > 0 ? (
                        <ul className="space-y-1">
                          {obs.citations.map((cit, i) => (
                            <li key={i} className="flex items-center justify-between text-muted">
                              <span className="truncate max-w-[200px]">
                                #{cit.position} {cit.cited_domain}
                              </span>
                              <Badge variant={cit.matches_brand_domain ? "success" : "secondary"}>
                                {cit.matches_brand_domain ? "Brand Link" : "Third Party"}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted">No citations recorded</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
