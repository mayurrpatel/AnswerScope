# PROJECT MEMORY — AI Search Visibility & Answer Engine Audit

## 1. Project Overview
The **AI Search Visibility & Answer Engine Audit** platform helps businesses evaluate whether their website content is sufficiently useful, complete, and structured to answer target user questions through search engines and AI answer engines.

The platform enforces strict separation between two capabilities:
1. **Capability A — Website Answer-Readiness Audit:**
   Crawls permitted website pages and analyzes whether their content directly answers relevant user questions clearly, accurately, and comprehensively with supporting evidence and structured schema markup.
2. **Capability B — AI Search Visibility Audit:**
   Measures whether a brand or its content appears in search results or AI-generated answers for target queries when supported data providers are configured. Records actual mentions, citations, competitor references, and source evidence.

**Core Principles:**
- Readiness and visibility are never conflated. (A site can have high readiness but low visibility, or vice versa).
- No simulated data is ever masqueraded as live search results. Test fixtures are explicitly marked `is_simulated_fixture = True`.
- Full deterministic auditing, evidence extraction, and scoring function out-of-the-box without requiring AI API keys.
- Centralized Tailwind CSS design tokens govern all visual styling globally.

---

## 2. Technical Architecture & Actual Versions

### Installed Versions
- **Frontend:** React 19.3.1, TypeScript 7.0.2, Vite 8.3.5, Tailwind CSS 4.3.3 (`@tailwindcss/vite`), React Router 7.18.5, Axios 1.21.0, Recharts 3.10.1, Lucide React 1.63.0, Vitest 5.0.5, React Testing Library 16.3.3.
- **Backend:** Python 3.14.3, FastAPI 0.162.0, SQLAlchemy 2.1.6, Alembic 1.20.1, Pydantic 2.14.1, HTTPX 0.28.1, BeautifulSoup4 4.15.0, ReportLab 5.1.0, pytest 9.2.0.
- **Database:** PostgreSQL (production target) / SQLite (development & testing default), Alembic migrations applied to head (`9d90e4f864a4_initial_schema.py`).

### Repository Structure
```text
ai-search-visibility-audit/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/AppShell.tsx
│   │   │   └── ui/ (Button, Card, Badge, Input, EmptyState, LoadingSpinner)
│   │   ├── pages/ (Dashboard, Websites, Questions, AuditView, VisibilityView, CompetitorView, ReportsView)
│   │   ├── services/api.ts
│   │   ├── config/theme.ts
│   │   ├── styles/ (design-tokens.css, index.css, tokens.test.ts)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── api/ (health, websites, questions, crawler, audits, visibility, competitors, reports)
│   │   ├── core/ (config.py)
│   │   ├── db/ (session.py)
│   │   ├── models/ (website, question, crawler, audit, visibility, competitor)
│   │   ├── schemas/ (website, question, crawler, audit, visibility, competitor, report)
│   │   ├── services/
│   │   │   ├── crawler/ (security.py, robots.py, parser.py, crawler.py)
│   │   │   ├── questions/ (classifier.py)
│   │   │   ├── answer_readiness/ (matcher.py, evaluator.py)
│   │   │   ├── visibility/
│   │   │   ├── providers/ (base.py, tavily.py, serpapi.py, fixture.py, registry.py)
│   │   │   ├── competitors/ (analyzer.py)
│   │   │   ├── ai/ (service.py)
│   │   │   └── reports/ (exporter.py)
│   │   └── main.py
│   ├── alembic/ (env.py, versions/9d90e4f864a4_initial_schema.py)
│   ├── tests/ (test_security_ssrf, test_crawler_parser, test_classifier, test_answer_readiness, test_visibility_provider, test_competitor_analyzer, test_exports, test_api_endpoints, test_health)
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml
├── README.md
├── PROJECT_MEMORY.md
└── TESTING.md
```

### Database Tables & Relationships
- `websites`: Canonical domains, brand aliases, competitor domains, crawler rules.
- `target_questions`: Target queries, search intent (`informational`, `commercial_investigation`, `transactional`, `navigational`, `unknown`), topic, priority.
- `crawl_jobs` & `crawled_pages`: Real page storage with headings, body text, structured data (JSON-LD), response times.
- `answer_readiness_audits` & `question_audit_results`: Readiness scores (0-100), evidence snippets, missing subtopics, confidence scores.
- `audit_recommendations`: Actionable improvements categorized by priority and estimated effort.
- `visibility_jobs`, `visibility_observations`, `visibility_citations`: Recorded provider responses, brand mention rates, domain distributions, competitor mentions.
- `competitor_gap_findings`: Comparative analysis separated into observed facts, derived findings, and human review suggestions.

### Answer-Readiness Scoring Rubric (0 to 100)
1. **Direct Answer Presence (0 - 30 pts):** Verified concise answer in introductory paragraphs or under relevant headings.
2. **Content Depth & Subtopic Coverage (0 - 30 pts):** Word count sufficiency and presence of intent-specific subtopics.
3. **Structured Data Markup (0 - 15 pts):** Presence of Schema.org JSON-LD (FAQPage, Article, Product, HowTo).
4. **Heading & Semantic Hierarchy (0 - 15 pts):** Clean H1 and H2 structure framing the topic.
5. **Evidence Accessibility & Clarity (0 - 10 pts):** Verifiable textual excerpts directly answering query terms.
- **Readiness Classification:**
  - 80-100: Excellent (`ready`)
  - 65-79: Good (`ready`)
  - 50-64: Fair (`partially_ready`)
  - 30-49: Poor (`needs_improvement`)
  - 0-29: Missing (`unanswered`)

