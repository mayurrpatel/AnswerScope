# AnswerScope — AI Search Visibility & Answer Engine Audit

A modern, production-grade web application built to audit whether a website's pages clearly answer relevant user questions and are structured in a way that helps AI-powered search and answer engines (such as Perplexity, Google AI Overviews, and ChatGPT Search) understand and surface their content.

> **Truth in Analysis & Anti-Fabrication Principle:**  
> AnswerScope evaluates **observable website content and technical signals** (such as direct answer positioning, heading hierarchy, Schema.org structured data, and content depth). AnswerScope **never fabricates AI citations, search engine impressions, share of voice, or proprietary rankings**. Internal content-readiness scores are strictly separated from external search engine observations.

---

## 1. Key Capabilities & Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AnswerScope Frontend (React 19 + Vite)                │
│  - Step-by-Step Quick Audit Workflow        - Dedicated Query Explorer     │
│  - Content-Readiness Dashboard              - Prioritized Action Plan      │
│  - Downloadable Reports (HTML, CSV, PDF)    - Modern Slate/Teal Palette    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (JSON / HTTP)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    AnswerScope Backend (FastAPI + Python 3.12)              │
├────────────────────────┬───────────────────────────┬────────────────────────┤
│ Crawler & Security     │ Answer-Readiness Rubric   │ Reporting Engine       │
│ - SSRF Shield          │ - Direct Answer (30%)     │ - Standalone HTML      │
│ - robots.txt adherence │ - Heading Relevance (20%) │ - Standard CSV         │
│ - Rate & Depth Limits  │ - Depth & Details (20%)   │ - ReportLab PDF        │
│ - Offline Sample Site  │ - Structured Data (15%)   │                        │
│ - Image Alt Extraction │ - Organization (15%)      │                        │
└────────────────────────┴───────────────────────────┴────────────────────────┘
```

### A. Website & Query Input
- Enter any publicly accessible URL or load the built-in offline test site.
- Optional business description and target audience to contextualize evaluations.
- Configurable maximum crawl pages (default 10, max 50) and crawl delay.
- 1-Click "Insert 5 Example Questions" covering services, pricing, functionality, benefits, and competitive alternatives.
- Real-time client and server validation for valid URL schemes and query lists.

### B. Safe Crawling & Content Extraction
- **SSRF Protection:** Resolves hosts and immediately blocks loopback addresses (`127.0.0.1`, `localhost`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata services (`169.254.169.254`, `metadata.google.internal`).
- **Respects Policies:** Honors `robots.txt` disallow rules, enforces crawl delays, and limits concurrent requests.
- **Deep Extraction:** Extracts page title, meta description, H1–H6 heading hierarchy, main article text, internal/external links, images with `alt` text, and Schema.org JSON-LD structured data (`FAQPage`, `Service`, `Product`, `Organization`, `Article`).
- **Offline Deterministic Sample Site:** Ships with a realistic mock website for `https://sample-site.nexusflow.io/` (`backend/app/sample_site/`) enabling 100% offline testing without internet connectivity.

### C. Explainable 0–100 Content-Readiness Scoring Formula
The Answer-Readiness Score evaluates observable technical and editorial factors:

$$\text{Score} = \text{Direct Answer (30)} + \text{Heading Relevance (20)} + \text{Explanation Depth (20)} + \text{Structured Data (15)} + \text{Readability \& Organization (15)}$$

| Scoring Dimension | Weight | Criteria & Observable Evidence |
|---|---|---|
| **Direct Answer Detection** | 30 pts | Clear answer sentence found within the opening sentences or relevant section; bonus if verified in Schema.org `FAQPage` markup. |
| **Heading Relevance** | 20 pts | Relevant H1/H2/H3 headings match key question tokens, providing clear structural signposts. |
| **Explanation Depth & Details** | 20 pts | Presence of concrete facts, steps, bullet lists, numeric parameters, or specific details rather than vague marketing text. |
| **Structured Data & Markup** | 15 pts | Valid Schema.org JSON-LD found (`FAQPage`, `Service`, `Product`, `Organization`). |
| **Readability & Organization** | 15 pts | Good paragraph pacing, absence of wall-of-text formatting, and relevant internal cross-links. |

