import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  fetchWebsites,
  createWebsite,
  deleteWebsite,
  startCrawl,
  type Website,
  type CrawlJob,
} from "../services/api";

export function Websites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [crawlJobs, setCrawlJobs] = useState<Record<string, CrawlJob>>({});
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [brandAliases, setBrandAliases] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [maxPages, setMaxPages] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWebsites();
  }, []);

  async function loadWebsites() {
    try {
      setError(null);
      const data = await fetchWebsites();
      setWebsites(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load websites");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddWebsite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const aliases = brandAliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const compDomains = competitors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      await createWebsite({
        name,
        canonical_url: canonicalUrl,
        brand_aliases: aliases,
        competitor_domains: compDomains,
        max_crawl_pages: maxPages,
      });
      setName("");
      setCanonicalUrl("");
      setBrandAliases("");
      setCompetitors("");
      setShowAddForm(false);
      await loadWebsites();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to add website");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this website? Associated audits and pages will be removed.")) {
      return;
    }
    try {
      await deleteWebsite(id);
      await loadWebsites();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete website");
    }
  }

  async function handleCrawl(site: Website) {
    try {
      const job = await startCrawl(site.id, site.max_crawl_pages);
      setCrawlJobs((prev) => ({ ...prev, [site.id]: job }));
      alert(`Crawl job started for ${site.domain}! Pages will be extracted in the background.`);
      setTimeout(() => loadWebsites(), 2000);
    } catch (err: any) {
      alert(`Could not start crawl: ${err?.response?.data?.detail || err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Registered Websites</h1>
          <p className="text-sm text-muted mt-1">
            Manage your verified domains, brand aliases, and competitor benchmarks.
          </p>
        </div>
        <Button
          variant={showAddForm ? "secondary" : "primary"}
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5"
        >
          {showAddForm ? "Cancel" : <><Plus className="w-4 h-4" /> Add Website</>}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-danger/30 bg-danger/10 text-danger text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Website Form Modal/Card */}
      {showAddForm && (
        <Card className="p-6 bg-surface border-border">
          <h2 className="text-base font-semibold text-text mb-4">Register New Website</h2>
          <form onSubmit={handleAddWebsite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Brand / Website Name</Label>
                <Input
                  required
                  placeholder="e.g. Acme Cloud Analytics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Canonical URL</Label>
                <Input
                  required
                  placeholder="https://example.com"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Brand Aliases (comma-separated)</Label>
                <Input
                  placeholder="Acme, Acme Analytics, acme.com"
                  value={brandAliases}
                  onChange={(e) => setBrandAliases(e.target.value)}
                />
                <p className="text-xs text-muted mt-1">Used to identify brand mentions in search answers.</p>
              </div>
              <div>
                <Label>Competitor Domains (comma-separated)</Label>
                <Input
                  placeholder="competitor1.com, rival.io"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                />
                <p className="text-xs text-muted mt-1">Used for content gap & visibility comparison.</p>
              </div>
            </div>

            <div className="w-full sm:w-48">
              <Label>Max Crawl Pages</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 15)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Saving..." : "Save Website"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Websites List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner className="w-8 h-8" />
        </div>
      ) : websites.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No Websites Added Yet"
            description="Add your first website to start crawling pages and auditing answer readiness."
            icon={<Globe className="w-8 h-8 text-primary" />}
            action={
              <Button variant="primary" onClick={() => setShowAddForm(true)}>
                Add Website
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {websites.map((site) => (
            <Card key={site.id} className="p-5 bg-surface border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-text">{site.name}</h3>
                    <Badge variant="primary">{site.domain}</Badge>
                  </div>
                  <p className="text-xs text-muted font-mono">{site.canonical_url}</p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {site.brand_aliases?.map((alias, idx) => (
                      <Badge key={idx} variant="secondary">
                        Alias: {alias}
                      </Badge>
                    ))}
                    {site.competitor_domains?.map((comp, idx) => (
                      <Badge key={idx} variant="warning">
                        Comp: {comp}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleCrawl(site)}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                    <span>Crawl Pages</span>
                  </Button>

                  <Link to={`/questions?website_id=${site.id}`}>
                    <Button variant="secondary" className="text-xs">
                      Questions
                    </Button>
                  </Link>

                  <Link to={`/audits?website_id=${site.id}`}>
                    <Button variant="primary" className="text-xs">
                      Run Audit
                    </Button>
                  </Link>

                  <button
                    onClick={() => handleDelete(site.id)}
                    className="p-2 text-muted hover:text-danger rounded-md transition"
                    title="Delete Website"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {site.last_crawled_at && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>Last crawled: {new Date(site.last_crawled_at).toLocaleString()}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