### AI Search Visibility Metrics & Denominators
- **Brand Mention Rate (%):** `(brand_mentions_count / total_questions) * 100`.
- **Citations Count:** Total external citations indexed in response.
- **Competitor References:** Competitor brands detected in the same query result sets.
- **Competitor-Only Queries:** Target questions where competitor appeared but user brand did not.

---

## 3. Mandatory Centralized Design System
- **Token Definitions:** `frontend/src/styles/design-tokens.css` defines CSS variables in `:root` and `:root[data-theme="dark"]`.
- **Tailwind v4 Integration:** `frontend/src/styles/index.css` maps variables to Tailwind utilities via `@theme inline`:
  - `bg-primary`, `text-primary-contrast`, `bg-secondary`, `bg-accent`
  - `bg-background`, `bg-surface`, `bg-card`
  - `text-text`, `text-muted`, `border-border`
  - `text-success`, `text-warning`, `text-danger`, `text-info`
- **Theme Variables in Charts:** `frontend/src/config/theme.ts` exports `CHART_COLOR_VARS` (`var(--color-chart-1)` to `var(--color-chart-5)`).
- **Automated Enforcement:** `frontend/src/styles/tokens.test.ts` scans all `.tsx` files and fails if any component uses raw `#hex`, arbitrary classes like `bg-[#123456]`, or `rgb(...)`.

### How to Change the Global Styling
To change colors, fonts, borders, or shadows across the entire application, edit **only** `frontend/src/styles/design-tokens.css`. All components dynamically consume the updated semantic tokens without manual edits.

---

## 4. Development Environment & Verified Commands

### Prerequisites
- Node.js 22+, npm 11+, Python 3.12+ (or 3.14).

### Backend Startup & Tests
```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\alembic upgrade head
.venv\Scripts\uvicorn app.main:app --port 8000 --reload
# Run tests:
.venv\Scripts\pytest tests
```

### Frontend Startup & Tests
```bash
cd frontend
npm install
npm run dev        # Runs Vite on http://localhost:5173
npm test           # Runs Vitest (tokens, components, navigation)
npm run build      # Verifies TypeScript build & Vite bundling
```

---

## 5. Development Status

| Feature Module | Status | Implementing Files |
|---|---|---|
| Safe Crawler & SSRF Protections | COMPLETED & TESTED | `app/services/crawler/security.py`, `robots.py`, `parser.py`, `crawler.py` |
| Search Intent Classifier | COMPLETED & TESTED | `app/services/questions/classifier.py`, `app/api/questions.py` |
| Answer-Readiness Scoring Engine | COMPLETED & TESTED | `app/services/answer_readiness/evaluator.py`, `matcher.py`, `app/api/audits.py` |
| AI Search Visibility Provider Layer | COMPLETED & TESTED | `app/services/providers/base.py`, `tavily.py`, `serpapi.py`, `fixture.py`, `app/api/visibility.py` |
| Competitor Content Gap Analyzer | COMPLETED & TESTED | `app/services/competitors/analyzer.py`, `app/api/competitors.py` |
| AI Service Layer (with fallback) | COMPLETED & TESTED | `app/services/ai/service.py` |
| Reports, CSV & PDF Exporters | COMPLETED & TESTED | `app/services/reports/exporter.py`, `app/api/reports.py` |
| Centralized Tailwind Design System | COMPLETED & TESTED | `frontend/src/styles/design-tokens.css`, `tokens.test.ts` |
| React UI & Router Shell | COMPLETED & TESTED | `AppShell.tsx`, `Dashboard.tsx`, `Websites.tsx`, `Questions.tsx`, `AuditView.tsx`, `VisibilityView.tsx`, `CompetitorView.tsx`, `ReportsView.tsx` |

**Last Completed Task:** End-to-end full stack implementation, test suites verification (20/20 backend tests passed, 5/5 frontend tests passed), production build verification, and Alembic migrations.

**Recommended Next Step:**
Optional addition of live Playwright end-to-end browser tests or live deployment in a containerized Docker Compose environment with production PostgreSQL.

---

## Instructions for the Next AI Assistant
1. Read `PROJECT_MEMORY.md`, `README.md`, and `TESTING.md` before modifying the project.
2. Inspect the repository and verify documented status against actual code.
3. Continue from the existing implementation instead of rebuilding unnecessarily.
4. Preserve working features, API contracts, database compatibility, and the centralized Tailwind design system.
5. Run relevant unit tests after every meaningful module change (`pytest` and `npm test`).
6. Run integration and regression tests where appropriate.
7. Never fabricate functionality, source evidence, live provider results, or successful test outcomes.
8. Distinguish actual observations, derived calculations, estimates, AI-generated suggestions, and mocked fixtures.
9. Update project documentation whenever implementation, architecture, configuration, or testing status changes.
10. If the documentation and code disagree, investigate and update the documentation based on verified facts.
11. Never store secrets in project memory or source code.
12. At the end of a development session, report files changed, features completed, tests executed, actual results, known defects, and the next task.
