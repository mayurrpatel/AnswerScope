import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export const api = axios.create({ baseURL: API_BASE, timeout: 60000 });

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database: string;
}

export interface Website {
  id: string;
  name: string;
  canonical_url: string;
  domain: string;
  description?: string;
  target_audience?: string;
  brand_aliases: string[];
  competitor_domains: string[];
  robots_txt_respected: boolean;
  max_crawl_pages: number;
  crawl_delay_seconds: number;
  is_active: boolean;
  last_crawled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TargetQuestion {
  id: string;
  website_id: string;
  text: string;
  intent: "informational" | "commercial_investigation" | "transactional" | "navigational" | "unknown";
  topic?: string;
  target_audience?: string;
  priority: "critical" | "high" | "medium" | "low";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CrawlJob {
  id: string;
  website_id: string;
  status: "pending" | "running" | "completed" | "failed";
  pages_crawled: number;
  max_pages: number;
  max_depth: number;
  error_message?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

export interface QuestionAuditResult {
  id: string;
  audit_id: string;
  question_id: string;
  question_text?: string;
  question_intent?: string;
  readiness_score: number;
  status: "ready" | "partially_ready" | "needs_improvement" | "unanswered";
  direct_answer_found: boolean;
  direct_answer_snippet?: string;
  answer_clarity_score: number;
  content_depth_score: number;
  structured_data_present: boolean;
  structured_data_score: number;
  heading_structure_score: number;
  evidence_quality_score: number;
  relevant_page_urls: string[];
  evidence_snippets: Array<{ url: string; text: string; context?: string; score: number }>;
  missing_subtopics: string[];
  suggested_headings?: string[];
  suggested_schema_types?: string[];
  owner_confirmation_needed?: boolean;
  confidence_level: number;
  explanation?: string;
}

export interface AuditRecommendation {
  id: string;
  audit_id: string;
  question_id?: string;
  affected_page_url?: string;
  target_query?: string;
  identified_gap?: string;
  issue: string;
  supporting_evidence: string;
  why_it_helps: string;
  suggested_action: string;
  priority: "critical" | "high" | "medium" | "low";
  estimated_effort: "low" | "medium" | "high";
  is_ai_generated: boolean;
  owner_confirmation_note?: string;
  created_at: string;
}

export interface AnswerReadinessAudit {
  id: string;
  website_id: string;
  crawl_job_id?: string;
  status: "pending" | "running" | "completed" | "failed";
  overall_score: number;
  readiness_level: "excellent" | "good" | "fair" | "poor" | "missing";
  questions_analyzed: number;
  answered_count: number;
  partially_answered_count: number;
  unanswered_count: number;
  confidence_score: number;
  scoring_methodology?: Record<string, any>;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  question_results?: QuestionAuditResult[];
  recommendations?: AuditRecommendation[];
}

export interface QuickAuditPayload {
  url: string;
  name?: string;
  description?: string;
  target_audience?: string;
  questions: string[];
  max_pages?: number;
  respect_robots_txt?: boolean;
}

export interface VisibilityCitation {
  id: string;
  cited_url: string;
  cited_domain: string;
  title?: string;
  snippet?: string;
  position: number;
  matches_brand_domain: boolean;
  matches_competitor_domain: boolean;
}

export interface VisibilityObservation {
  id: string;
  question_id: string;
  question_text?: string;
  query_text: string;
  provider_name: string;
  model_name?: string;
  raw_response_snippet?: string;
  brand_mentioned: boolean;
  brand_mention_snippets: string[];
  competitor_mentions: Array<{ competitor: string; snippet: string }>;
  retrieved_at: string;
  is_simulated_fixture: boolean;
  citations: VisibilityCitation[];
}

export interface VisibilityJob {
  id: string;
  website_id: string;
  provider_name: string;
  status: "pending" | "running" | "completed" | "failed";
  total_questions: number;
  questions_completed: number;
  brand_mentions_count: number;
  brand_mention_rate: number;
  citations_count: number;
  competitor_mentions_count: number;
  questions_with_competitor_without_brand: number;
  domain_distribution: Record<string, number>;
  is_live_provider: boolean;
  error_message?: string;
  created_at: string;
  finished_at?: string;
  observations?: VisibilityObservation[];
}

export interface ProviderStatus {
  provider_name: string;
  is_configured: boolean;
  description: string;
  requires_key: string;
  supported_features: string[];
}

export interface CompetitorFinding {
  id: string;
  website_id: string;
  question_id: string;
  question_text?: string;
  competitor_domain: string;
  user_site_score: number;
  competitor_score: number;
  gap_type: string;
  competitor_urls: string[];
  missing_subtopics: string[];
  observed_facts: string;
  derived_findings: string;
  ai_suggestions?: string;
  priority: string;
  estimated_effort: string;
  created_at: string;
}

export interface CompetitorGapResponse {
  website_id: string;
  competitor_domain: string;
  total_questions: number;
  user_answered_count: number;
  competitor_answered_count: number;
  gaps_identified_count: number;
  findings: CompetitorFinding[];
}

export interface ReportSummary {
  website_id: string;
  website_name: string;
  canonical_url: string;
  generated_at: string;
  latest_audit?: AnswerReadinessAudit;
  latest_visibility?: VisibilityJob;
  competitor_gaps: CompetitorFinding[];
  top_recommendations: Array<{
    issue: string;
    suggested_action: string;
    priority: string;
    estimated_effort: string;
  }>;
  data_limitations: string[];
}

// API Methods
export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

export async function fetchWebsites(): Promise<Website[]> {
  const { data } = await api.get<Website[]>("/websites");
  return data;
}

export async function createWebsite(payload: Partial<Website>): Promise<Website> {
  const { data } = await api.post<Website>("/websites", payload);
  return data;
}

export async function deleteWebsite(id: string): Promise<void> {
  await api.delete(`/websites/${id}`);
}

export async function fetchQuestions(websiteId?: string): Promise<TargetQuestion[]> {
  const params = websiteId ? { website_id: websiteId } : {};
  const { data } = await api.get<TargetQuestion[]>("/questions", { params });
  return data;
}

export async function createQuestion(payload: Partial<TargetQuestion>): Promise<TargetQuestion> {
  const { data } = await api.post<TargetQuestion>("/questions", payload);
  return data;
}

export async function createQuestionsBatch(payload: { website_id: string; questions: string[]; topic?: string }): Promise<TargetQuestion[]> {
  const { data } = await api.post<TargetQuestion[]>("/questions/batch", payload);
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await api.delete(`/questions/${id}`);
}

export async function startCrawl(websiteId: string, maxPages = 15): Promise<CrawlJob> {
  const { data } = await api.post<CrawlJob>("/crawler/crawl", { website_id: websiteId, max_pages: maxPages });
  return data;
}

export async function fetchCrawlJob(jobId: string): Promise<CrawlJob> {
  const { data } = await api.get<CrawlJob>(`/crawler/jobs/${jobId}`);
  return data;
}

export async function runAudit(websiteId: string, crawlJobId?: string): Promise<AnswerReadinessAudit> {
  const { data } = await api.post<AnswerReadinessAudit>("/audits/run", { website_id: websiteId, crawl_job_id: crawlJobId });
  return data;
}

export async function quickRunAudit(payload: QuickAuditPayload): Promise<AnswerReadinessAudit> {
  const { data } = await api.post<AnswerReadinessAudit>("/audits/quick-run", payload);
  return data;
}

export async function seedSampleAudit(): Promise<AnswerReadinessAudit> {
  const { data } = await api.post<AnswerReadinessAudit>("/audits/seed-sample");
  return data;
}

export async function fetchAudits(websiteId?: string): Promise<AnswerReadinessAudit[]> {
  const params = websiteId ? { website_id: websiteId } : {};
  const { data } = await api.get<AnswerReadinessAudit[]>("/audits", { params });
  return data;
}

export async function fetchAuditDetails(auditId: string): Promise<AnswerReadinessAudit> {
  const { data } = await api.get<AnswerReadinessAudit>(`/audits/${auditId}`);
  return data;
}

export async function fetchProviders(): Promise<ProviderStatus[]> {
  const { data } = await api.get<ProviderStatus[]>("/visibility/providers");
  return data;
}

export async function runVisibilityJob(websiteId: string, providerName = "tavily", useTestFixture = false): Promise<VisibilityJob> {
  const { data } = await api.post<VisibilityJob>("/visibility/run", {
    website_id: websiteId,
    provider_name: providerName,
    use_test_fixture: useTestFixture,
  });
  return data;
}

export async function fetchVisibilityJobs(websiteId?: string): Promise<VisibilityJob[]> {
  const params = websiteId ? { website_id: websiteId } : {};
  const { data } = await api.get<VisibilityJob[]>("/visibility/jobs", { params });
  return data;
}

export async function fetchVisibilityJobDetails(jobId: string): Promise<VisibilityJob> {
  const { data } = await api.get<VisibilityJob>(`/visibility/jobs/${jobId}`);
  return data;
}

export async function analyzeCompetitor(websiteId: string, competitorDomain: string): Promise<CompetitorGapResponse> {
  const { data } = await api.post<CompetitorGapResponse>("/competitors/analyze", {
    website_id: websiteId,
    competitor_domain: competitorDomain,
  });
  return data;
}

export async function fetchCompetitorFindings(websiteId: string): Promise<CompetitorFinding[]> {
  const { data } = await api.get<CompetitorFinding[]>(`/competitors/findings/${websiteId}`);
  return data;
}

export async function fetchReportSummary(websiteId: string): Promise<ReportSummary> {
  const { data } = await api.get<ReportSummary>(`/reports/summary/${websiteId}`);
  return data;
}

export function getExportCsvUrl(auditId: string): string {
  return `/api/reports/export/csv/${auditId}`;
}

export function getExportPdfUrl(auditId: string): string {
  return `/api/reports/export/pdf/${auditId}`;
}

export function getExportHtmlUrl(auditId: string): string {
  return `/api/reports/export/html/${auditId}`;
}
