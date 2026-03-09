"""
WhatsApp reminder service — Green API.

CHANGED: entire file rewritten from Twilio to Green API.

Green API uses plain REST calls — no SDK needed, just httpx.
Free tier: https://green-api.com (register, create an instance, scan QR with your WhatsApp)

How it works:
  1. Register at green-api.com
  2. Create a new instance → scan the QR code with your WhatsApp
  3. Copy the Instance ID and API Token into api/.env
  4. Send messages via POST to:
     https://api.green-api.com/waInstance{instanceId}/sendMessage/{apiToken}

Phone number format for Green API chatId: "919876543210@c.us"
  - Country code + number, no +, followed by @c.us
  - E.164 "+919876543210" → "919876543210@c.us"
"""
from __future__ import annotations
import re
import logging
from typing import Optional

import httpx
from config import get_settings

logger = logging.getLogger(__name__)

_E164 = re.compile(r"^\+[1-9]\d{6,14}$")


# ── Phone helpers ─────────────────────────────────────────────

def normalise_phone(raw: str) -> Optional[str]:
    """
    Convert any common format to E.164. Returns None if invalid.
    Accepts: 9876543210 / 09876543210 / +919876543210 / 919876543210
    (unchanged from Twilio version — E.164 is still the storage format)
    """
    d = re.sub(r"[\s\-\(\)]", "", raw or "")
    if not d:
        return None
    if not d.startswith("+"):
        if len(d) == 10:
            d = "+91" + d                  # bare 10-digit → assume India
        elif d.startswith("0") and len(d) == 11:
            d = "+91" + d[1:]              # 0XXXXXXXXXX → India
        elif not d.startswith("0"):
            d = "+" + d                    # already has country code
        else:
            d = "+" + d
    return d if _E164.match(d) else None


# helper — converts E.164 to Green API chatId format
def e164_to_chat_id(phone_e164: str) -> str:
    """
    Convert E.164 to Green API chatId.
    "+919876543210" → "919876543210@c.us"
    """
    return phone_e164.lstrip("+") + "@c.us"


# ── Message builder ──────────────────────────────────────────

def build_whatsapp_message(parent_name: str, children_data: list[dict]) -> str:
    """Craft a WhatsApp-native plain-text reminder (emoji + *bold*)."""
    total_overdue  = sum(len(c["overdue"])  for c in children_data)
    total_upcoming = sum(len(c["upcoming"]) for c in children_data)

    lines: list[str] = [
        "💉 *VaccineTrack Reminder*",
        f"Hi {parent_name.split()[0]}! 👋",
        "",
    ]

    if total_overdue:
        lines.append("🔴 *OVERDUE — Action needed immediately*")
        for child in children_data:
            if not child["overdue"]:
                continue
            lines.append(f"\n👶 *{child['name']}* ({child['age']} old)")
            for v in child["overdue"]:
                d = abs(v["days_overdue"])
                lines.append(f"  ❗ {v['vaccine_name']} — {d} day{'s' if d != 1 else ''} overdue")
        lines.append("")

    if total_upcoming:
        lines.append("🟡 *UPCOMING VACCINES*")
        for child in children_data:
            if not child["upcoming"]:
                continue
            lines.append(f"\n📅 *{child['name']}* ({child['age']} old)")
            for v in child["upcoming"]:
                d = v["days_until_due"]
                when = "Today!" if d == 0 else f"in {d} day{'s' if d != 1 else ''} ({v['due_date']})"
                lines.append(f"  • {v['vaccine_name']} — due {when}")
        lines.append("")

    lines.append("📲 Open VaccineTrack for the full schedule & certificate download.")
    if total_overdue:
        lines.append("\n⚠️ Please visit your nearest immunisation centre as soon as possible.")

    msg = "\n".join(lines)
    if len(msg) > 4000: 
        msg = msg[:4000] + "\n\n_...open the app for full details._"
    return msg


def send_whatsapp(phone_e164: str, message: str) -> str:
    """
    Send a WhatsApp message via Green API.
    Returns the Green API message ID on success.
    Raises httpx.HTTPStatusError or RuntimeError on failure.
    """
    s = get_settings()
    if not s.green_api_configured:
        raise RuntimeError(
            "Green API is not configured. "
            "Set GREEN_API_INSTANCE_ID and GREEN_API_TOKEN in api/.env"
        )

    chat_id = e164_to_chat_id(phone_e164)

    url = (
        f"{s.green_api_base_url}"
        f"/waInstance{s.green_api_instance_id}"
        f"/sendMessage"
        f"/{s.green_api_token}"
    )

    payload = {
        "chatId": chat_id,
        "message": message,
    }

    response = httpx.post(url, json=payload, timeout=15)
    response.raise_for_status()

    data = response.json()
    # Green API returns {"idMessage": "some-id"} on success
    msg_id = data.get("idMessage", "unknown")
    logger.info(f"Green API → {phone_e164} (chatId={chat_id}) idMessage={msg_id}")
    return msg_id


def send_whatsapp_reminder(
    phone_e164: str,
    parent_name: str,
    children_data: list[dict],
    dry_run: bool = False,
) -> dict:
    """
    Build message + send via Green API. Returns a result dict.
    """
    message = build_whatsapp_message(parent_name, children_data)
    result: dict = {
        "phone": phone_e164,
        "parent_name": parent_name,
        "message_preview": message[:120] + ("..." if len(message) > 120 else ""),
        "message_length": len(message),
        "sent": False,
        "sid": None,  
        "error": None,
    }

    if dry_run:
        logger.info(f"[DRY RUN] Would send via Green API to {phone_e164} ({len(message)} chars)")
        return result

    try:
        msg_id = send_whatsapp(phone_e164, message)
        result["sent"] = True
        result["sid"] = msg_id   
    except httpx.HTTPStatusError as e:
        result["error"] = f"Green API HTTP {e.response.status_code}: {e.response.text}"
        logger.error(f"Green API error for {phone_e164}: {e}")
    except Exception as e:
        result["error"] = str(e)
        logger.error(f"WhatsApp send failed for {phone_e164}: {e}")

    return result