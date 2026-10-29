import re
from typing import List, Dict, Any, Tuple


def tokenize(text: str) -> List[str]:
    """Tokenizes text into lowercase alphanumeric keywords excluding common stop words."""
    stopwords = {
        "a", "an", "the", "and", "or", "but", "if", "because", "as", "what",
        "which", "this", "that", "these", "those", "then", "just", "so", "than",
        "such", "both", "through", "about", "for", "is", "of", "while", "during",
        "to", "from", "in", "out", "on", "off", "over", "under", "again", "further",
        "then", "once", "here", "there", "when", "where", "why", "how", "all",
        "any", "both", "each", "few", "more", "most", "other", "some", "such",
        "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
        "can", "will", "do", "does", "did", "have", "has", "had", "are", "were"
    }
    words = re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", text.lower())
    return [w for w in words if w not in stopwords]


def match_question_to_pages(question_text: str, crawled_pages: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], float]]:
    """
    Ranks crawled pages for relevance to the target question.
    Returns list of (page_dict, relevance_score) sorted descending.
    """
    q_tokens = set(tokenize(question_text))
    if not q_tokens:
        return []

    ranked_pages = []

    for page in crawled_pages:
        score = 0.0
        
        # Title match (high weight)
        title = page.get("title") or ""
        title_tokens = set(tokenize(title))
        title_overlap = len(q_tokens.intersection(title_tokens))
        score += title_overlap * 3.5

        # Headings match (high weight)
        headings = page.get("headings") or {}
        all_headings = []
        for tag in ("h1", "h2", "h3"):
            all_headings.extend(headings.get(tag, []))
        heading_text = " ".join(all_headings)
        heading_tokens = set(tokenize(heading_text))
        heading_overlap = len(q_tokens.intersection(heading_tokens))
        score += heading_overlap * 2.5

        # Structured data match (e.g. FAQPage questions)
        structured_data = page.get("structured_data") or []
        sd_text = ""
        for sd in structured_data:
            if isinstance(sd, dict):
                main_entity = sd.get("mainEntity", [])
                if isinstance(main_entity, list):
                    for item in main_entity:
                        if isinstance(item, dict):
                            sd_text += " " + str(item.get("name", "")) + " " + str(item.get("acceptedAnswer", {}).get("text", ""))
                sd_text += " " + str(sd.get("name", "")) + " " + str(sd.get("description", ""))
        sd_tokens = set(tokenize(sd_text))
        sd_overlap = len(q_tokens.intersection(sd_tokens))
        score += sd_overlap * 3.0

        # Meta description match
        meta_desc = page.get("meta_description") or ""
        desc_tokens = set(tokenize(meta_desc))
        score += len(q_tokens.intersection(desc_tokens)) * 1.5

        # Body text match
        body_text = page.get("body_text") or ""
        body_tokens = tokenize(body_text)
        if body_tokens:
            body_token_set = set(body_tokens)
            body_overlap = len(q_tokens.intersection(body_token_set))
            term_ratio = body_overlap / len(q_tokens)
            score += term_ratio * 4.0

        if score > 0:
            ranked_pages.append((page, score))

    ranked_pages.sort(key=lambda x: x[1], reverse=True)
    return ranked_pages


def extract_evidence_snippets(question_text: str, page: Dict[str, Any], max_snippets: int = 3) -> List[Dict[str, Any]]:
    """
    Extracts relevant context sentences/snippets from the page answering the question.
    """
    body_text = page.get("body_text") or ""
    q_tokens = set(tokenize(question_text))
    if not q_tokens:
        return []

    # Check structured data FAQ answers first if available
    structured_data = page.get("structured_data") or []
    sd_snippets = []
    for sd in structured_data:
        if isinstance(sd, dict) and "faq" in str(sd.get("@type", "")).lower():
            main_entity = sd.get("mainEntity", [])
            if isinstance(main_entity, list):
                for item in main_entity:
                    if isinstance(item, dict):
                        q_name = item.get("name", "")
                        ans = item.get("acceptedAnswer", {}).get("text", "")
                        overlap = len(q_tokens.intersection(set(tokenize(q_name))))
                        if overlap > 0 and ans:
                            sd_snippets.append({
                                "url": page.get("url"),
                                "text": ans,
                                "context": f"Schema FAQ: '{q_name}'",
                                "score": 25.0,
                            })

    if not body_text and not sd_snippets:
        return []

    # Split into sentences
    sentences = re.split(r"(?<=[.!?])\s+", body_text)
    scored_sentences = []

    for idx, s in enumerate(sentences):
        s_clean = s.strip()
        if len(s_clean) < 15 or len(s_clean) > 400:
            continue

        # If sentence is an interrogative ending with ?, pull in the answering sentence
        candidate_text = s_clean
        if s_clean.endswith("?") and idx + 1 < len(sentences):
            next_s = sentences[idx + 1].strip()
            if len(next_s) >= 15:
                candidate_text = f"{s_clean} {next_s}" if len(s_clean) < 60 else next_s

        c_tokens = set(tokenize(candidate_text))
        overlap = len(q_tokens.intersection(c_tokens))
        if overlap > 0:
            density = overlap / (len(c_tokens) + 1e-5)
            scored_sentences.append((candidate_text, overlap, density))

    scored_sentences.sort(key=lambda x: (x[1], x[2]), reverse=True)

    results = list(sd_snippets)
    for s_clean, overlap, density in scored_sentences:
        if len(results) >= max_snippets:
            break
        # Avoid duplicate snippets
        if not any(s_clean in r["text"] or r["text"] in s_clean for r in results):
            results.append({
                "url": page.get("url"),
                "text": s_clean,
                "context": f"Page title: {page.get('title') or 'Untitled'}",
                "score": round(overlap * 10 + density * 5, 2)
            })

    return results[:max_snippets]
