import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, test, expect } from "vitest";
import App from "./App";

vi.mock("./services/api", () => ({
  fetchHealth: vi.fn().mockResolvedValue({
    status: "ok",
    service: "AI Search Visibility API",
    version: "1.0.0",
    database: "ok",
  }),
  fetchWebsites: vi.fn().mockResolvedValue([
    {
      id: "w1",
      name: "Acme Corp",
      domain: "acme.com",
      canonical_url: "https://acme.com",
      brand_aliases: ["Acme"],
      competitor_domains: ["rival.com"],
      robots_txt_respected: true,
      max_crawl_pages: 15,
      crawl_delay_seconds: 1.0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]),
  fetchQuestions: vi.fn().mockResolvedValue([
    {
      id: "q1",
      website_id: "w1",
      text: "What is Acme Analytics?",
      intent: "informational",
      priority: "high",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]),
  fetchAudits: vi.fn().mockResolvedValue([
    {
      id: "a1",
      website_id: "w1",
      status: "completed",
      overall_score: 84.5,
      readiness_level: "good",
      questions_analyzed: 1,
      answered_count: 1,
      partially_answered_count: 0,
      unanswered_count: 0,
      confidence_score: 0.88,
      created_at: new Date().toISOString(),
    },
  ]),
  fetchVisibilityJobs: vi.fn().mockResolvedValue([
    {
      id: "v1",
      website_id: "w1",
      provider_name: "test_fixture",
      status: "completed",
      total_questions: 1,
      questions_completed: 1,
      brand_mentions_count: 1,
      brand_mention_rate: 100.0,
      citations_count: 3,
      competitor_mentions_count: 1,
      questions_with_competitor_without_brand: 0,
      domain_distribution: { "acme.com": 1 },
      is_live_provider: false,
      created_at: new Date().toISOString(),
    },
  ]),
}));

test("renders navigation and overview metrics", async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  // Check navigation
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  expect(screen.getByText("Dashboard")).toBeInTheDocument();
  expect(screen.getByText("Websites")).toBeInTheDocument();
  expect(screen.getByText("Questions")).toBeInTheDocument();
  expect(screen.getByText("Answer Readiness")).toBeInTheDocument();
  expect(screen.getByText("AI Search Visibility")).toBeInTheDocument();

  // Check Dashboard headings
  expect(await screen.findByText("Platform Overview")).toBeInTheDocument();
  expect(screen.getByText("Website Content Answer-Readiness")).toBeInTheDocument();
  expect(screen.getByText("AI Search & Engine Visibility (Provider Observations)")).toBeInTheDocument();
});
