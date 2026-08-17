#!/usr/bin/env python3
"""RPM | Assurance Delivered — EXCO SLA pack (Rev 5.0, August 2026)."""
from __future__ import annotations

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

OUT = os.environ.get(
    "SLA_PDF_OUT",
    "/workspace/docs/RPM-Assurance-SLA-EXCO-Pack.pdf",
)

pdfmetrics.registerFont(TTFont("Sans", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("SansB", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("SansI", "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf"))
pdfmetrics.registerFont(TTFont("SansBI", "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf"))

NAVY = HexColor("#10232c")
INK = HexColor("#1a242c")
MUTED = HexColor("#5b6770")
LINE = HexColor("#d5dde3")
PAPER = HexColor("#f4f7f8")
TEAL = HexColor("#0d9488")
TEAL_DK = HexColor("#0b6e66")
GREEN = HexColor("#17c666")
AMBER = HexColor("#ffa21d")
RED = HexColor("#ea4d4d")
CARD = HexColor("#ffffff")
SOFT = HexColor("#e8eef0")

W, H = A4
M = 16 * mm


def wrap(c, text, font, size, max_w):
    return simpleSplit(text, font, size, max_w)


def footer(c, page, total):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, 10 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Sans", 7.5)
    c.drawString(M, 4 * mm, "RPM | Assurance Delivered  ·  Confidential  ·  EXCO pack")
    c.drawRightString(W - M, 4 * mm, f"SLA Rev 5.0  ·  August 2026  ·  {page} / {total}")


def header_bar(c, title, subtitle=""):
    c.setFillColor(NAVY)
    c.rect(0, H - 18 * mm, W, 18 * mm, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, H - 18.8 * mm, W, 1.2 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("SansB", 11)
    c.drawString(M, H - 9.2 * mm, title)
    if subtitle:
        c.setFont("Sans", 8)
        c.setFillColor(HexColor("#b7c4c8"))
        c.drawRightString(W - M, H - 9.2 * mm, subtitle)


def card(c, x, y, w, h, fill=CARD):
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, 3.2, fill=1, stroke=1)


def hrule(c, x, y, w):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(x, y, x + w, y)


def pill(c, x, y, text, bg, fg=white):
    c.setFont("SansB", 7)
    tw = c.stringWidth(text, "SansB", 7) + 8
    c.setFillColor(bg)
    c.roundRect(x, y, tw, 4.2 * mm, 2, fill=1, stroke=0)
    c.setFillColor(fg)
    c.drawString(x + 4, y + 1.15 * mm, text)
    return tw


def bar(c, x, y, w, h, pct, color):
    c.setFillColor(SOFT)
    c.roundRect(x, y, w, h, 1.4, fill=1, stroke=0)
    fill_w = max(2, min(w, w * max(0, min(100, pct)) / 100.0))
    c.setFillColor(color)
    c.roundRect(x, y, fill_w, h, 1.4, fill=1, stroke=0)


def draw_clock_chart(c, x, y, w, h):
    """One row per priority: three labelled bars in business minutes."""
    rows = [
        ("P1  Critical", 30, 60, 480, "30m", "1 BH", "8 BH"),
        ("P2  High", 30, 120, 960, "30m", "2 BH", "2 BD"),
        ("P3  Medium", 120, 480, 2400, "2 BH", "8 BH", "5 BD"),
        ("P4  Low", 240, 960, None, "4 BH", "2 BD", "Agree"),
    ]
    max_m = 2400.0
    c.setFont("SansB", 8)
    c.setFillColor(INK)
    c.drawString(x, y + h + 2.2 * mm, "Signed clocks in business minutes  ·  08:00–17:00 SAST")
    legend = [(TEAL, "Acknowledge"), (HexColor("#3b82f6"), "Remote start"), (NAVY, "Restore")]
    lx = x + w - 78 * mm
    for col, lab in legend:
        c.setFillColor(col)
        c.roundRect(lx, y + h + 1.4 * mm, 3.2 * mm, 2.4 * mm, 0.6, fill=1, stroke=0)
        c.setFillColor(MUTED)
        c.setFont("Sans", 7)
        c.drawString(lx + 4.2 * mm, y + h + 1.7 * mm, lab)
        lx += 26 * mm

    label_w = 28 * mm
    chart_x = x + label_w
    chart_w = w - label_w
    row_h = h / 4.0
    for i, (lab, a, r, s, la, lr, ls) in enumerate(rows):
        top = y + h - i * row_h
        by = top - row_h + 2.4 * mm
        c.setFillColor(PAPER if i % 2 else HexColor("#eef3f4"))
        c.roundRect(x, y + h - (i + 1) * row_h + 0.6 * mm, w, row_h - 1.2 * mm, 1.6, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("SansB", 7.4)
        c.drawString(x + 2 * mm, by + 5.4 * mm, lab)
        # three thin bars stacked
        series = [
            (a, TEAL, la),
            (r, HexColor("#3b82f6"), lr),
            (s, NAVY, ls),
        ]
        bh = 2.05 * mm
        for j, (val, col, tag) in enumerate(series):
            yy = by + (2 - j) * (bh + 0.55 * mm)
            track = chart_w - 16 * mm
            c.setFillColor(HexColor("#dce4e7"))
            c.roundRect(chart_x, yy, track, bh, 0.6, fill=1, stroke=0)
            if val:
                c.setFillColor(col)
                c.roundRect(chart_x, yy, max(3, track * (val / max_m)), bh, 0.6, fill=1, stroke=0)
            c.setFillColor(MUTED)
            c.setFont("Sans", 6)
            c.drawString(chart_x + track + 1.6 * mm, yy + 0.15 * mm, tag)


def draw_target_chart(c, x, y, w, h):
    items = [
        ("RMM uptime", 99.9, TEAL),
        ("Backup success", 99.5, TEAL_DK),
        ("EPP coverage", 98.0, HexColor("#0f766e")),
        ("Patch (ops)", 95.0, HexColor("#3b82f6")),
        ("Ticket response", 90.0, NAVY),
        ("Ticket restore", 90.0, NAVY),
        ("SYSPRO jobs", 100.0, HexColor("#6366f1")),
        ("M365 MFA (ops)", 95.0, HexColor("#64748b")),
    ]
    c.setFont("SansB", 8)
    c.setFillColor(INK)
    c.drawString(x, y + h + 2 * mm, "KPI targets EXCO is looking for")
    row_h = h / len(items)
    for i, (lab, pct, col) in enumerate(items):
        by = y + h - (i + 1) * row_h + 1.5 * mm
        c.setFillColor(INK)
        c.setFont("Sans", 7.4)
        c.drawString(x, by + 1.1 * mm, lab)
        bar(c, x + 38 * mm, by, w - 58 * mm, 3.1 * mm, pct, col)
        c.setFont("SansB", 7.4)
        c.setFillColor(col)
        c.drawRightString(x + w, by + 1.1 * mm, f"{pct:g}%")


def page_cover(c):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, H - 6 * mm, W, 6 * mm, fill=1, stroke=0)
    c.rect(0, 0, W, 14 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Sans", 9)
    c.drawString(M, H - 28 * mm, "BOARD PACK  ·  CONFIDENTIAL")
    c.setFont("SansB", 26)
    c.drawString(M, H - 46 * mm, "RPM  |  Assurance Delivered")
    c.setFont("Sans", 13)
    c.setFillColor(HexColor("#c5d4d8"))
    c.drawString(M, H - 56 * mm, "Service Level structure for EXCO")
    c.setStrokeColor(TEAL)
    c.setLineWidth(2)
    c.line(M, H - 62 * mm, M + 42 * mm, H - 62 * mm)

    boxes = [
        ("Rev 5.0", "Signed contract"),
        ("August 2026", "Effective"),
        ("6 services", "Scored in Assure"),
        ("17 KPIs", "Live in product"),
    ]
    bw = (W - 2 * M - 9 * mm) / 4
    for i, (a, b) in enumerate(boxes):
        x = M + i * (bw + 3 * mm)
        c.setFillColor(HexColor("#16343d"))
        c.roundRect(x, H - 92 * mm, bw, 22 * mm, 3, fill=1, stroke=0)
        c.setFillColor(TEAL)
        c.setFont("SansB", 12)
        c.drawString(x + 3.5 * mm, H - 79 * mm, a)
        c.setFillColor(HexColor("#b7c4c8"))
        c.setFont("Sans", 7.5)
        c.drawString(x + 3.5 * mm, H - 86 * mm, b)

    c.setFillColor(white)
    c.setFont("SansB", 11)
    c.drawString(M, H - 108 * mm, "What this pack answers")
    points = [
        "What colour should EXCO expect on the estate — and why a tenant can be amber inside and red on the portfolio.",
        "Which clocks are in the signed SYSPRO Support & AMS contract (Layer A).",
        "Which operational KPIs we score from live collect (Layer B) — RMM, Cloud Backup, EndPoint Protection.",
        "Exactly how each KPI is calculated, what is excluded, and what is not a miss.",
    ]
    yy = H - 118 * mm
    c.setFont("Sans", 9.2)
    c.setFillColor(HexColor("#dce6e9"))
    for p in points:
        c.setFillColor(TEAL)
        c.circle(M + 1.6 * mm, yy + 1.4 * mm, 1.15 * mm, fill=1, stroke=0)
        c.setFillColor(HexColor("#dce6e9"))
        for line in wrap(c, p, "Sans", 9.2, W - 2 * M - 8 * mm):
            c.drawString(M + 6 * mm, yy, line)
            yy -= 4.4 * mm
        yy -= 2.4 * mm

    c.setFillColor(HexColor("#16343d"))
    c.roundRect(M, 28 * mm, W - 2 * M, 36 * mm, 3, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.setFont("SansB", 8)
    c.drawString(M + 5 * mm, 55 * mm, "ONE RULE FOR THE ROOM")
    c.setFillColor(white)
    c.setFont("Sans", 9.5)
    rule = (
        "We only score services that are on Cover and have live rows. "
        "No Cover is blank — never red. Open ticket clocks are not a miss. "
        "Targets are targets, not guarantees (clause 7.5). This contract has no uptime %."
    )
    yy = 48 * mm
    for line in wrap(c, rule, "Sans", 9.5, W - 2 * M - 12 * mm):
        c.drawString(M + 5 * mm, yy, line)
        yy -= 4.6 * mm

    c.setFillColor(NAVY)
    c.setFont("Sans", 8)
    c.drawCentredString(W / 2, 5.5 * mm, "Source of truth in Assure  ·  sla-metrics.ts  ·  service-sla.ts  ·  ticket-sla.ts")


def page_how_to_read(c):
    header_bar(c, "1  ·  How EXCO should read Assure", "The 60-second model")
    y = H - 28 * mm

    # Three layers
    cols = [
        (
            "Layer A — Contract",
            TEAL,
            "SYSPRO Support & AMS Rev 5.0. Ticket clocks only. Business hours 08:00–17:00 local. No availability percentage. No service credits for missing a target.",
        ),
        (
            "Layer B — Operations",
            HexColor("#3b82f6"),
            "RMM, Cloud Backup and EndPoint Protection. Industry measures we can compute from last collect. Not in clauses 5.1 / 11.2 of the signed AMS contract.",
        ),
        (
            "Colour — RAG",
            GREEN,
            "Green ≥ 80 · Amber 55–79 · Red ≤ 54. Colour follows the worst covered service. A No Cover pillar never paints the tenant red.",
        ),
    ]
    cw = (W - 2 * M - 8 * mm) / 3
    for i, (t, col, body) in enumerate(cols):
        x = M + i * (cw + 4 * mm)
        card(c, x, y - 48 * mm, cw, 48 * mm)
        c.setFillColor(col)
        c.rect(x, y - 2.4 * mm, cw, 2.4 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("SansB", 8.5)
        c.drawString(x + 3 * mm, y - 9 * mm, t)
        c.setFillColor(MUTED)
        c.setFont("Sans", 7.6)
        yy = y - 16 * mm
        for line in wrap(c, body, "Sans", 7.6, cw - 6 * mm):
            c.drawString(x + 3 * mm, yy, line)
            yy -= 3.6 * mm

    y = y - 58 * mm
    c.setFont("SansB", 10)
    c.setFillColor(INK)
    c.drawString(M, y, "What you look at on the estate")
    y -= 6 * mm
    rows = [
        ("Customer Ecosystem (portfolio)", "Average of covered, scored services only. Microsoft 365 is posture — it is not in the EXCO average."),
        ("Inside a customer", "Same RAG bands, same KPI math. If a pillar has Cover but no devices, it is not scored."),
        ("Cover vs No Cover", "Cover = we have a live feed for that service. Tickets are always Cover; empty feed shows “no tickets for this customer”."),
        ("Heads-up / robot", "Worst covered service wins the colour. Number is floored into that band so a red service cannot look green."),
    ]
    for title, body in rows:
        card(c, M, y - 16 * mm, W - 2 * M, 16 * mm)
        c.setFillColor(TEAL)
        c.rect(M, y - 16 * mm, 1.6 * mm, 16 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("SansB", 8)
        c.drawString(M + 5 * mm, y - 6 * mm, title)
        c.setFillColor(MUTED)
        c.setFont("Sans", 7.6)
        c.drawString(M + 5 * mm, y - 11.4 * mm, body)
        y -= 18 * mm

    y -= 2 * mm
    c.setFont("SansB", 10)
    c.setFillColor(INK)
    c.drawString(M, y, "Scoring hygiene — what is never a miss")
    y -= 5 * mm
    hygiene = [
        "No Cover for Devices — 0 servers, 0 backup devices, 0 endpoints: excluded, not red.",
        "Open ticket clocks — still inside the window: held, not a breach.",
        "P4 restore — by agreement: not scored.",
        "Backup job that fails then succeeds inside the 24h RPO: still compliant.",
        "Recovery Testing with no API timestamp: In plan — not scored as a miss (emails still fire).",
        "Microsoft 365 Secure Score / MFA: operational posture only.",
    ]
    c.setFont("Sans", 8)
    for htxt in hygiene:
        c.setFillColor(TEAL)
        c.circle(M + 1.8 * mm, y + 1.2 * mm, 1.1 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(M + 6 * mm, y, htxt)
        y -= 5.2 * mm

    footer(c, 2, 8)


def page_clocks(c):
    header_bar(c, "2  ·  Layer A — signed ticket clocks", "SYSPRO Support & AMS  ·  Rev 5.0")
    y = H - 26 * mm
    c.setFillColor(MUTED)
    c.setFont("Sans", 8)
    c.drawString(M, y, "Business Hours = 08:00–17:00 on a Business Day (8 BH). Measured as a monthly average. Restoration includes a reasonable workaround.")
    y -= 8 * mm

    headers = ["Pri", "Name", "Means", "Acknowledge", "Remote start", "Restore"]
    widths = [14 * mm, 22 * mm, 62 * mm, 28 * mm, 28 * mm, 32 * mm]
    x = M
    c.setFillColor(NAVY)
    c.rect(M, y - 7 * mm, sum(widths), 8 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("SansB", 7.4)
    xx = M + 2 * mm
    for htxt, w in zip(headers, widths):
        c.drawString(xx, y - 4.6 * mm, htxt)
        xx += w
    y -= 7 * mm
    clocks = [
        ("P1", "Critical", "System down or a core process stopped for many users. No workaround.", "30 minutes", "1 Business Hour", "8 Business Hours"),
        ("P2", "High", "Major function impaired. Workaround difficult or impractical.", "30 minutes", "2 Business Hours", "2 Business Days"),
        ("P3", "Medium", "Impaired for one or a few users. Workaround available.", "2 Business Hours", "8 Business Hours", "5 Business Days"),
        ("P4", "Low", "Minor, query or cosmetic. Little or no business impact.", "4 Business Hours", "2 Business Days", "By agreement"),
    ]
    pri_col = {"P1": RED, "P2": AMBER, "P3": TEAL, "P4": MUTED}
    for i, row in enumerate(clocks):
        rh = 16 * mm
        c.setFillColor(PAPER if i % 2 else white)
        c.rect(M, y - rh, sum(widths), rh, fill=1, stroke=0)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.4)
        c.line(M, y - rh, M + sum(widths), y - rh)
        xx = M + 2 * mm
        c.setFillColor(pri_col[row[0]])
        c.setFont("SansB", 9)
        c.drawString(xx, y - 9 * mm, row[0])
        xx += widths[0]
        c.setFillColor(INK)
        c.setFont("SansB", 8)
        c.drawString(xx, y - 9 * mm, row[1])
        xx += widths[1]
        c.setFont("Sans", 7.2)
        c.setFillColor(MUTED)
        yy = y - 6.2 * mm
        for line in wrap(c, row[2], "Sans", 7.2, widths[2] - 3 * mm):
            c.drawString(xx, yy, line)
            yy -= 3.3 * mm
        xx += widths[2]
        for j, cell in enumerate(row[3:]):
            c.setFillColor(INK)
            c.setFont("SansB", 7.6)
            c.drawString(xx, y - 9 * mm, cell)
            xx += widths[3 + j]
        y -= rh

    y -= 4 * mm
    draw_clock_chart(c, M, 62 * mm, W - 2 * M, 52 * mm)

    # Security admin
    card(c, M, 18 * mm, W - 2 * M, 40 * mm)
    c.setFont("SansB", 8.5)
    c.setFillColor(INK)
    c.drawString(M + 4 * mm, 50 * mm, "Security administration (same contract)")
    c.setFont("Sans", 7.6)
    c.setFillColor(MUTED)
    c.drawString(M + 4 * mm, 45.2 * mm, "These are AMS tasks, not ticket clocks — still Layer A.")
    admin = [
        ("User creation", "2 Business Days"),
        ("User modification (roles, permissions, licences)", "2 Business Days"),
        ("User termination / deactivation", "1 Business Day — same day if received before 12:00 and marked urgent"),
    ]
    yy = 39 * mm
    for a, b in admin:
        c.setFillColor(INK)
        c.setFont("Sans", 8)
        c.drawString(M + 4 * mm, yy, a)
        c.setFont("SansB", 8)
        c.setFillColor(TEAL_DK)
        c.drawRightString(W - M - 4 * mm, yy, b)
        yy -= 6 * mm

    footer(c, 3, 8)


def page_kpi_map(c):
    header_bar(c, "3  ·  All KPIs EXCO is looking for", "17 live measures  ·  contractual vs operational")
    y = H - 26 * mm
    draw_target_chart(c, M, y - 58 * mm, W - 2 * M, 54 * mm)

    y = y - 70 * mm
    c.setFont("SansB", 10)
    c.setFillColor(INK)
    c.drawString(M, y, "KPI index — every line Assure scores today")
    y -= 3 * mm

    kpis = [
        ("RMM", "Server uptime", "99.9%", "Yes", "30-day offline hours, else online snapshot. Servers only."),
        ("RMM", "Agent coverage", "≥ 99%", "Yes", "Servers reporting (online or last-seen ≤ 15 min)."),
        ("RMM", "Patch compliance", "≥ 95%", "No", "Servers with zero outstanding critical/important."),
        ("RMM", "Disk pressure", "0 at ≥85%", "No", "One hot volume is a miss on that server."),
        ("Backup", "Job success", "99.5%", "Yes", "OK ÷ (OK + failed). Warning inside RPO = OK."),
        ("Backup", "RPO 24h", "100%", "Yes", "Last success within 24 hours. Stale = miss."),
        ("EPP", "Protection coverage", "≥ 98%", "Yes", "Managed ÷ (managed + unmanaged)."),
        ("EPP", "Definition currency", "≥ 95%", "Yes", "Signatures current, or last scan ≤ 24h."),
        ("EPP", "Open criticals", "0", "No", "Each open critical/high deducts 20 pts."),
        ("SYSPRO", "Job logging", "0 errors", "Yes", "Each error −8 pts."),
        ("SYSPRO", "FinSight control", "0 OOB", "Yes", "Each out-of-balance line −10 pts."),
        ("SYSPRO", "Collect freshness", "≤ 24h", "No", "≤24h green · ≤48h amber · then miss."),
        ("Tickets", "First response", "≥ 90%", "Yes", "vs P1–P4 acknowledge, last 30 days, SAST BH."),
        ("Tickets", "Restore / resolve", "≥ 90%", "Yes", "P1–P3 restore clocks. P4 not scored."),
        ("Tickets", "Open book", "Owned", "No", "Each open ticket −5 pts (floor 40)."),
        ("M365", "Secure Score", "≥ 70%", "No", "Posture only — not in EXCO average."),
        ("M365", "MFA registration", "≥ 95%", "No", "Registered ÷ capable."),
    ]
    headers = ["Service", "KPI", "Target", "Contract", "How Assure computes it"]
    widths = [22 * mm, 36 * mm, 22 * mm, 18 * mm, 88 * mm]
    c.setFillColor(NAVY)
    c.rect(M, y - 6.2 * mm, sum(widths), 7 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("SansB", 6.8)
    xx = M + 1.6 * mm
    for htxt, w in zip(headers, widths):
        c.drawString(xx, y - 4.2 * mm, htxt)
        xx += w
    y -= 6.2 * mm
    for i, row in enumerate(kpis):
        rh = 5.55 * mm
        c.setFillColor(PAPER if i % 2 else white)
        c.rect(M, y - rh, sum(widths), rh, fill=1, stroke=0)
        vals_font = ["SansB", "Sans", "SansB", "SansB", "Sans"]
        cols = [INK, INK, TEAL_DK, GREEN if row[3] == "Yes" else MUTED, MUTED]
        xx = M + 1.6 * mm
        for j, (cell, fnt, col, w) in enumerate(zip(row, vals_font, cols, widths)):
            c.setFont(fnt, 6.5)
            c.setFillColor(col)
            c.drawString(xx, y - 4.1 * mm, cell)
            xx += w
        y -= rh

    footer(c, 4, 8)


def kpi_block(c, x, y, w, h, title, target, lines, exclusions):
    card(c, x, y, w, h)
    c.setFillColor(NAVY)
    c.rect(x, y + h - 8.5 * mm, w, 8.5 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("SansB", 8.4)
    c.drawString(x + 3 * mm, y + h - 5.6 * mm, title)
    c.setFont("Sans", 7)
    c.setFillColor(HexColor("#9cb0b6"))
    c.drawRightString(x + w - 3 * mm, y + h - 5.6 * mm, target)
    yy = y + h - 14 * mm
    for metric, tgt, how in lines:
        c.setFillColor(INK)
        c.setFont("SansB", 7.4)
        c.drawString(x + 3 * mm, yy, metric)
        c.setFillColor(TEAL_DK)
        c.setFont("SansB", 7.2)
        c.drawRightString(x + w - 3 * mm, yy, tgt)
        yy -= 3.8 * mm
        c.setFillColor(MUTED)
        c.setFont("Sans", 6.7)
        for ln in wrap(c, how, "Sans", 6.7, w - 6 * mm):
            c.drawString(x + 3 * mm, yy, ln)
            yy -= 3.2 * mm
        yy -= 1.6 * mm
    c.setFillColor(HexColor("#f3f6f7"))
    c.rect(x, y, w, 16 * mm, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("SansB", 6.4)
    c.drawString(x + 3 * mm, y + 12 * mm, "NOT SCORED / EXCLUDED")
    c.setFont("Sans", 6.3)
    yy = y + 8.4 * mm
    for ex in exclusions[:3]:
        for ln in wrap(c, "·  " + ex, "Sans", 6.3, w - 6 * mm):
            c.drawString(x + 3 * mm, yy, ln)
            yy -= 2.9 * mm


def page_ops_rmm_backup(c):
    header_bar(c, "4  ·  Layer B — RMM and Cloud Backup", "Operational posture from last collect")
    gap = 5 * mm
    cw = (W - 2 * M - gap) / 2
    h = 148 * mm
    y = 22 * mm
    kpi_block(
        c, M, y, cw, h,
        "RPM Remote Management",
        "Headline 99.9% monthly uptime",
        [
            ("Server uptime / availability", "99.9% standard",
             "Unplanned downtime vs period. Prefer 30-day offline hours from RMM. Else servers online ÷ classified servers. Each critical alert −12 pts (cap −40). Workstations excluded."),
            ("Agent / monitoring coverage", "≥ 99%",
             "Classified servers with a reporting agent — online, or last seen within 15 minutes."),
            ("Server patch compliance", "≥ 95%",
             "Servers with zero outstanding updates ÷ servers that report a patch count. Click-through lists KB titles."),
            ("Disk pressure", "0 servers ≥ 85%",
             "One volume at or above 85% used is a miss on that server. IOPS is collected but is not an SLA line."),
        ],
        [
            "Planned maintenance with 48–72h notice.",
            "Client power / ISP / third-party cloud outages.",
            "0 servers = No Cover for Devices, not scored.",
        ],
    )
    kpi_block(
        c, M + cw + gap, y, cw, h,
        "RPM Cloud Backup",
        "Headline 99.5% success · 24h RPO",
        [
            ("Backup success rate", "99% – 99.9%+",
             "OK jobs ÷ (OK + failed) on latest collect. A warning that still meets RPO counts as OK."),
            ("RPO — standard servers / files", "4–24h (we score 24h)",
             "Devices whose last successful backup is within 24 hours. Stale devices miss RPO."),
            ("Restore tests (visibility)", "In plan — not a miss",
             "Recovery Testing / Standby Image is shown on the device. Continuity session time is not on the statistics API, so restore % is not scored as a miss."),
        ],
        [
            "Offline devices, full disks, app locks on the client.",
            "Fail then succeed inside RPO = still compliant.",
            "0 devices = No Cover for Devices, not scored.",
        ],
    )
    footer(c, 5, 8)


def page_ops_epp_syspro(c):
    header_bar(c, "5  ·  Layer B — EndPoint Protection and SYSPRO", "Protection coverage + AMS health")
    gap = 5 * mm
    cw = (W - 2 * M - gap) / 2
    h = 148 * mm
    y = 22 * mm
    kpi_block(
        c, M, y, cw, h,
        "RPM EndPoint Protection",
        "Headline 98% endpoints managed",
        [
            ("Protection coverage", "≥ 98–100%",
             "Managed ÷ (managed + unmanaged) from last EPP collect."),
            ("Definition / content updates", "≥ 95–99% in 24h",
             "Product + signatures current, or last successful scan within 24 hours. Missing flags on a managed endpoint count as current."),
            ("Open critical incidents", "0 open criticals",
             "Open critical / high incidents on the EPP feed. Operational, not a nines target. Each open −20 pts."),
            ("Installed modules (visibility)", "Policy roll-up",
             "Modules turned on in policies assigned to the customer. Not an SLA score — EXCO can see what is actually licensed on."),
        ],
        [
            "Detection-efficacy % is not contractual.",
            "Endpoints the client has not approved.",
            "0 endpoints = No Cover for Devices.",
        ],
    )
    kpi_block(
        c, M + cw + gap, y, cw, h,
        "SYSPRO  ·  AMS health",
        "Headline 90% jobs clean · FinSight in control",
        [
            ("Job logging", "0 failed / error jobs",
             "SYSPRO job error count on last collect. Each error deducts 8 points (floor 0). Ticket clocks sit on Customer Tickets, not here."),
            ("FinSight control", "0 out-of-balance lines",
             "Open FinSight recon lines. Each line deducts 10 points (floor 0)."),
            ("Collect freshness", "Last collect ≤ 24h",
             "Hours since last SYSPRO import. Green ≤ 24h, amber ≤ 48h, then a miss."),
            ("Build / companies (visibility)", "Licence XML + company DBs",
             "Build from AdmSystemLicense / RawXml. Companies from live company databases — not an SLA line."),
        ],
        [
            "Demo or deferred companies not scored.",
            "Hotfixes and SQL instance health are visibility.",
            "No Cover = pillar omitted from EXCO average.",
        ],
    )
    footer(c, 6, 8)


def page_tickets_m365(c):
    header_bar(c, "6  ·  Customer Tickets and Microsoft 365", "Clocks vs posture")
    gap = 5 * mm
    cw = (W - 2 * M - gap) / 2
    h = 118 * mm
    y = 52 * mm
    kpi_block(
        c, M, y, cw, h,
        "Customer Tickets",
        "Headline 90% response · 90% restore",
        [
            ("Acknowledge / first response", "≥ 90% in clock",
             "Freshdesk first-response vs P1–P4 acknowledge minutes in SAST business hours. Last 30 days. Open clocks inside the window are not scored."),
            ("Restore / resolve", "≥ 90% in clock",
             "Resolved tickets vs P1–P3 restore. P4 restore is by agreement and is not scored."),
            ("Open tickets", "Owned, inside clock",
             "Open count. 0 open = 100%. Each open ticket −5 pts (floor 40) — operational pressure, not a restore miss."),
        ],
        [
            "Unmapped Freshdesk companies do not land on a customer.",
            "Open clocks are not a miss until they expire.",
            "Empty feed: Cover stays on, pane says no tickets.",
        ],
    )
    kpi_block(
        c, M + cw + gap, y, cw, h,
        "Microsoft 365  ·  posture only",
        "Not in the EXCO SLA average",
        [
            ("Secure Score", "≥ 70% of Microsoft max",
             "Current Secure Score ÷ max from Graph collect. Visibility of tenant hygiene."),
            ("MFA registration", "≥ 95% of capable users",
             "MFA registered ÷ MFA capable on the latest snapshot."),
            ("Licence assignment", "Seats in use",
             "Assigned ÷ purchased. Unused seats are not a breach."),
        ],
        [
            "M365 is not the signed SYSPRO + AMS contract.",
            "Depends on Graph collect for that tenant.",
            "Never rolls into the portfolio SLA number.",
        ],
    )

    # RAG strip
    card(c, M, 16 * mm, W - 2 * M, 32 * mm)
    c.setFont("SansB", 8.5)
    c.setFillColor(INK)
    c.drawString(M + 4 * mm, 40 * mm, "How the number becomes a colour")
    bands = [
        (GREEN, "GREEN", "80 – 100", "All covered services meeting or near target."),
        (AMBER, "AMBER", "55 – 79", "A covered service is off target. Ask which KPI."),
        (RED, "RED", "0 – 54", "A covered service is failing. Worst service wins."),
    ]
    bw = (W - 2 * M - 14 * mm) / 3
    for i, (col, name, rng, note) in enumerate(bands):
        x = M + 4 * mm + i * (bw + 3 * mm)
        c.setFillColor(col)
        c.roundRect(x, 19.5 * mm, bw, 16.5 * mm, 2.2, fill=1, stroke=0)
        fg = NAVY if name == "AMBER" else white
        c.setFillColor(fg)
        c.setFont("SansB", 8)
        c.drawString(x + 2.6 * mm, 30.4 * mm, name)
        c.setFont("SansB", 7)
        c.drawRightString(x + bw - 2.6 * mm, 30.4 * mm, rng)
        c.setFont("Sans", 6.4)
        yy = 26.2 * mm
        for ln in wrap(c, note, "Sans", 6.4, bw - 5.2 * mm):
            c.drawString(x + 2.6 * mm, yy, ln)
            yy -= 3.0 * mm

    footer(c, 7, 8)


def page_ask(c):
    header_bar(c, "7  ·  What EXCO should ask in the room", "Questions, not a data dump")
    y = H - 28 * mm

    asks = [
        ("1", "Who is red, and is it Cover?",
         "If a tenant is red, name the covered service. If the service has no devices, it should not be scoring — that is a mapping bug, not an outage."),
        ("2", "Is the miss contractual or operational?",
         "Ticket clocks, backup success, RPO, RMM uptime and EPP coverage are contractual / board-grade. Patch, disk, open-ticket pressure and M365 are operational."),
        ("3", "Are we inside the clock or already late?",
         "Open P1/P2 still inside acknowledge is amber pressure, not a breach. Breach is a closed clock that missed, or an open clock that has expired."),
        ("4", "Did backup miss the 24-hour RPO?",
         "A failed job that reran successfully the same day is still compliant. Stale last-success older than 24h is the miss."),
        ("5", "Is SYSPRO the application or the ticket?",
         "Job errors and FinSight OOB are AMS health. Response and restore live on Customer Tickets. Do not double-count."),
        ("6", "What did we exclude on purpose?",
         "Workstations from uptime. P4 restore. Continuity test timestamps the vendor API does not publish. Unmapped Freshdesk companies."),
    ]
    for num, title, body in asks:
        card(c, M, y - 20 * mm, W - 2 * M, 20 * mm)
        c.setFillColor(TEAL)
        c.circle(M + 8 * mm, y - 10 * mm, 4.2 * mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("SansB", 9)
        c.drawCentredString(M + 8 * mm, y - 11.4 * mm, num)
        c.setFillColor(INK)
        c.setFont("SansB", 8.6)
        c.drawString(M + 16 * mm, y - 7.2 * mm, title)
        c.setFillColor(MUTED)
        c.setFont("Sans", 7.7)
        yy = y - 12.4 * mm
        for ln in wrap(c, body, "Sans", 7.7, W - 2 * M - 22 * mm):
            c.drawString(M + 16 * mm, yy, ln)
            yy -= 3.5 * mm
        y -= 22 * mm

    card(c, M, 16 * mm, W - 2 * M, 28 * mm)
    c.setFillColor(NAVY)
    c.rect(M, 16 * mm, 2.2 * mm, 28 * mm, fill=1, stroke=0)
    c.setFont("SansB", 8)
    c.setFillColor(INK)
    c.drawString(M + 6 * mm, 36 * mm, "Clause reminder — say this if asked")
    c.setFont("Sans", 7.6)
    c.setFillColor(MUTED)
    legal = (
        "Targets, not guarantees (clause 7.5). No service credits, set-off or termination right for missing a target. "
        "The signed contract covers SYSPRO Support + AMS only. Backups, infrastructure, OS, AD and cybersecurity are "
        "excluded from that contract (clauses 5.1 and 11.2) — we still operate and score them as Layer B so EXCO can see posture. "
        "This contract has no availability percentage."
    )
    yy = 30.5 * mm
    for ln in wrap(c, legal, "Sans", 7.6, W - 2 * M - 12 * mm):
        c.drawString(M + 6 * mm, yy, ln)
        yy -= 3.6 * mm

    footer(c, 8, 8)


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("RPM | Assurance Delivered — EXCO SLA pack")
    c.setAuthor("RPM Resources")
    c.setSubject("SLA structure, clocks, KPIs and scoring rules — Rev 5.0 August 2026")
    pages = [
        page_cover,
        page_how_to_read,
        page_clocks,
        page_kpi_map,
        page_ops_rmm_backup,
        page_ops_epp_syspro,
        page_tickets_m365,
        page_ask,
    ]
    for fn in pages:
        fn(c)
        c.showPage()
    c.save()
    print("WROTE", OUT, os.path.getsize(OUT))


if __name__ == "__main__":
    main()
