"""
PDF Certificate Generator — ReportLab.
Generates a professional A4 vaccination certificate.
"""
from __future__ import annotations
import io
from datetime import date
from collections import defaultdict
from typing import Optional
from xml.sax.saxutils import escape  # <-- CRITICAL ADDITION

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)

from models.schemas import ChildRow, ChildVaccinationRow, VaccineRow
from services.vaccine_logic import (
    build_schedule, format_age, get_schedule_summary, AGE_LABELS, ScheduleEntry,
)


# ── Colours ───────────────────────────────────────────────────
TEAL        = colors.HexColor("#0891B2")
TEAL_LIGHT  = colors.HexColor("#E0F2FE")
TEAL_DARK   = colors.HexColor("#0E7490")
NAVY        = colors.HexColor("#0F172A")
SLATE       = colors.HexColor("#475569")
SLATE_LIGHT = colors.HexColor("#94A3B8")
GREEN       = colors.HexColor("#16A34A")
GREEN_LIGHT = colors.HexColor("#DCFCE7")
RED         = colors.HexColor("#DC2626")
RED_LIGHT   = colors.HexColor("#FEE2E2")
AMBER       = colors.HexColor("#D97706")
AMBER_LIGHT = colors.HexColor("#FEF3C7")
BORDER      = colors.HexColor("#E2E8F0")
BG          = colors.HexColor("#F8FAFC")
WHITE       = colors.white


def _ps(name, font="Helvetica", size=10, color=NAVY, align=TA_LEFT, leading=None,
        sb=0, sa=0) -> ParagraphStyle:
    return ParagraphStyle(
        name, fontName=font, fontSize=size, textColor=color,
        alignment=align, leading=leading or size * 1.35,
        spaceBefore=sb, spaceAfter=sa,
    )

def _status_colors(status: str):
    return {
        "completed": (GREEN_LIGHT, GREEN),
        "overdue":   (RED_LIGHT,   RED),
        "upcoming":  (AMBER_LIGHT, AMBER),
    }.get(status, (BG, SLATE))

# ── HELPER: Sanitizes text for ReportLab Paragraphs ───────────
def safe_text(val) -> str:
    # Catch None or completely empty strings
    if val is None or str(val).strip() == "":
        return "—"
    return escape(str(val))


