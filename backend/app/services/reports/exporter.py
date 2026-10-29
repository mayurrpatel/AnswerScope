import io
import csv
from typing import List, Dict, Any
from datetime import datetime, timezone
import html

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def export_audit_to_csv(
    website_name: str,
    website_domain: str,
    overall_score: float,
    readiness_level: str,
    question_results: List[Dict[str, Any]],
) -> str:
    """Generates a CSV string containing comprehensive answer-readiness audit results."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Metadata header
    writer.writerow(["Website", website_name])
    writer.writerow(["Domain", website_domain])
    writer.writerow(["Overall Readiness Score", f"{overall_score:.1f}/100"])
    writer.writerow(["Readiness Level", readiness_level])
    writer.writerow(["Generated At", datetime.now(timezone.utc).isoformat()])
    writer.writerow([])

    # Table columns
    writer.writerow([
        "Question",
        "Search Intent",
        "Readiness Score",
        "Status",
        "Direct Answer Found",
        "Direct Answer Snippet",
        "Structured Data Present",
        "Relevant URLs",
        "Missing Subtopics",
        "Suggested Headings",
        "Confidence",
    ])

    for qr in question_results:
        writer.writerow([
            qr.get("question_text", ""),
            qr.get("question_intent", ""),
            f"{qr.get('readiness_score', 0):.1f}",
            qr.get("status", ""),
            "Yes" if qr.get("direct_answer_found") else "No",
            (qr.get("direct_answer_snippet") or "").replace("\n", " "),
            "Yes" if qr.get("structured_data_present") else "No",
            "; ".join(qr.get("relevant_page_urls", [])),
            "; ".join(qr.get("missing_subtopics", [])),
            "; ".join(qr.get("suggested_headings", [])),
            f"{qr.get('confidence_level', 0)*100:.0f}%",
        ])

    return output.getvalue()


def export_audit_to_pdf(
    website_name: str,
    website_domain: str,
    overall_score: float,
    readiness_level: str,
    question_results: List[Dict[str, Any]],
    recommendations: List[Dict[str, Any]],
) -> bytes:
    """Generates a PDF byte string using ReportLab for official executive summary."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
    )
    section_style = ParagraphStyle(
        "ReportSection",
        parent=styles["Heading2"],
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#0f766e"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1f2937"),
    )
    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontSize=9,
        leading=11,
        textColor=colors.white,
        fontName="Helvetica-Bold",
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("AnswerScope — AI Search Visibility & Answer Engine Audit", title_style))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            f"Website: <b>{website_name}</b> ({website_domain}) | Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0d9488"), spaceAfter=14))

    # Executive Overview Box
    score_data = [
        [
            Paragraph(f"<b>Overall Score:</b> {overall_score:.1f} / 100", body_style),
            Paragraph(f"<b>Readiness Level:</b> {readiness_level.upper()}", body_style),
            Paragraph(f"<b>Total Questions:</b> {len(question_results)}", body_style),
        ]
    ]
    score_table = Table(score_data, colWidths=[170, 170, 170])
    score_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(score_table)
    story.append(Spacer(1, 14))

    # Question Results Table
    story.append(Paragraph("Target Query Answer-Readiness Results", section_style))
    
    table_rows = [
        [
            Paragraph("Target Query", table_header_style),
            Paragraph("Intent", table_header_style),
            Paragraph("Score", table_header_style),
            Paragraph("Status", table_header_style),
            Paragraph("Answer Evidence", table_header_style),
        ]
    ]

    for qr in question_results[:12]:
        answer_snip = qr.get("direct_answer_snippet") or "No direct answer found"
        if len(answer_snip) > 100:
            answer_snip = answer_snip[:97] + "..."
        table_rows.append([
            Paragraph(qr.get("question_text", ""), body_style),
            Paragraph(qr.get("question_intent", "unknown"), body_style),
            Paragraph(f"{qr.get('readiness_score', 0):.0f}", body_style),
            Paragraph(qr.get("status", ""), body_style),
            Paragraph(answer_snip, body_style),
        ])

    q_table = Table(table_rows, colWidths=[140, 75, 45, 70, 180])
    q_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ])
    )
    story.append(q_table)
    story.append(Spacer(1, 14))

    # Prioritized Recommendations
    if recommendations:
        story.append(Paragraph("Prioritized Content Recommendations", section_style))
        for idx, rec in enumerate(recommendations[:6], start=1):
            prio = rec.get("priority", "medium").upper()
            effort = rec.get("estimated_effort", "medium").title()
            rec_text = (
                f"<b>{idx}. [{prio}] {rec.get('issue', '')}</b> (Effort: {effort})<br/>"
                f"<i>Suggested Action:</i> {rec.get('suggested_action', '')}<br/>"
                f"<i>Why it helps:</i> {rec.get('why_it_helps', '')}"
            )
            story.append(Paragraph(rec_text, body_style))
            story.append(Spacer(1, 6))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def export_audit_to_html(
    website_name: str,
    website_domain: str,
    canonical_url: str,
    overall_score: float,
    readiness_level: str,
    scoring_methodology: Dict[str, Any],
    question_results: List[Dict[str, Any]],
    recommendations: List[Dict[str, Any]],
    pages_analyzed_count: int = 0,
    crawl_errors: List[str] | None = None,
) -> str:
    """
    Generates a standalone, beautifully styled HTML audit report.
    Self-contained CSS with clean typography, balanced slate/navy/teal palette,
    and responsive printable styling.
    """
    date_str = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

    # Score color
    if overall_score >= 80:
        score_badge_bg = "#ecfdf5"
        score_badge_color = "#065f46"
        score_badge_border = "#a7f3d0"
    elif overall_score >= 65:
        score_badge_bg = "#f0fdf4"
        score_badge_color = "#166534"
        score_badge_border = "#bbf7d0"
    elif overall_score >= 50:
        score_badge_bg = "#fffbeb"
        score_badge_color = "#92400e"
        score_badge_border = "#fde68a"
    else:
        score_badge_bg = "#fef2f2"
        score_badge_color = "#991b1b"
        score_badge_border = "#fecaca"

    # Count high/medium/low recommendations
    high_recs = [r for r in recommendations if r.get("priority") in ("critical", "high")]
    med_recs = [r for r in recommendations if r.get("priority") == "medium"]
    low_recs = [r for r in recommendations if r.get("priority") == "low"]

    # Table rows
    table_rows_html = []
    for qr in question_results:
        q_text = html.escape(qr.get("question_text", "Untitled Query"))
        q_intent = html.escape(qr.get("question_intent", "unknown"))
        q_score = qr.get("readiness_score", 0)
        q_status = html.escape(qr.get("status", "unanswered"))
        q_snippet = html.escape(qr.get("direct_answer_snippet") or "No concise direct answer found near the top of the relevant content.")
        urls = qr.get("relevant_page_urls") or []
        primary_url = html.escape(urls[0]) if urls else "None"
        missing = qr.get("missing_subtopics") or []
        missing_str = html.escape(", ".join(missing)) if missing else "None"
        suggested_headings = qr.get("suggested_headings") or []
        headings_str = html.escape(", ".join(suggested_headings[:2])) if suggested_headings else "None"

        table_rows_html.append(f"""
        <tr>
            <td style="font-weight: 600; color: #0f172a;">{q_text}</td>
            <td><span class="badge badge-intent">{q_intent}</span></td>
            <td style="text-align: center; font-weight: 700;">{q_score:.0f}/100</td>
            <td><span class="badge badge-status badge-{q_status}">{q_status.replace('_', ' ').title()}</span></td>
            <td style="font-size: 12px; color: #334155;"><code>{primary_url}</code></td>
            <td style="font-size: 12px; color: #475569;">{q_snippet}</td>
            <td style="font-size: 12px; color: #b45309;">{missing_str}</td>
            <td style="font-size: 12px; color: #0f766e;">{headings_str}</td>
        </tr>
        """)

    # Recommendations HTML
    def render_rec_card(r: Dict[str, Any], priority_class: str) -> str:
        prio = html.escape(r.get("priority", "medium").upper())
        effort = html.escape(r.get("estimated_effort", "medium").title())
        issue = html.escape(r.get("issue", ""))
        action = html.escape(r.get("suggested_action", ""))
        why = html.escape(r.get("why_it_helps", ""))
        evidence = html.escape(r.get("supporting_evidence", ""))
        gap = html.escape(r.get("identified_gap", ""))
        target_q = html.escape(r.get("target_query") or "General Website Content")
        page = html.escape(r.get("affected_page_url") or "Entire Domain / Missing Page")
        note = r.get("owner_confirmation_note")
        note_html = f"<div class='rec-note'><strong>Owner Confirmation Note:</strong> {html.escape(note)}</div>" if note else ""

        return f"""
        <div class="rec-card {priority_class}">
            <div class="rec-header">
                <div>
                    <span class="badge badge-{priority_class}">{prio} PRIORITY</span>
                    <span class="badge badge-effort">Effort: {effort}</span>
                </div>
                <div class="rec-target">Query: <b>{target_q}</b></div>
            </div>
            <h4 class="rec-title">{issue}</h4>
            <div class="rec-meta">
                <span><b>Affected Page:</b> <code>{page}</code></span>
            </div>
            <div class="rec-body">
                <div class="rec-detail"><b>Observed Evidence:</b> {evidence}</div>
                {f'<div class="rec-detail"><b>Identified Gap:</b> {gap}</div>' if gap else ''}
                <div class="rec-detail"><b>Suggested Improvement:</b> {action}</div>
                <div class="rec-detail"><b>Why It Matters:</b> {why}</div>
                {note_html}
            </div>
        </div>
        """

    high_recs_html = "\n".join(render_rec_card(r, "high") for r in high_recs) or "<p class='empty-text'>No high priority gaps detected.</p>"
    med_recs_html = "\n".join(render_rec_card(r, "medium") for r in med_recs) or "<p class='empty-text'>No medium priority gaps detected.</p>"
    low_recs_html = "\n".join(render_rec_card(r, "low") for r in low_recs) or "<p class='empty-text'>No low priority recommendations.</p>"

    crawl_errors_html = ""
    if crawl_errors:
        crawl_errors_html = f"""
        <div class="alert-box alert-warning">
            <h4>Crawl Exceptions & Inaccessible URLs</h4>
            <ul>{''.join(f'<li>{html.escape(e)}</li>' for e in crawl_errors)}</ul>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnswerScope Audit Report — {html.escape(website_name)}</title>
    <style>
        :root {{
            --bg: #f8fafc;
            --surface: #ffffff;
            --border: #e2e8f0;
            --text: #0f172a;
            --muted: #64748b;
            --teal: #0f766e;
            --teal-light: #f0fdfa;
            --navy: #1e293b;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.5;
            padding: 32px 16px;
        }}
        .container {{
            max-width: 1100px;
            margin: 0 auto;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
        }}
        header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid var(--border);
            padding-bottom: 24px;
            margin-bottom: 32px;
        }}
        .brand-block h1 {{
            font-size: 24px;
            font-weight: 800;
            color: var(--navy);
            letter-spacing: -0.5px;
        }}
        .brand-block p {{
            font-size: 13px;
            color: var(--muted);
            margin-top: 4px;
        }}
        .site-meta {{
            text-align: right;
            font-size: 13px;
            color: var(--muted);
        }}
        .site-meta strong {{ color: var(--text); font-size: 14px; }}
        
        .score-hero {{
            display: grid;
            grid-template-columns: 240px 1fr;
            gap: 24px;
            background: var(--teal-light);
            border: 1px solid #ccfbf1;
            border-radius: 10px;
            padding: 24px;
            margin-bottom: 32px;
        }}
        .score-card {{
            text-align: center;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }}
        .score-num {{
            font-size: 48px;
            font-weight: 800;
            color: {score_badge_color};
            line-height: 1;
        }}
        .score-denom {{
            font-size: 14px;
            color: var(--muted);
            margin-bottom: 8px;
        }}
        .badge {{
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .badge-readiness {{
            background: {score_badge_bg};
            color: {score_badge_color};
            border: 1px solid {score_badge_border};
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 16px;
            align-content: center;
        }}
        .stat-item {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
        }}
        .stat-label {{ font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; }}
        .stat-val {{ font-size: 20px; font-weight: 700; color: var(--navy); margin-top: 2px; }}

        section {{ margin-bottom: 40px; }}
        h2 {{
            font-size: 18px;
            font-weight: 700;
            color: var(--navy);
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--border);
        }}
        h3 {{ font-size: 15px; font-weight: 700; color: var(--navy); margin: 16px 0 8px 0; }}
        p.desc {{ font-size: 13px; color: var(--muted); margin-bottom: 16px; }}

        .rubric-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }}
        .rubric-box {{
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            font-size: 12px;
        }}
        .rubric-box b {{ display: block; color: var(--navy); font-size: 13px; margin-bottom: 4px; }}

        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 8px;
        }}
        th, td {{
            border: 1px solid var(--border);
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
        }}
        th {{
            background-color: #f1f5f9;
            font-weight: 700;
            color: var(--navy);
            font-size: 12px;
            text-transform: uppercase;
        }}
        tr:nth-child(even) {{ background-color: #fafafa; }}
        code {{
            background: #f1f5f9;
            padding: 2px 4px;
            border-radius: 4px;
            font-family: ui-monospace, Menlo, monospace;
            font-size: 11px;
            word-break: break-all;
        }}

        .badge-intent {{ background: #e0f2fe; color: #0369a1; }}
        .badge-status {{ font-weight: 600; font-size: 10px; }}
        .badge-ready {{ background: #ecfdf5; color: #065f46; }}
        .badge-partially_ready {{ background: #fffbeb; color: #92400e; }}
        .badge-needs_improvement {{ background: #fef2f2; color: #991b1b; }}
        .badge-unanswered {{ background: #f1f5f9; color: #475569; }}

        .badge-high {{ background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }}
        .badge-medium {{ background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }}
        .badge-low {{ background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }}
        .badge-effort {{ background: #f1f5f9; color: #475569; margin-left: 6px; }}

        .rec-card {{
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            background: var(--surface);
        }}
        .rec-card.high {{ border-left: 4px solid #dc2626; }}
        .rec-card.medium {{ border-left: 4px solid #d97706; }}
        .rec-card.low {{ border-left: 4px solid #16a34a; }}
        .rec-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }}
        .rec-target {{ font-size: 12px; color: var(--muted); }}
        .rec-title {{ font-size: 14px; font-weight: 700; color: var(--navy); margin-bottom: 8px; }}
        .rec-meta {{ font-size: 12px; color: var(--muted); margin-bottom: 8px; }}
        .rec-detail {{ font-size: 12px; margin-bottom: 4px; color: #334155; }}
        .rec-note {{
            margin-top: 8px;
            padding: 8px;
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            font-size: 12px;
            color: #78350f;
            border-radius: 4px;
        }}
        .empty-text {{ font-size: 13px; color: var(--muted); font-style: italic; }}

        .alert-box {{
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 24px;
            font-size: 13px;
        }}
        .alert-warning {{ background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }}
        .alert-info {{ background: #f0fdfa; border: 1px solid #ccfbf1; color: #115e59; }}

        footer {{
            border-top: 1px solid var(--border);
            padding-top: 20px;
            font-size: 11px;
            color: var(--muted);
            text-align: center;
            line-height: 1.6;
        }}
        @media print {{
            body {{ background: white; padding: 0; }}
            .container {{ border: none; box-shadow: none; padding: 0; }}
            .score-hero {{ break-inside: avoid; }}
            .rec-card {{ break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand-block">
                <h1>AnswerScope</h1>
                <p>AI Search Visibility & Answer Engine Audit Report</p>
            </div>
            <div class="site-meta">
                <div>Website: <strong>{html.escape(website_name)}</strong></div>
                <div>Domain: <code>{html.escape(website_domain)}</code></div>
                <div>Generated: {date_str}</div>
            </div>
        </header>

        {crawl_errors_html}

        <div class="score-hero">
            <div class="score-card">
                <div class="score-num">{overall_score:.1f}</div>
                <div class="score-denom">out of 100</div>
                <span class="badge badge-readiness">{readiness_level.upper()}</span>
            </div>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Queries Audited</div>
                    <div class="stat-val">{len(question_results)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Pages Analyzed</div>
                    <div class="stat-val">{pages_analyzed_count}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">High Priority Gaps</div>
                    <div class="stat-val" style="color: #dc2626;">{len(high_recs)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Medium Priority</div>
                    <div class="stat-val" style="color: #d97706;">{len(med_recs)}</div>
                </div>
            </div>
        </div>

        <section>
            <h2>Audit Scoring Methodology</h2>
            <p class="desc">The internal Answer-Readiness Score (0 to 100) measures observable content clarity, direct answer placement, heading semantics, and machine-readable schema markup across successfully retrieved pages. It does not fabricate external search rankings.</p>
            <div class="rubric-grid">
                <div class="rubric-box">
                    <b>1. Direct Answer Presence</b>
                    Max 30 pts. Evaluates concise answers in introductory paragraphs or under relevant headings.
                </div>
                <div class="rubric-box">
                    <b>2. Content Depth & Coverage</b>
                    Max 30 pts. Sufficient word count and intent-specific subtopic coverage.
                </div>
                <div class="rubric-box">
                    <b>3. Schema.org Markup</b>
                    Max 15 pts. Valid JSON-LD structured data (FAQPage, Article, Product, Service).
                </div>
                <div class="rubric-box">
                    <b>4. Heading Hierarchy</b>
                    Max 15 pts. Clear H1/H2 organization framing the query topic.
                </div>
                <div class="rubric-box">
                    <b>5. Evidence & Specificity</b>
                    Max 10 pts. Verifiable facts, steps, specifications, and excerpt clarity.
                </div>
            </div>
        </section>

        <section>
            <h2>Query-by-Query Results & Content Gap Analysis</h2>
            <p class="desc">Breakdown of target queries, direct answers extracted, missing subtopics, and suggested headings.</p>
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Target Query</th>
                            <th>Intent</th>
                            <th>Score</th>
                            <th>Status</th>
                            <th>Primary Page</th>
                            <th>Direct Answer Excerpt</th>
                            <th>Identified Content Gaps</th>
                            <th>Suggested Headings</th>
                        </tr>
                    </thead>
                    <tbody>
                        {''.join(table_rows_html)}
                    </tbody>
                </table>
            </div>
        </section>

        <section>
            <h2>Prioritized Content Improvements</h2>
            <p class="desc">Actionable recommendations prioritized to help human editors and content teams optimize answer accessibility.</p>
            
            <h3>High Priority (Unanswered queries, missing core answers, or inaccessible pages)</h3>
            {high_recs_html}

            <h3 style="margin-top: 24px;">Medium Priority (Topical subtopic gaps or missing Schema.org markup)</h3>
            {med_recs_html}

            <h3 style="margin-top: 24px;">Low Priority (Heading semantics, organization, or metadata refinements)</h3>
            {low_recs_html}
        </section>

        <footer>
            <p><strong>AnswerScope — AI Search Visibility & Answer Engine Audit Platform</strong></p>
            <p>Important Notice: This audit analyzes publicly observable content and technical signals on successfully crawled pages. It does not claim to know proprietary ranking algorithms of third-party AI systems or search engines. Implementation of recommendations does not guarantee search placement.</p>
        </footer>
    </div>
</body>
</html>
"""
