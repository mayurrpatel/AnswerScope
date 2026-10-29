import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle, Sparkles, FileCheck2 } from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { QuickAuditModal } from "../components/QuickAuditModal";
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
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [crawlJobs, setCrawlJobs] = useState<Record<string, CrawlJob>>({});
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
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
        description: description.trim() || undefined,
        target_audience: targetAudience.trim() || undefined,
        brand_aliases: aliases,
        competitor_domains: compDomains,
        max_crawl_pages: maxPages,
      });
      setName("");
      setCanonicalUrl("");
      setDescription("");
      setTargetAudience("");
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
      setTimeout(() => loadWebsites(), 2000);
    } catch (err: any) {
      alert(`Crawl failed to start: ${err?.response?.data?.detail || err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Websites & Audits</h1>
          <p className="text-sm text-muted mt-1">
            Manage tracked domains, crawl restrictions, and run comprehensive answer readiness audits.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Manual Website Entry
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowQuickModal(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" /> Guided Quick Audit
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
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
                <Label>Brand / Website Name *</Label>
                <Input
                  required
                  placeholder="e.g. NexusFlow Automation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Canonical URL *</Label>
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
                <Label>Business Description (Optional)</Label>
                <Input
                  placeholder="Core offerings and product scope"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <Label>Target Audience (Optional)</Label>
                <Input
                  placeholder="e.g. Operations leads, IT directors"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
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
              <div className="flex gap-2 justify-center mt-2">
                <Button variant="secondary" onClick={() => setShowQuickModal(true)}>
                  Guided Quick Audit
                </Button>
                <Button variant="primary" onClick={() => setShowAddForm(true)}>
                  Add Website Manually
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((site) => (
            <Card key={site.id} className="p-5 bg-surface border-border flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-bold text-text text-base leading-tight">{site.name}</h3>
                  <Badge variant={site.is_active ? "success" : "default"} className="text-[10px]">
                    {site.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-muted mb-3 break-all">{site.canonical_url}</p>

                {site.description && (
                  <p className="text-xs text-muted mb-3 line-clamp-2">{site.description}</p>
                )}

                <div className="space-y-1 text-xs text-muted">
                  <div className="flex justify-between">
                    <span>Max Pages Crawl:</span>
                    <span className="font-medium text-text">{site.max_crawl_pages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Robots.txt Enforced:</span>
                    <span className="font-medium text-text">{site.robots_txt_respected ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Crawled:</span>
                    <span className="font-medium text-text">
                      {site.last_crawled_at ? new Date(site.last_crawled_at).toLocaleDateString() : "Never"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <Link to={`/audits?website_id=${site.id}`}>
                    <Button variant="secondary" className="p-2 text-xs" title="View Audits">
                      <FileCheck2 size={14} />
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={() => handleCrawl(site)}
                    className="p-2 text-xs"
                    title="Crawl Pages"
                  >
                    <RefreshCw size={14} />
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => handleDelete(site.id)}
                  className="p-2 text-xs text-danger hover:bg-danger/10"
                  title="Delete Website"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Audit Modal */}
      <QuickAuditModal
        isOpen={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        onSuccess={() => loadWebsites()}
      />
    </div>
  );
}
