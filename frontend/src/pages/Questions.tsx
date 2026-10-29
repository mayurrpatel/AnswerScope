import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { HelpCircle, Plus, Trash2, Search, Filter, Sparkles, Layers } from "lucide-react";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Select, Label, Textarea } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  fetchWebsites,
  fetchQuestions,
  createQuestion,
  createQuestionsBatch,
  deleteQuestion,
  type Website,
  type TargetQuestion,
} from "../services/api";

export function Questions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlWebsiteId = searchParams.get("website_id") || "";

  const [websites, setWebsites] = useState<Website[]>([]);
  const [questions, setQuestions] = useState<TargetQuestion[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(urlWebsiteId);
  const [intentFilter, setIntentFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [batchTexts, setBatchTexts] = useState("");
  const [questionIntent, setQuestionIntent] = useState("unknown");
  const [questionPriority, setQuestionPriority] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedWebsiteId]);

  async function loadData() {
    setLoading(true);
    try {
      const [wList, qList] = await Promise.all([
        fetchWebsites(),
        fetchQuestions(selectedWebsiteId || undefined),
      ]);
      setWebsites(wList);
      setQuestions(qList);
      if (!selectedWebsiteId && wList.length > 0) {
        setSelectedWebsiteId(wList[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWebsiteId) {
      alert("Please select or add a website first.");
      return;
    }
    setSubmitting(true);

    try {
      if (batchMode) {
        const lines = batchTexts
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        await createQuestionsBatch({
          website_id: selectedWebsiteId,
          questions: lines,
          topic: topic || undefined,
        });
        setBatchTexts("");
      } else {
        await createQuestion({
          website_id: selectedWebsiteId,
          text: questionText,
          intent: questionIntent as any,
          priority: questionPriority,
          topic: topic || undefined,
        });
        setQuestionText("");
      }
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Error saving question: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this target question?")) return;
    try {
      await deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      alert("Failed to delete question");
    }
  }

  // Filtered list
  const filteredQuestions = questions.filter((q) => {
    if (intentFilter && q.intent !== intentFilter) return false;
    if (priorityFilter && q.priority !== priorityFilter) return false;
    if (searchQuery && !q.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const intentBadgeVariant = (intent: string): "primary" | "info" | "warning" | "success" | "secondary" => {
    switch (intent) {
      case "informational":
        return "info";
      case "commercial_investigation":
        return "primary";
      case "transactional":
        return "success";
      case "navigational":
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Target Questions</h1>
          <p className="text-sm text-muted mt-1">
            Questions potential customers ask search and answer engines that your content should answer.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Questions
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-surface border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>Associated Website</Label>
            <Select
              value={selectedWebsiteId}
              onChange={(e) => {
                setSelectedWebsiteId(e.target.value);
                setSearchParams(e.target.value ? { website_id: e.target.value } : {});
              }}
            >
              <option value="">All Websites</option>
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.domain})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Search Intent</Label>
            <Select value={intentFilter} onChange={(e) => setIntentFilter(e.target.value)}>
              <option value="">All Intents</option>
              <option value="informational">Informational</option>
              <option value="commercial_investigation">Commercial Investigation</option>
              <option value="transactional">Transactional</option>
              <option value="navigational">Navigational</option>
              <option value="unknown">Unknown</option>
            </Select>
          </div>

          <div>
            <Label>Priority</Label>
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>

          <div>
            <Label>Search Text</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
              <Input
                className="pl-9"
                placeholder="Filter questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <Card className="p-6 bg-surface border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-text">
              {batchMode ? "Batch Add Target Questions" : "Add Single Target Question"}
            </h2>
            <button
              onClick={() => setBatchMode(!batchMode)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{batchMode ? "Switch to Single Entry" : "Switch to Batch Import"}</span>
            </button>
          </div>

          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <Label>Website</Label>
              <Select
                required
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
              >
                <option value="" disabled>
                  Select a website
                </option>
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.domain})
                  </option>
                ))}
              </Select>
            </div>

            {batchMode ? (
              <div>
                <Label>Question List (one question per line)</Label>
                <Textarea
                  required
                  rows={5}
                  placeholder={`What is the pricing model for your product?\nHow does the API integration work?\nWhat are the top alternatives?`}
                  value={batchTexts}
                  onChange={(e) => setBatchTexts(e.target.value)}
                />
                <p className="text-xs text-muted mt-1">Search intent will be automatically categorized.</p>
              </div>
            ) : (
              <>
                <div>
                  <Label>Question Text</Label>
                  <Input
                    required
                    placeholder="e.g. How does Answer Engine Optimization improve visibility?"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Search Intent</Label>
                    <Select value={questionIntent} onChange={(e) => setQuestionIntent(e.target.value)}>
                      <option value="unknown">Auto-Classify / Unknown</option>
                      <option value="informational">Informational</option>
                      <option value="commercial_investigation">Commercial Investigation</option>
                      <option value="transactional">Transactional</option>
                      <option value="navigational">Navigational</option>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={questionPriority}
                      onChange={(e) => setQuestionPriority(e.target.value as any)}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Topic or Category (Optional)</Label>
              <Input
                placeholder="e.g. Pricing, Security, Features"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Saving..." : "Save Questions"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Questions Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner className="w-8 h-8" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No Questions Match Current Filters"
            description="Add questions your target audience might ask, or adjust your active filters above."
            icon={<HelpCircle className="w-8 h-8 text-primary" />}
            action={
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                Add Question
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden bg-surface border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-xs font-semibold uppercase text-muted">
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4">Search Intent</th>
                  <th className="py-3 px-4">Topic</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-background/40 transition">
                    <td className="py-3 px-4 font-medium text-text max-w-md">{q.text}</td>
                    <td className="py-3 px-4">
                      <Badge variant={intentBadgeVariant(q.intent)}>
                        {q.intent.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted">{q.topic || "General"}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          q.priority === "critical"
                            ? "danger"
                            : q.priority === "high"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {q.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-muted hover:text-danger p-1 rounded transition"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border bg-surface text-xs text-muted flex justify-between">
            <span>Showing {filteredQuestions.length} of {questions.length} questions</span>
          </div>
        </Card>
      )}
    </div>
  );
}
