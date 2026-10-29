from bs4 import BeautifulSoup
import json
import re
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Any, Set


class ParsedPage:
    def __init__(
        self,
        url: str,
        title: str | None,
        meta_description: str | None,
        canonical_url: str | None,
        language: str | None,
        headings: Dict[str, List[str]],
        body_text: str,
        structured_data: List[Dict[str, Any]],
        internal_links: List[str],
        word_count: int,
    ):
        self.url = url
        self.title = title
        self.meta_description = meta_description
        self.canonical_url = canonical_url
        self.language = language
        self.headings = headings
        self.body_text = body_text
        self.structured_data = structured_data
        self.internal_links = internal_links
        self.word_count = word_count


def parse_html(url: str, html_content: str, base_domain: str) -> ParsedPage:
    soup = BeautifulSoup(html_content, "html.parser")

    # Title
    title = soup.title.string.strip() if soup.title and soup.title.string else None

    # Meta description
    meta_desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_description = meta_desc_tag["content"].strip() if meta_desc_tag and meta_desc_tag.get("content") else None

    # Canonical URL
    canonical_tag = soup.find("link", attrs={"rel": "canonical"})
    canonical_url = canonical_tag["href"].strip() if canonical_tag and canonical_tag.get("href") else None

    # Language
    html_tag = soup.find("html")
    language = html_tag.get("lang") if html_tag and html_tag.get("lang") else None

    # Headings
    headings: Dict[str, List[str]] = {"h1": [], "h2": [], "h3": []}
    for tag in ("h1", "h2", "h3"):
        for h in soup.find_all(tag):
            text = h.get_text(separator=" ", strip=True)
            if text:
                headings[tag].append(text)

    # Structured Data (JSON-LD)
    structured_data: List[Dict[str, Any]] = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        if script.string:
            try:
                data = json.loads(script.string.strip())
                if isinstance(data, dict):
                    structured_data.append(data)
                elif isinstance(data, list):
                    structured_data.extend([item for item in data if isinstance(item, dict)])
            except Exception:
                continue

    # Clean body text (remove script, style, nav, footer, noscript)
    for element in soup(["script", "style", "nav", "footer", "noscript", "svg", "header"]):
        element.decompose()

    body_text = soup.get_text(separator=" ", strip=True)
    body_text = re.sub(r"\s+", " ", body_text)
    words = re.findall(r"\w+", body_text)
    word_count = len(words)

    # Internal links
    internal_links: Set[str] = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        full_url = urljoin(url, href)
        parsed_link = urlparse(full_url)
        # Check if same domain
        if parsed_link.hostname and parsed_link.hostname.lower() == base_domain.lower():
            # Clean fragment
            clean_link = f"{parsed_link.scheme}://{parsed_link.netloc}{parsed_link.path}"
            if parsed_link.query:
                clean_link += f"?{parsed_link.query}"
            internal_links.add(clean_link)

    return ParsedPage(
        url=url,
        title=title,
        meta_description=meta_description,
        canonical_url=canonical_url,
        language=language,
        headings=headings,
        body_text=body_text,
        structured_data=structured_data,
        internal_links=list(internal_links),
        word_count=word_count,
    )
