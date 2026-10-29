import io
import csv
from typing import List, Dict, Any
from datetime import datetime

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
    writer.writerow(["Generated At", datetime.utcnow().isoformat()])
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
    """Generates a professional PDF report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e1b4b"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#4b5563"),
    )
    section_style = ParagraphStyle(
        "ReportSection",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#312e81"),
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
    story.append(Paragraph("AI Search Visibility & Answer Engine Audit", title_style))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            f"Website: <b>{website_name}</b> ({website_domain}) | Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4f46e5"), spaceAfter=14))

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
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(score_table)
    story.append(Spacer(1, 14))

    # Capability A — Question Results
    story.append(Paragraph("Website Answer-Readiness Results", section_style))
    
    table_rows = [
        [
            Paragraph("Target Question", table_header_style),
            Paragraph("Intent", table_header_style),
            Paragraph("Score", table_header_style),
            Paragraph("Status", table_header_style),
            Paragraph("Answer Evidence", table_header_style),
        ]
    ]

    for qr in question_results[:12]:  # Limit top 12 for clean PDF layout
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
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
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
        for idx, rec in enumerate(recommendations[:5], start=1):
            rec_text = (
                f"<b>{idx}. [{rec.get('priority', 'medium').upper()}] {rec.get('issue', '')}</b><br/>"
                f"<i>Suggested Action:</i> {rec.get('suggested_action', '')}<br/>"
                f"<i>Why it helps:</i> {rec.get('why_it_helps', '')}"
            )
            story.append(Paragraph(rec_text, body_style))
            story.append(Spacer(1, 6))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
