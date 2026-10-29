# AI Search Visibility & Answer Engine Audit

A production-ready full-stack web application designed to help businesses audit their website content's readiness for AI answer engines (Perplexity, ChatGPT, Google AI Overviews) and observe their real brand visibility across search engines.

---

## Capabilities & Architecture

The application provides two clearly separated capabilities:

### Capability A — Website Answer-Readiness Audit
- **Permitted Page Crawling:** Real HTML crawler respecting `robots.txt`, enforcing crawl depths, concurrency, and rate limits.
- **SSRF & Security Shield:** Rejects private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.1`, `localhost`), and cloud metadata services (`169.254.169.254`, `metadata.google.internal`).
- **Answer-Readiness Scoring Engine:** Evidence-based scoring rubric (0–100) evaluating direct answer presence, content depth, Schema.org JSON-LD structured data (FAQPage, Article, Product), heading hierarchy, and evidence snippet accessibility.
- **Actionable Recommendations:** Prioritized content improvements linked to real evidence and affected page URLs.

### Capability B — AI Search Visibility Audit
- **Provider Interface:** Modular integration with live data sources (Tavily AI Search, SerpAPI Google Search) and built-in verification fixtures.
- **Truthful Status Reporting:** When an API key is not configured, the interface clearly shows unconfigured status and setup instructions rather than fabricating fake search results.
- **Visibility Metrics:** Brand mention counts, brand mention rates (% across queries with documented denominators), external citations, domain distributions, and competitor references.

### Competitor Content Gap Analyzer
- Evaluates user site content readiness against competitor pages for target user queries.
- Clearly separates:
  1. **Observed Facts:** Content extracted from accessible pages.
  2. **Derived Findings:** Calculated score differentials and missing vocabulary.
  3. **Recommendations:** Suggested content updates for human review.

### Comprehensive Reports & Exports
- **CSV Export:** Download full audit breakdown with scores, status, and evidence snippets.
- **PDF Export:** Professional report generated via ReportLab containing executive summaries, score tables, and prioritized next steps.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 (`@theme inline`), React Router 7, Axios, Recharts, Lucide React |
| **Testing (Frontend)** | Vitest 5, React Testing Library, JSDOM |
| **Backend** | Python 3.14+, FastAPI, Pydantic v2, SQLAlchemy 2 ORM, Alembic migrations, HTTPX, BeautifulSoup4, ReportLab |
| **Testing (Backend)** | pytest 9, AnyIO, FastAPI TestClient |
| **Database** | PostgreSQL 16 (production) / SQLite (development & testing default) |

---

## Centralized Design System

All visual styling is controlled from a single centralized token system:
- **Token Definitions:** `frontend/src/styles/design-tokens.css`
- **Tailwind Mapping:** `frontend/src/styles/index.css`
- **Automated Validation:** `frontend/src/styles/tokens.test.ts` ensures no component contains hard-coded hex colors or arbitrary color classes.

### How to Restyle the Entire Site
Edit `frontend/src/styles/design-tokens.css`. Updating `--color-primary`, `--color-background`, `--color-surface`, or typography in `:root` and `:root[data-theme="dark"]` propagates across every page, button, badge, input, and chart automatically.

---

## Getting Started

### Prerequisites
- Node.js 22+ & npm 11+
- Python 3.12+ (or 3.14+)
- PostgreSQL 16 (optional; SQLite works out-of-the-box for local testing)

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start API server (available at http://127.0.0.1:8000/docs)
uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server (proxies /api to :8000)
npm run dev
```
Open **http://localhost:5173** in your browser.

### 3. Production PostgreSQL Setup (Optional)
If using Docker for PostgreSQL:
```bash
# In the repository root
POSTGRES_PASSWORD=your_secure_password docker compose up -d db

# Update backend/.env:
# DATABASE_URL=postgresql+psycopg://audit_user:your_secure_password@localhost:5432/ai_search_audit

cd backend
alembic upgrade head
```

---

## Running Test Suites

### Backend Unit & Integration Tests (pytest)
```bash
cd backend
.venv\Scripts\pytest tests
```
*Executes 20 test cases covering SSRF protection, robots.txt, HTML parsing, intent classification, scoring rubric, visibility providers, competitor gap analysis, PDF/CSV generation, and API endpoints.*

### Frontend Tests (Vitest)
```bash
cd frontend
npm test
```
*Executes token compliance tests, semantic component tests, and AppShell navigation tests.*

### Production Build Verification
```bash
cd frontend
npm run build
```
*Compiles TypeScript and bundles production assets via Vite.*

---

## Optional API Key Configuration

To enable live external search and AI model queries, set the following keys in `backend/.env`:

| Variable | Description | Where to Obtain |
|---|---|---|
| `TAVILY_API_KEY` | Live AI search and citation extraction | [https://tavily.com](https://tavily.com) |
| `SERPAPI_API_KEY` | Google organic search and answer box | [https://serpapi.com](https://serpapi.com) |
| `OPENAI_API_KEY` | Optional LLM intent refinement | [https://platform.openai.com](https://platform.openai.com) |
| `GEMINI_API_KEY` | Optional Gemini LLM integration | [https://ai.google.dev](https://ai.google.dev) |

*If keys are omitted, the application operates 100% deterministically using built-in heuristic classifiers, safe crawlers, and the offline test fixture.*

---

## License
MIT License
