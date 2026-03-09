"""
Email service — Resend (resend.com).
Free tier: 3,000 emails/month, 100/day. No credit card required.
Docs: https://resend.com/docs/send-with-python
"""
from __future__ import annotations
import base64
import logging
from typing import Optional

import resend
from config import get_settings

logger = logging.getLogger(__name__)


def build_reminder_html(parent_name: str, children_data: list[dict]) -> tuple[str, str]:
    """Returns (subject, html_body) for a vaccine reminder email."""
    total_overdue  = sum(len(c["overdue"])  for c in children_data)
    total_upcoming = sum(len(c["upcoming"]) for c in children_data)

    if total_overdue > 0:
        subject = f"⚠️ Action needed: {total_overdue} overdue vaccine{'s' if total_overdue > 1 else ''} — VaccineTrack"
    else:
        subject = f"💉 Reminder: {total_upcoming} upcoming vaccine{'s' if total_upcoming > 1 else ''} — VaccineTrack"

    children_html = ""
    for child in children_data:
        overdue_rows = "".join(f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;">
            <strong style="color:#991b1b;">{v['vaccine_name']}</strong>
            <div style="font-size:11px;color:#b91c1c;">{v['full_name']}</div>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;text-align:right;">
            <span style="background:#fee2e2;color:#dc2626;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;">
              {abs(v['days_overdue'])}d overdue
            </span>
          </td>
        </tr>""" for v in child.get("overdue", []))

        upcoming_rows = "".join(f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
            <strong style="color:#0f172a;">{v['vaccine_name']}</strong>
            <div style="font-size:11px;color:#64748b;">{v['full_name']}</div>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">
            <span style="background:#fef3c7;color:#d97706;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;">
              {'Today!' if v['days_until_due'] == 0 else f"In {v['days_until_due']}d"} — {v['due_date']}
            </span>
          </td>
        </tr>""" for v in child.get("upcoming", []))

        overdue_section = f"""
        <div style="margin-bottom:12px;">
          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:8px;">
            <strong style="color:#991b1b;">🔴 Overdue Vaccines ({len(child['overdue'])})</strong>
          </div>
          <table style="width:100%;border-collapse:collapse;">{overdue_rows}</table>
        </div>""" if child.get("overdue") else ""

        upcoming_section = f"""
        <div style="margin-bottom:12px;">
          <div style="background:#fffbeb;border-left:4px solid #d97706;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:8px;">
            <strong style="color:#92400e;">🟡 Upcoming Vaccines ({len(child['upcoming'])})</strong>
          </div>
          <table style="width:100%;border-collapse:collapse;">{upcoming_rows}</table>
        </div>""" if child.get("upcoming") else ""

        children_html += f"""
        <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="padding-bottom:12px;border-bottom:1px solid #f1f5f9;margin-bottom:14px;">
            <strong style="font-size:15px;color:#0f172a;">{child['name']}</strong>
            <span style="font-size:12px;color:#64748b;margin-left:8px;">{child['age']} old</span>
          </div>
          {overdue_section}{upcoming_section}
        </div>"""

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0f172a,#0e7490);padding:28px 32px;">
      <div style="font-size:28px;margin-bottom:8px;">💉</div>
      <div style="color:#fff;font-size:20px;font-weight:700;">VaccineTrack</div>
      <div style="color:#94a3b8;font-size:13px;margin-top:4px;">National Immunisation Schedule</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:16px;color:#0f172a;margin:0 0 8px;">Hi <strong>{parent_name}</strong>,</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
        {'Here is an urgent update about overdue vaccinations that need immediate attention.' if total_overdue else 'Here is a friendly reminder about upcoming vaccinations for your child(ren).'}
      </p>
      {children_html}
      <div style="background:#f0fdfa;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin-top:8px;">
        <p style="margin:0;font-size:13px;color:#065f46;line-height:1.6;">
          💡 Log in to VaccineTrack to view the full schedule and download a vaccination certificate.
        </p>
      </div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="font-size:12px;color:#94a3b8;margin:0;">VaccineTrack · India UIP/NIS Tracker</p>
    </div>
  </div>
</body></html>"""

    return subject, html


def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_body: str,
    attachment_bytes: Optional[bytes] = None,
    attachment_filename: Optional[str] = None,
) -> None:
    """Send via Resend API. Raises on failure."""
    s = get_settings()
    if not s.resend_configured:
        raise RuntimeError("RESEND_API_KEY is not set in environment variables.")

    resend.api_key = s.resend_api_key

    params: resend.Emails.SendParams = {
        "from": f"{s.email_from}",
        "to": f"{to_email}",
        "subject": subject,
        "html": html_body,
    }

    if attachment_bytes and attachment_filename:
        params["attachments"] = [{
            "filename": attachment_filename,
            "content": list(attachment_bytes),  # Resend expects list[int]
        }]

    result = resend.Emails.send(params)
    logger.info(f"Resend: sent to {to_email} (id={result.get('id')})")