### D. Content Gap Analysis & Dedicated Query Explorer
For every target query, AnswerScope provides:
- **Best Matching Page URL:** Identified using transparent keyword matching and heading overlap.
- **Answer Status:** Answered, Partially Answered, or Missing.
- **Direct Evidence Snippet:** The exact sentence answering the user's question.
- **Identified Gaps & Missing Information:** What subtopics or details are absent.
- **Suggested Headings:** Specific H2/H3 titles the site owner should add.
- **Structured Data Opportunities:** Recommendations for Schema.org types (`FAQPage`, `Product`, etc.).
- **Owner Confirmation Notes:** Specific flags for business facts, pricing, or SLAs requiring website owner sign-off (never fabricated).

### E. Prioritized Recommendations
Grouped into:
- **High / Critical Priority:** Important unanswered questions, major missing sections, or inaccessible pages.
- **Medium Priority:** Incomplete explanations, missing bullet points, or weak heading structure.
- **Low Priority:** Minor organization tweaks, image alt-text additions, or internal links.
- Every recommendation displays: Affected Page, Target Query, Observed Evidence, Identified Gap, Suggested Improvement, Reason It Matters, and Expected Effort (Low, Medium, High).

### F. Multi-Format Report Generation
- **Downloadable Standalone HTML:** A beautifully styled, printable HTML audit report ready to share with stakeholders.
- **CSV Export:** Tabular export containing all queries, scores, evidence excerpts, and gaps.
- **PDF Export:** Polished document compiled via Python ReportLab.

---

## 2. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4 (`@theme inline`), React Router 7, Axios, Recharts, Lucide React.
- **Backend:** Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2 ORM, HTTPX, BeautifulSoup4, ReportLab.
- **Database:** SQLite (default for development/testing, auto-migrates in `app.db`) / PostgreSQL 16.
- **Testing:** pytest 9 (backend, 29 tests), Vitest 5 & React Testing Library (frontend, 5 tests).

---

## 3. Getting Started

### Prerequisites
- Node.js 22+ & npm 10+
- Python 3.12+

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations & initialize DB
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --port 8000 --reload
```
*Backend API and interactive OpenAPI documentation will be accessible at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server (proxies /api to :8000)
npm run dev
```
*Open [http://localhost:5173](http://localhost:5173) in your browser.*

---

## 4. Running the Deterministic Offline Sample Audit

AnswerScope includes an offline sample website (`NexusFlow — Cloud Analytics`) built specifically for offline testing:

1. Click **"Try Sample Audit"** on the Dashboard or in the top navigation.
2. Alternatively, click **"Start New Audit"** and choose **"Load Sample Site (NexusFlow)"**.
3. AnswerScope crawls `https://sample-site.nexusflow.io/` entirely from local static fixtures, executes the 0–100 rubric across 5 standard target questions, generates content gap evidence, and presents the full audit and downloadable reports without making external internet calls.

---

## 5. Running the Test Suites

### Backend Unit & Integration Tests (pytest)
```bash
# From repository root:
$env:PYTHONPATH='backend'; backend\.venv\Scripts\python.exe -m pytest backend/tests
# Or on Linux/macOS:
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests
```
*Executes 29 test cases covering SSRF protection, deterministic sample site crawling, HTML parsing, answer extraction, scoring rubric boundaries, content gap suggestions, ReportLab PDF, and HTML export.*

### Frontend Tests (Vitest)
```bash
cd frontend
npm test -- --run
```
*Executes 5 tests covering design-token compliance (verifying no hardcoded hex colors), UI button states, and App navigation.*

### Production Build Verification
```bash
cd frontend
npm run build
```
*Compiles TypeScript and bundles production assets via Vite.*

---

## 6. Optional Search Engine API Keys

If you wish to test live search engine observation feeds (Capability B), add your API keys to `backend/.env`:

| Key | Description | Optional / Required |
|---|---|---|
| `TAVILY_API_KEY` | Live AI search citation observations | Optional |
| `SERPAPI_API_KEY` | Google search observations | Optional |

*If keys are omitted, AnswerScope operates 100% locally with built-in heuristic classifiers, safe offline fixtures, and full answer-readiness functionality. No paid API key is required to use AnswerScope.*

---

## 7. License
MIT License. Built for the AI Search Visibility & Answer Engine Audit internship assessment.
