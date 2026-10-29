import asyncio
import time
import httpx
import logging
from typing import List, Dict, Any, Set
from collections import deque
from pathlib import Path

from app.services.crawler.security import normalize_url, validate_url_security, extract_domain
from app.services.crawler.robots import RobotsChecker
from app.services.crawler.parser import parse_html, ParsedPage
from app.core.config import settings

logger = logging.getLogger(__name__)


class CrawlResult:
    def __init__(self, pages: List[Dict[str, Any]], error_message: str | None = None):
        self.pages = pages
        self.error_message = error_message


class AsyncCrawler:
    def __init__(
        self,
        base_url: str,
        max_pages: int = 15,
        max_depth: int = 2,
        crawl_delay: float = 1.0,
        respect_robots_txt: bool = True,
        timeout: float = 10.0,
    ):
        self.base_url = normalize_url(base_url)
        self.domain = extract_domain(self.base_url)
        self.max_pages = min(max_pages, settings.crawler_max_pages)
        self.max_depth = min(max_depth, settings.crawler_max_depth)
        self.crawl_delay = max(crawl_delay, 0.2)
        self.respect_robots_txt = respect_robots_txt
        self.timeout = timeout
        self.robots_checker = RobotsChecker()

    def _crawl_sample_site(self) -> CrawlResult:
        """Crawl the local offline sample website deterministically without network access."""
        sample_dir = Path(__file__).resolve().parent.parent.parent / "sample_site"
        mapping = {
            "https://sample-site.nexusflow.io/": "index.html",
            "https://sample-site.nexusflow.io": "index.html",
            "https://sample-site.nexusflow.io/index.html": "index.html",
            "https://sample-site.nexusflow.io/services.html": "services.html",
            "https://sample-site.nexusflow.io/pricing.html": "pricing.html",
            "https://sample-site.nexusflow.io/faq.html": "faq.html",
            "https://sample-site.nexusflow.io/comparisons.html": "comparisons.html",
        }

        visited: Set[str] = set()
        queue: deque = deque([(self.base_url, 0)])
        crawled_pages: List[Dict[str, Any]] = []

        while queue and len(crawled_pages) < self.max_pages:
            current_url, depth = queue.popleft()
            if current_url in visited:
                continue
            visited.add(current_url)

            # Robots.txt disallowed path check
            if self.respect_robots_txt and ("/admin" in current_url or "/private" in current_url):
                logger.info(f"Sample robots.txt disallowed: {current_url}")
                continue

            file_name = mapping.get(current_url)
            if not file_name:
                crawled_pages.append({
                    "url": current_url,
                    "canonical_url": None,
                    "status_code": 404,
                    "title": None,
                    "meta_description": None,
                    "language": None,
                    "headings": {"h1": [], "h2": [], "h3": []},
                    "body_text": "",
                    "structured_data": [],
                    "word_count": 0,
                    "response_time_ms": 12.0,
                })
                continue

            file_path = sample_dir / file_name
            if not file_path.exists():
                continue

            html_text = file_path.read_text(encoding="utf-8")
            parsed = parse_html(current_url, html_text, self.domain)
            crawled_pages.append({
                "url": current_url,
                "canonical_url": parsed.canonical_url,
                "status_code": 200,
                "title": parsed.title,
                "meta_description": parsed.meta_description,
                "language": parsed.language,
                "headings": parsed.headings,
                "body_text": parsed.body_text,
                "structured_data": parsed.structured_data,
                "word_count": parsed.word_count,
                "response_time_ms": 28.5,
            })

            if depth < self.max_depth:
                for link in parsed.internal_links:
                    if link not in visited:
                        queue.append((link, depth + 1))

        return CrawlResult(crawled_pages)

    async def crawl(self) -> CrawlResult:
        if not validate_url_security(self.base_url):
            return CrawlResult([], error_message=f"Security check failed: Destination '{self.base_url}' is not permitted.")

        # Offline deterministic sample mode
        if self.domain == "sample-site.nexusflow.io":
            return self._crawl_sample_site()

        visited: Set[str] = set()
        queue: deque = deque([(self.base_url, 0)])  # (url, depth)
        crawled_pages: List[Dict[str, Any]] = []

        headers = {
            "User-Agent": settings.crawler_user_agent,
            "Accept": "text/html,application/xhtml+xml",
        }

        async with httpx.AsyncClient(
            headers=headers,
            timeout=self.timeout,
            follow_redirects=True,
            verify=False,
        ) as client:
            while queue and len(crawled_pages) < self.max_pages:
                current_url, depth = queue.popleft()
                if current_url in visited:
                    continue
                visited.add(current_url)

                # Security re-check (in case of redirects or URL injection)
                if not validate_url_security(current_url):
                    logger.warning(f"Skipping unsafe URL: {current_url}")
                    continue

                # Robots check
                if self.respect_robots_txt:
                    try:
                        can_crawl = await self.robots_checker.can_fetch(current_url)
                        if not can_crawl:
                            logger.info(f"Robots.txt disallowed: {current_url}")
                            continue
                    except Exception:
                        pass

                start_time = time.time()
                try:
                    resp = await client.get(current_url)
                    response_time = (time.time() - start_time) * 1000

                    content_type = resp.headers.get("content-type", "").lower()
                    if "text/html" not in content_type and "application/xhtml" not in content_type:
                        continue

                    parsed = parse_html(current_url, resp.text, self.domain)
                    crawled_pages.append({
                        "url": current_url,
                        "canonical_url": parsed.canonical_url,
                        "status_code": resp.status_code,
                        "title": parsed.title,
                        "meta_description": parsed.meta_description,
                        "language": parsed.language,
                        "headings": parsed.headings,
                        "body_text": parsed.body_text,
                        "structured_data": parsed.structured_data,
                        "word_count": parsed.word_count,
                        "response_time_ms": response_time,
                    })

                    # Add internal links to queue if depth permits
                    if depth < self.max_depth:
                        for link in parsed.internal_links:
                            if link not in visited:
                                queue.append((link, depth + 1))

                    # Crawl rate limit delay
                    if self.crawl_delay > 0:
                        await asyncio.sleep(self.crawl_delay)

                except Exception as e:
                    logger.warning(f"Error crawling {current_url}: {e}")
                    crawled_pages.append({
                        "url": current_url,
                        "canonical_url": None,
                        "status_code": 500,
                        "title": None,
                        "meta_description": None,
                        "language": None,
                        "headings": {"h1": [], "h2": [], "h3": []},
                        "body_text": "",
                        "structured_data": [],
                        "word_count": 0,
                        "response_time_ms": 0.0,
                    })

        return CrawlResult(crawled_pages)
