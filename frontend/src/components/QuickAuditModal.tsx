import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Globe, AlertCircle, CheckCircle2, ArrowRight, X } from "lucide-react";
import { Button } from "./ui/Button";
import { Input, Textarea, Label } from "./ui/Input";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { quickRunAudit, type AnswerReadinessAudit } from "../services/api";

const EXAMPLE_QUESTIONS = [
  "What services does this company provide?",
  "How much does this service cost?",
  "How does this product work?",
  "What are the benefits of this service?",
  "How does this company compare with alternatives?",
];

interface QuickAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (audit: AnswerReadinessAudit) => void;
}

export function QuickAuditModal({ isOpen, onClose, onSuccess }: QuickAuditModalProps) {
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [maxPages, setMaxPages] = useState(15);
  const [respectRobots, setRespectRobots] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoadExamples = () => {
    setQuestionsText(EXAMPLE_QUESTIONS.join("\n"));
  };

  const handleLoadSampleSite = () => {
    setUrl("https://sample-site.nexusflow.io/");
    setName("NexusFlow Workflow Automation");
    setDescription("Intelligent enterprise workflow automation platform orchestrating APIs, document AI, and event routing.");
    setTargetAudience("Operations Teams, Engineering Leads, Product Managers");
    setQuestionsText(EXAMPLE_QUESTIONS.join("\n"));
    setMaxPages(15);
    setError(null);
  };

  const validateUrl = (raw: string): string | null => {
    if (!raw.trim()) return "Website URL is required.";
    const trimmed = raw.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
        return "Please enter a valid website URL or domain (e.g. https://example.com).";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const urlError = validateUrl(url);
    if (urlError) {
      setError(urlError);
      return;
    }

    const questions = questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    if (questions.length === 0) {
      setError("Please provide at least one target question or search query to evaluate.");
      return;
    }

    setSubmitting(true);
    setProgressStep(1);

    // Simulate progress updates during async execution
    const t1 = setTimeout(() => setProgressStep(2), 700);
    const t2 = setTimeout(() => setProgressStep(3), 1600);
    const t3 = setTimeout(() => setProgressStep(4), 2600);

    try {
      const audit = await quickRunAudit({
        url: url.trim(),
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        target_audience: targetAudience.trim() || undefined,
        questions,
        max_pages: maxPages,
        respect_robots_txt: respectRobots,
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setProgressStep(5);

      if (onSuccess) {
        onSuccess(audit);
      }
      onClose();
      navigate(`/audits?website_id=${audit.website_id}`);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setError(err?.response?.data?.detail || err?.message || "Audit execution failed. Please check the URL and try again.");
    } finally {
      setSubmitting(false);
      setProgressStep(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-2xl transition-all my-8">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-contrast font-bold text-sm">
              <Globe size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text leading-tight">Start New AI Search Audit</h2>
              <p className="text-xs text-muted">Analyze website pages for answer readiness and content gaps</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-muted hover:text-text p-1.5 rounded-md hover:bg-background transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Offline Quick-Start Banner */}
        <div className="mb-5 p-3.5 rounded-lg border border-border bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-text flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" /> Offline Sample Website Available
            </p>
            <p className="text-muted mt-0.5">
              Instantly audit the verified local sample website <code>sample-site.nexusflow.io</code> without external internet access.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleLoadSampleSite}
            disabled={submitting}
            className="text-xs shrink-0"
          >
            Load Sample Site
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {submitting ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <LoadingSpinner className="w-10 h-10 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-text">Running AnswerScope Audit...</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {progressStep === 1 && "Validating destination URL and SSRF security policies..."}
                {progressStep === 2 && "Crawling publicly accessible pages & internal link structure..."}
                {progressStep === 3 && "Extracting page headings, Schema.org JSON-LD, and body text..."}
                {progressStep === 4 && "Evaluating answer directness, completeness, and content gaps..."}
                {progressStep === 5 && "Audit complete! Redirecting to report..."}
              </p>
            </div>
            <div className="w-full max-w-xs bg-border h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, progressStep * 25)}%` }}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="audit-url">Website URL *</Label>
              <Input
                id="audit-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted mt-1">
                Domain crawl respects robots.txt and strictly blocks private/internal network addresses (SSRF shield).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="audit-name">Website or Brand Name (Optional)</Label>
                <Input
                  id="audit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NexusFlow Automation"
                />
              </div>
              <div>
                <Label htmlFor="audit-audience">Target Audience (Optional)</Label>
                <Input
                  id="audit-audience"
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. IT Managers, Operations Leads"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="audit-desc">Business Description (Optional)</Label>
              <Input
                id="audit-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of product offerings and core capabilities"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="audit-questions">Target Search Queries & Questions *</Label>
                <button
                  type="button"
                  onClick={handleLoadExamples}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  <Sparkles size={12} /> Insert 5 Example Questions
                </button>
              </div>
              <Textarea
                id="audit-questions"
                rows={4}
                value={questionsText}
                onChange={(e) => setQuestionsText(e.target.value)}
                placeholder="Enter questions (one per line):&#10;What services does this company provide?&#10;How much does this service cost?&#10;How does this product work?&#10;What are the benefits of this service?&#10;How does this company compare with alternatives?"
                className="text-xs font-mono"
                required
              />
              <p className="text-xs text-muted mt-1">
                Each question will be evaluated for direct answers, content depth, heading relevance, and structured data.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label htmlFor="audit-max-pages">Max Pages to Crawl</Label>
                <Input
                  id="audit-max-pages"
                  type="number"
                  min={1}
                  max={50}
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 15)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="audit-robots"
                  type="checkbox"
                  checked={respectRobots}
                  onChange={(e) => setRespectRobots(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="audit-robots" className="text-xs text-text cursor-pointer">
                  Respect <code>robots.txt</code> crawl restrictions
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-4">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting} className="flex items-center gap-1.5">
                <span>Run Complete Audit</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
