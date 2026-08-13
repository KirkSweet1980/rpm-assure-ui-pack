#!/usr/bin/env python3
"""RPM Assure — Multi-pillar SLA briefing PDF."""
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
    ListFlowable,
    ListItem,
    PageBreak,
)

OUT = "/workspace/RPM-Assure-Multi-Pillar-SLA.pdf"

NAVY = HexColor("#0c2742")
NAVY_DEEP = HexColor("#07141f")
TEAL = HexColor("#1bb8a6")
TEAL_DK = HexColor("#0f6e64")
INK = HexColor("#1a2430")
MUTED = HexColor("#5a6672")
LINE = HexColor("#d5dde4")
ROW = HexColor("#f4f7f8")
AMBER = HexColor("#c47b16")
AMBER_BG = HexColor("#fbf3e6")
GREEN = HexColor("#1a7a4c")
RED = HexColor("#b42318")
PAPER = HexColor("#f7f9fa")


def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 18 * mm, w, 18 * mm, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, h - 18.8 * mm, w, 1.2 * mm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Times-Bold", 9)
    canvas.drawString(18 * mm, h - 8.2 * mm, "RPM ASSURE")
    canvas.setFont("Times-Roman", 8)
    canvas.setFillColor(HexColor("#b8c5d0"))
    canvas.drawRightString(w - 18 * mm, h - 8.2 * mm, "Internal briefing  ·  13 August 2026")
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, 12 * mm, w, 0.8 * mm, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#b8c5d0"))
    canvas.setFont("Times-Roman", 7.5)
    canvas.drawString(18 * mm, 5 * mm, "Confidential  ·  RPM Resources (Pty) Ltd")
    canvas.drawRightString(w - 18 * mm, 5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def styles():
    ss = getSampleStyleSheet()
    ss.add(
        ParagraphStyle(
            "H1",
            fontName="Times-Bold",
            fontSize=18,
            leading=22,
            textColor=NAVY,
            spaceAfter=4 * mm,
        )
    )
    ss.add(
        ParagraphStyle(
            "H2",
            fontName="Times-Bold",
            fontSize=12,
            leading=15,
            textColor=NAVY,
            spaceBefore=6 * mm,
            spaceAfter=2.5 * mm,
        )
    )
    ss.add(
        ParagraphStyle(
            "Lead",
            fontName="Times-Roman",
            fontSize=10.5,
            leading=14.5,
            textColor=INK,
            spaceAfter=3 * mm,
        )
    )
    ss.add(
        ParagraphStyle(
            "Body",
            fontName="Times-Roman",
            fontSize=9.5,
            leading=13,
            textColor=INK,
            spaceAfter=2 * mm,
        )
    )
    ss.add(
        ParagraphStyle(
            "Small",
            fontName="Times-Roman",
            fontSize=8,
            leading=10.5,
            textColor=MUTED,
        )
    )
    ss.add(
        ParagraphStyle(
            "Th",
            fontName="Times-Bold",
            fontSize=8,
            leading=10.5,
            textColor=white,
        )
    )
    ss.add(
        ParagraphStyle(
            "Td",
            fontName="Times-Roman",
            fontSize=8,
            leading=10.5,
            textColor=INK,
        )
    )
    ss.add(
        ParagraphStyle(
            "TdB",
            fontName="Times-Bold",
            fontSize=8,
            leading=10.5,
            textColor=NAVY,
        )
    )
    ss.add(
        ParagraphStyle(
            "Callout",
            fontName="Times-Roman",
            fontSize=9,
            leading=12.5,
            textColor=INK,
        )
    )
    ss.add(
        ParagraphStyle(
            "Foot",
            fontName="Times-Italic",
            fontSize=8.5,
            leading=11.5,
            textColor=MUTED,
            spaceBefore=3 * mm,
        )
    )
    return ss


def table(data, col_widths, header=True):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    cmds = [
        ("FONTNAME", (0, 0), (-1, 0), "Times-Bold") if header else ("FONTNAME", (0, 0), (-1, -1), "Times-Roman"),
        ("BACKGROUND", (0, 0), (-1, 0), NAVY) if header else ("BACKGROUND", (0, 0), (-1, 0), white),
        ("TEXTCOLOR", (0, 0), (-1, 0), white) if header else ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LEADING", (0, 0), (-1, -1), 10.5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
        ("FONTNAME", (0, 1), (0, -1), "Times-Bold"),
        ("TEXTCOLOR", (0, 1), (0, -1), NAVY),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0, i), (-1, i), ROW))
    t.setStyle(TableStyle(cmds))
    return t


def callout(text, s, tint=AMBER_BG, bar=AMBER):
    inner = Table(
        [[Paragraph(text, s["Callout"])]],
        colWidths=[174 * mm],
    )
    inner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), tint),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LINEBEFORE", (0, 0), (0, 0), 3, bar),
            ]
        )
    )
    return inner