def generate_certificate(
    child: ChildRow,
    all_vaccines: list[VaccineRow],
    vaccinations: list[ChildVaccinationRow],
    include_pending: bool = False,
    generated_by: Optional[str] = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=15*mm, leftMargin=15*mm,
        topMargin=12*mm, bottomMargin=15*mm,
        title=f"Vaccination Certificate — {safe_text(child.full_name)}",
    )

    dob   = date.fromisoformat(str(child.dob))
    today = date.today()
    age   = format_age(dob, today)

    schedule = build_schedule(dob, all_vaccines, vaccinations, today)
    display  = [
        e for e in schedule
        if include_pending or e.status != "upcoming" or e.days_until_due <= 0
    ] if not include_pending else schedule

    summary  = get_schedule_summary(schedule)
    pct      = int(summary["completed"] / summary["total"] * 100) if summary["total"] else 0

    story = []

    # ── HEADER ────────────────────────────────────────────────
    header_data = [[
        Paragraph("VaccineTrack",
                  _ps("h1", "Helvetica-Bold", 18, WHITE, TA_LEFT, leading=22)),
        Paragraph("VACCINATION CERTIFICATE",
                  _ps("h2", "Helvetica-Bold", 10, WHITE, TA_RIGHT)),
    ]]
    header = Table(header_data, colWidths=[100*mm, 80*mm])
    header.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), TEAL_DARK),
        ("TOPPADDING",    (0, 0), (-1, -1), 8*mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8*mm),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6*mm),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6*mm),
    ]))
    story.append(header)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "National Immunisation Schedule — Universal Immunisation Programme (UIP), India",
        _ps("sub", size=8, color=SLATE, align=TA_CENTER),
    ))
    story.append(Spacer(1, 5*mm))

    # ── CHILD DETAILS ─────────────────────────────────────────
    label = _ps("lbl", size=8, color=SLATE_LIGHT)
    value = _ps("val", "Helvetica-Bold", size=9, color=NAVY)
    val_sm = _ps("vsm", size=8, color=SLATE)

    rows = [
        [Paragraph("Patient Name",    label), Paragraph(safe_text(child.full_name).upper(),
                   _ps("nm", "Helvetica-Bold", 12, NAVY))],
        [Paragraph("Date of Birth",   label), Paragraph(
            f"{dob.strftime('%d %B %Y')}  ({age} old)", value)],
        [Paragraph("Gender",          label), Paragraph(safe_text(child.gender).capitalize(), value)],
        [Paragraph("Blood Group",     label), Paragraph(
            safe_text(child.blood_group) or "—", value)],
        [Paragraph("Certificate Date",label), Paragraph(today.strftime("%d %B %Y"), value)],
        [Paragraph("Patient ID",      label), Paragraph(safe_text(child.id), val_sm)], 
    ]
    if generated_by:
        rows.append([Paragraph("Authorised By", label), Paragraph(safe_text(generated_by), value)])

    details = Table(rows, colWidths=[35*mm, 140*mm])
    details.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), BG),
        ("TOPPADDING",    (0, 0), (-1, -1), 3*mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3*mm),
        ("LEFTPADDING",   (0, 0), (0, -1),  4*mm),
        ("LEFTPADDING",   (1, 0), (1, -1),  3*mm),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.5, BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(details)
    story.append(Spacer(1, 6*mm))

    # ── SUMMARY STATS ─────────────────────────────────────────
    story.append(Paragraph("Immunisation Summary",
                            _ps("sh", "Helvetica-Bold", 11, NAVY, sb=2, sa=4)))

    done_w = max(4, int(pct * 1.55))
    todo_w = 155 - done_w
    
    # FIX: Only put text in the green bar if it's wide enough to fit the words.
    # Otherwise, put the text in the grey bar so ReportLab doesn't crash.
    if pct >= 20:
        bar_text_left = Paragraph(f" {pct}% Complete", _ps("pp", "Helvetica-Bold", 8, WHITE))
        bar_text_right = ""
    else:
        bar_text_left = ""
        bar_text_right = Paragraph(f" {pct}% Complete", _ps("pp", "Helvetica-Bold", 8, SLATE))

    prog = Table(
        [[bar_text_left, bar_text_right]],
        colWidths=[done_w*mm, todo_w*mm], rowHeights=[7*mm],
    )
    
    prog.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, 0), GREEN),
        ("BACKGROUND",    (1, 0), (1, 0), BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 1*mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1*mm),
        ("LEFTPADDING",   (0, 0), (-1, -1), 2*mm),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(prog)
    story.append(Spacer(1, 3*mm))

    # ── VACCINE TABLE ─────────────────────────────────────────
    story.append(Paragraph("Vaccination Record",
                            _ps("vr", "Helvetica-Bold", 11, NAVY, sb=2, sa=4)))

    groups: dict[int, list[ScheduleEntry]] = defaultdict(list)
    for entry in display:
        groups[entry.vaccine.recommended_age_weeks].append(entry)

    th = _ps("th", "Helvetica-Bold", 8, SLATE)
    
    style_vn = _ps("vn_style", size=9, color=NAVY)
    style_dp = _ps("dp_style", size=7, color=SLATE)
    style_ad = _ps("ad_style", size=8, color=NAVY, align=TA_CENTER)
    style_bn = _ps("bn_style", size=7, color=SLATE, align=TA_CENTER)

    for age_weeks in sorted(groups.keys()):
        entries = groups[age_weeks]
        age_label = AGE_LABELS.get(age_weeks, f"{age_weeks} Weeks")

        grp_header = Table(
            [[Paragraph(f"{age_label}",
                        _ps(f"gh{age_weeks}", "Helvetica-Bold", 9, TEAL_DARK))]],
            colWidths=[175*mm], rowHeights=[8*mm],
        )
        grp_header.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), TEAL_LIGHT),
            ("TOPPADDING",    (0, 0), (-1, -1), 2*mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2*mm),
            ("LEFTPADDING",   (0, 0), (-1, -1), 3*mm),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ]))

        rows = [[
            Paragraph("Vaccine",          th),
            Paragraph("Prevents",         th),
            Paragraph("Status",           th),
            Paragraph("Date Given",       th),
            Paragraph("Batch No.",        th),
        ]]

        for entry in entries:
            bg, fg = _status_colors(entry.status)
            
            # String parsing with XML escaping applied AFTER truncation
            diseases = ", ".join(entry.vaccine.diseases_prevented or []) or "—"
            if len(diseases) > 55:
                diseases = diseases[:52] + "..."
            diseases = safe_text(diseases)

            adm_date = "—"
            if entry.vaccination and entry.vaccination.administered_date:
                try:
                    date_str = str(entry.vaccination.administered_date)
                    adm_date = date.fromisoformat(date_str).strftime("%d %b %Y")
                except Exception:
                    adm_date = safe_text(entry.vaccination.administered_date)

            batch = safe_text(entry.vaccination.batch_number) if entry.vaccination and entry.vaccination.batch_number else "—"

            full_name_short = entry.vaccine.full_name
            if len(full_name_short) > 40:
                full_name_short = full_name_short[:37] + "..."
            full_name_short = safe_text(full_name_short)
            
            vaccine_name = safe_text(entry.vaccine.name)

            style_st = _ps(f"st_{entry.status}", "Helvetica-Bold", 7, fg, TA_CENTER)

            rows.append([
                Paragraph(
                    f"<b>{vaccine_name}</b><br/>"
                    f"<font size='7' color='#64748b'>{full_name_short}</font>",
                    style_vn,
                ),
                Paragraph(
                    f"<font size='7' color='#475569'>{diseases}</font>",
                    style_dp,
                ),
                Paragraph(
                    safe_text(entry.status).upper(),
                    style_st,
                ),
                Paragraph(adm_date, style_ad),
                Paragraph(batch,    style_bn),
            ])

        vax_table = Table(
            rows,
            colWidths=[42*mm, 55*mm, 20*mm, 28*mm, 28*mm],
            repeatRows=1,
        )

        row_bgs = [("BACKGROUND", (0, 0), (-1, 0), BG)]
        for i in range(1, len(rows)):
            c = WHITE if i % 2 == 1 else BG
            row_bgs.append(("BACKGROUND", (0, i), (-1, i), c))

        for i, entry in enumerate(entries, start=1):
            bg, _ = _status_colors(entry.status)
            row_bgs.append(("BACKGROUND", (2, i), (2, i), bg))

        vax_table.setStyle(TableStyle([
            *row_bgs,
            ("LINEBELOW",     (0, 0), (-1, -1), 0.5, BORDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 2.5*mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5*mm),
            ("LEFTPADDING",   (0, 0), (-1, -1), 2*mm),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 2*mm),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ]))

        story.append(KeepTogether([grp_header, vax_table, Spacer(1, 3*mm)]))

    # ── FOOTER ────────────────────────────────────────────────
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        f"Auto-generated by VaccineTrack on {today.strftime('%d %B %Y')}. "
        "For reference only — verify records with your healthcare provider.",
        _ps("ft", size=7, color=SLATE_LIGHT, align=TA_CENTER),
    ))
    story.append(Paragraph(
        "VaccineTrack · National Immunisation Schedule · Universal Immunisation Programme (UIP), India",
        _ps("fb", "Helvetica-Bold", 7, SLATE_LIGHT, TA_CENTER),
    ))

    doc.build(story)
    return buffer.getvalue()