def build():
    s = styles()

    def P(t):
        return Paragraph(t, s["Td"])

    def B(t):
        return Paragraph(t, s["TdB"])

    def Sm(t):
        return Paragraph(t, s["Th"])

    story = []

    story.append(Paragraph("How RPM Assure scores SLA", s["H1"]))
    story.append(
        Paragraph(
            "Multi-pillar SLA explained  ·  compared to the SYSPRO Support & AMS Service Level Agreement (Rev 5.0, August 2026)",
            s["Lead"],
        )
    )
    story.append(HRFlowable(width="100%", thickness=0.6, color=TEAL, spaceAfter=4 * mm))

    story.append(
        Paragraph(
            "<b>Multi-pillar SLA</b> means Assure does not give one contract score. "
            "It scores each <b>service RPM actually runs</b> for that customer, then averages only those. "
            "The five menus always show. Only four can enter SLA. Microsoft 365 never does.",
            s["Body"],
        )
    )

    story.append(Paragraph("1.  Which pillars enter the score", s["H2"]))
    story.append(
        table(
            [
                [Sm("Pillar"), Sm("Enters SLA?"), Sm("On cover when"), Sm("If No Cover")],
                [
                    B("SYSPRO"),
                    P("Yes"),
                    P("Collect / operators / company databases present"),
                    P("Yellow “No Cover” — excluded from Overall"),
                ],
                [
                    B("RMM (Pulseway)"),
                    P("Yes"),
                    P("Mapped organisation and devices"),
                    P("Excluded from Overall"),
                ],
                [
                    B("Cloud Backup (Cove)"),
                    P("Yes"),
                    P("Mapped partner and backup devices"),
                    P("Excluded from Overall"),
                ],
                [
                    B("EPP (Bitdefender)"),
                    P("Yes"),
                    P("Mapped company and endpoints"),
                    P("Excluded from Overall"),
                ],
                [
                    B("Microsoft 365 CSP"),
                    P("Never"),
                    P("Tenant / Graph collect (posture only)"),
                    P("Shown on ExCo; Secure Score / MFA / GAs only"),
                ],
            ],
            [38 * mm, 28 * mm, 58 * mm, 50 * mm],
        )
    )
    story.append(
        Paragraph(
            "No Cover does not pull Overall down. Covered with no number (for example RMM with no classified servers) is a dash and is also excluded from the average. Overall is a simple average of covered pillars that have a percentage.",
            s["Foot"],
        )
    )

    story.append(Paragraph("2.  How each pillar is scored", s["H2"]))
    story.append(
        Paragraph(
            "Start at 100 (except RMM, which starts from servers online). Then deduct. Floor 0, cap 100, one decimal place. This is <b>operational posture</b> from live collect — not a ticket stopwatch.",
            s["Body"],
        )
    )

    story.append(Paragraph("SYSPRO — AMS health", s["H2"]))
    story.append(
        table(
            [
                [Sm("Signal"), Sm("Penalty"), Sm("Note")],
                [B("No collect at all"), P("−50"), P("No last-import timestamp")],
                [B("Collect older than 24 hours"), P("−35"), P("Stale SYSPRO warehouse")],
                [B("Job errors"), P("−(15 + 5 per error), max −40"), P("Failed / error SYSPRO jobs")],
                [B("FinSight out-of-balance lines"), P("−(10 + 2 per line), max −35"), P("DTR / recon exceptions")],
                [B("None of the above"), P("100"), P("“SYSPRO controls clear”")],
            ],
            [58 * mm, 58 * mm, 58 * mm],
        )
    )

    story.append(Paragraph("RMM — servers only", s["H2"]))
    story.append(
        Paragraph(
            "Workstations never enter the SLA. If no servers are classified, the pillar is a dash even if workstations exist.",
            s["Body"],
        )
    )
    story.append(
        table(
            [
                [Sm("Rule"), Sm("Formula")],
                [B("Base"), P("(servers online ÷ all servers) × 100")],
                [B("Critical alerts"), P("Minus 12 per critical alert, maximum −40")],
                [B("No servers"), P("No percentage — dash — excluded from Overall")],
            ],
            [50 * mm, 124 * mm],
        )
    )

    story.append(Paragraph("Cloud Backup", s["H2"]))
    story.append(
        table(
            [
                [Sm("State"), Sm("Score")],
                [B("Healthy"), P("100")],
                [B("Failed or stale"), P("35")],
                [B("Devices exist, status unknown"), P("70")],
                [B("On cover, no signal yet"), P("80")],
            ],
            [90 * mm, 84 * mm],
        )
    )

    story.append(Paragraph("End Point Protection", s["H2"]))
    story.append(
        table(
            [
                [Sm("State"), Sm("Score")],
                [B("Managed ÷ total endpoints"), P("That percentage")],
                [B("Endpoints mapped, no managed count"), P("95")],
                [B("On cover, no rows yet"), P("80")],
            ],
            [90 * mm, 84 * mm],
        )
    )

    story.append(Paragraph("3.  Worked example", s["H2"]))
    story.append(
        table(
            [
                [Sm("Pillar"), Sm("Inputs"), Sm("Score"), Sm("In Overall?")],
                [
                    B("SYSPRO"),
                    P("Fresh collect · 0 job errors · 4 FinSight OOB"),
                    P("100 − (10 + 8) = 82"),
                    P("Yes"),
                ],
                [
                    B("RMM"),
                    P("4 of 5 servers online · 1 critical"),
                    P("80 − 12 = 68"),
                    P("Yes"),
                ],
                [B("Backup"), P("No Cover"), P("—"), P("No")],
                [B("EPP"), P("No Cover"), P("—"), P("No")],
                [B("Microsoft 365"), P("Ignored for SLA"), P("—"), P("No")],
                [B("Overall"), P("Average of scored pillars only"), P("(82 + 68) ÷ 2 = 75%"), P("—")],
            ],
            [36 * mm, 68 * mm, 42 * mm, 28 * mm],
        )
    )
    story.append(
        Paragraph(
            "Backup and EPP did not dilute the score. That is the rule applied to every customer: same menus, Covered or No Cover, only covered legs in Overall.",
            s["Foot"],
        )
    )

    story.append(Paragraph("4.  Two different “SLAs” inside Assure", s["H2"]))
    story.append(
        table(
            [
                [Sm("Surface"), Sm("What it measures"), Sm("Matches Martin’s SLA doc?")],
                [
                    B("ExCo — SLA Stats by Customer"),
                    P("Multi-pillar posture (this briefing). Live collect. SYSPRO / RMM / Backup / EPP."),
                    P("No — this is operations, not ticket clocks."),
                ],
                [
                    B("Customer → AMS → SLA"),
                    P("Wants respond / resolve clocks. If no desk feed, derives availability and compliance from health RAG and still prints a 99.5% target."),
                    P("No — Rev 5.0 has no uptime % and uses Acknowledge / Remote / Restore in Business Hours."),
                ],
            ],
            [48 * mm, 72 * mm, 54 * mm],
        )
    )

    story.append(Spacer(1, 4 * mm))
    story.append(
        callout(
            "<b>One-line distinction.</b> Multi-pillar SLA asks: <i>are we delivering each product we sold?</i> "
            "The signed SLA asks: <i>did we acknowledge a P1 in 30 minutes?</i> "
            "Assure scores the first well. It does not yet measure the second.",
            s,
        )
    )

    story.append(Paragraph("5.  Signed SLA (Rev 5.0) vs Assure scoring", s["H2"]))
    story.append(
        table(
            [
                [Sm("Martin’s contract"), Sm("Assure multi-pillar score")],
                [
                    P("No uptime percentage. Targets, not guarantees. No service credits (clause 7.5)."),
                    P("ExCo uses a 0–100 posture %. AMS page still shows a 99.5% “agreed target” when derived."),
                ],
                [
                    P("Three clocks: Acknowledge / Remote / Restore. P1 = 30 min / 1 BH / 8 BH."),
                    P("Two clocks on AMS page: Respond / Resolve. Defaults 60 min / 4 hours — different table."),
                ],
                [
                    P("Business Hours only (08:00–17:00, local)."),
                    P("No BH vs after-hours split in the score."),
                ],
                [
                    P("Scope = SYSPRO Support + AMS (Sections 3–4). Infra, backup, cyber excluded (5.1, 11.2)."),
                    P("Scores Backup and EPP when on cover. Correct as estate posture; not this contract."),
                ],
                [
                    P("AMS 4.2–4.8: jobs, setup change, recon, SQL, platform servers, day-end, hotfixes, monthly health."),
                    P("Jobs, OperAmend, FinSight, hotfixes, health, RMM servers map cleanly. Day-end is not a first-class tile."),
                ],
            ],
            [87 * mm, 87 * mm],
        )
    )

    story.append(Paragraph("6.  What to show whom", s["H2"]))
    story.append(
        table(
            [
                [Sm("Audience"), Sm("Use")],
                [
                    B("ExCo / internal"),
                    P("Multi-pillar table. All five menus. Covered / No Cover. Overall from covered legs only."),
                ],
                [
                    B("Customer pack against the signed SLA"),
                    P("SYSPRO + AMS evidence only (jobs, FinSight, health, hotfixes, operators). Print P1–P4 as in the document. Do not print 99.5% or Backup/EPP as contractual SLA."),
                ],
            ],
            [48 * mm, 126 * mm],
        )
    )

    story.append(Spacer(1, 5 * mm))
    story.append(HRFlowable(width="100%", thickness=0.4, color=LINE, spaceAfter=3 * mm))
    story.append(
        Paragraph(
            "Source: RPM Assure scoring in <i>exco-sla-stats.ts</i> (buildExcoPillarSla) and the SYSPRO Support & Application Management Services SLA template, Revision 5.0, August 2026 (Martin Richards). This briefing is internal and does not amend the contract.",
            s["Foot"],
        )
    )

    doc = SimpleDocTemplate(
        OUT,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=24 * mm,
        bottomMargin=18 * mm,
        title="RPM Assure — How multi-pillar SLA is scored",
        author="RPM Assure",
        subject="Internal briefing: multi-pillar SLA vs signed AMS SLA",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUT)


if __name__ == "__main__":
    build()
