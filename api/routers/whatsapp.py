"""
/whatsapp — Green API WhatsApp vaccine reminders.

CHANGED: updated from Twilio to Green API (provider swap in whatsapp_service.py)
         All endpoint paths and request/response shapes are unchanged.

POST /whatsapp/trigger              send to all parents with a phone number
POST /whatsapp/trigger-dry-run      compute only, no messages sent
GET  /whatsapp/preview/{parent_id}  see the exact message a parent will receive
POST /whatsapp/phone                save / update a parent's phone number
GET  /whatsapp/sandbox-info         Green API setup instructions
"""
from __future__ import annotations
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from config import get_settings
from services.supabase_client import get_supabase
from services.whatsapp_service import normalise_phone, send_whatsapp_reminder, build_whatsapp_message
from models.schemas import (
    WhatsAppTriggerRequest, WhatsAppTriggerResponse, WhatsAppResult,
    PhoneUpdateRequest, PhoneUpdateResponse, WhatsAppPreviewResponse,
    ProfileRow,
)
from routers.reminders import fetch_vaccines, fetch_children, fetch_vaccinations, child_reminder_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


def require_secret(x_scheduler_secret: str = Header(default="")):
    if x_scheduler_secret != get_settings().scheduler_secret:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid scheduler secret")


async def run_whatsapp(parent_id: Optional[str], dry_run: bool) -> WhatsAppTriggerResponse:
    client = get_supabase()
    s = get_settings()
    today = date.today()
    all_vaccines = fetch_vaccines(client)

    q = client.table("profiles").select("*").eq("role", "parent")
    if parent_id:
        q = q.eq("id", parent_id)
    parents = [ProfileRow(**p) for p in (q.execute().data or [])]

    results: list[WhatsAppResult] = []
    sent = skipped = 0
    errors: list[str] = []

    for parent in parents:
        try:
            phone_raw = parent.phone_number
            if not phone_raw:
                skipped += 1
                continue

            phone = normalise_phone(phone_raw)
            if not phone:
                errors.append(f"{parent.full_name}: invalid phone '{phone_raw}'")
                skipped += 1
                continue

            children = fetch_children(client, parent.id)
            if not children:
                continue

            children_data, total_over, total_up = [], 0, 0
            for child in children:
                vaccinations = fetch_vaccinations(client, child.id)
                cd = child_reminder_data(child, all_vaccines, vaccinations, s.reminder_days_ahead, today)
                if cd["overdue"] or cd["upcoming"]:
                    children_data.append(cd)
                    total_over += len(cd["overdue"])
                    total_up   += len(cd["upcoming"])

            if not children_data:
                continue

            r = send_whatsapp_reminder(phone, parent.full_name, children_data, dry_run)
            results.append(WhatsAppResult(**r))
            if r["sent"]:
                sent += 1
            elif r["error"]:
                errors.append(f"{parent.full_name} ({phone}): {r['error']}")

        except Exception as e:
            errors.append(f"Parent {parent.id}: {e}")
            logger.error(f"WhatsApp error for {parent.id}: {e}")

    return WhatsAppTriggerResponse(
        triggered_at=datetime.utcnow(), dry_run=dry_run,
        parents_processed=len(parents), messages_sent=sent,
        skipped_no_phone=skipped, errors=errors, results=results,
    )


@router.post("/trigger", response_model=WhatsAppTriggerResponse,
             summary="Send WhatsApp reminders to all parents who have a phone number")
async def trigger_whatsapp(
    body: WhatsAppTriggerRequest = WhatsAppTriggerRequest(),
    _: None = Depends(require_secret),
):
    s = get_settings()
    if not s.green_api_configured:
        raise HTTPException(503, "Green API is not configured. Set GREEN_API_INSTANCE_ID and GREEN_API_TOKEN in api/.env")
    return await run_whatsapp(body.parent_id, body.dry_run)


@router.post("/trigger-dry-run", response_model=WhatsAppTriggerResponse,
             summary="Dry-run: compute WhatsApp messages, send nothing")
async def trigger_dry_run(
    body: WhatsAppTriggerRequest = WhatsAppTriggerRequest(),
    _: None = Depends(require_secret),
):
    body.dry_run = True
    return await run_whatsapp(body.parent_id, True)


@router.get("/preview/{parent_id}", response_model=WhatsAppPreviewResponse,
            summary="Preview the exact WhatsApp message a parent will receive")
async def preview_whatsapp(parent_id: str, _: None = Depends(require_secret)):
    client = get_supabase()
    s = get_settings()
    today = date.today()
    all_vaccines = fetch_vaccines(client)

    pr = client.table("profiles").select("*").eq("id", parent_id).single().execute()
    if not pr.data:
        raise HTTPException(404, "Parent not found")
    parent = ProfileRow(**pr.data)

    children_data, total_over, total_up = [], 0, 0
    for child in fetch_children(client, parent_id):
        vaccinations = fetch_vaccinations(client, child.id)
        cd = child_reminder_data(child, all_vaccines, vaccinations, s.reminder_days_ahead, today)
        children_data.append(cd)
        total_over += len(cd["overdue"])
        total_up   += len(cd["upcoming"])

    message = build_whatsapp_message(parent.full_name, children_data)
    phone = normalise_phone(parent.phone_number) if parent.phone_number else None

    return WhatsAppPreviewResponse(
        parent_name=parent.full_name, phone=phone, message=message,
        character_count=len(message), children_count=len(children_data),
        overdue_count=total_over, upcoming_count=total_up,
    )


@router.post("/phone", response_model=PhoneUpdateResponse,
             summary="Save or update a parent's WhatsApp phone number")
async def update_phone(body: PhoneUpdateRequest):
    """
    Called from the React frontend. Normalises to E.164 and writes to profiles.phone_number.
    No scheduler secret required — parents update their own number.
    """
    phone = normalise_phone(body.phone_number)
    if not phone:
        return PhoneUpdateResponse(
            parent_id=body.parent_id, phone_number_e164="",
            success=False,
            error=f"Invalid phone '{body.phone_number}'. Use E.164, e.g. +919876543210",
        )

    client = get_supabase()
    res = client.table("profiles").update({"phone_number": phone}).eq("id", body.parent_id).execute()

    if res.data:
        logger.info(f"Phone saved for parent {body.parent_id}: {phone}")
        return PhoneUpdateResponse(parent_id=body.parent_id, phone_number_e164=phone, success=True)

    return PhoneUpdateResponse(parent_id=body.parent_id, phone_number_e164=phone,
                               success=False, error="Database update failed")


@router.get("/setup-info", summary="Green API setup instructions")
async def setup_info():
    s = get_settings()
    return {
        "provider": "Green API",
        "green_api_configured": s.green_api_configured,
        "instance_id": s.green_api_instance_id or "not set",
        "steps": [
            "1. Go to https://green-api.com and create a free account",
            "2. Click 'Create Instance' → choose the free Developer plan",
            "3. Open the instance → click 'Scan QR code'",
            "4. Open WhatsApp on your phone → Linked Devices → Link a Device → scan the QR",
            "5. Wait for status to show 'authorised' (green)",
            "6. Copy the Instance ID and API Token from the instance settings",
            "7. Add to api/.env: GREEN_API_INSTANCE_ID and GREEN_API_TOKEN",
            "8. Restart the API — you're ready to send messages",
        ],
        "note": (
            "Green API free tier allows sending messages to any WhatsApp number "
            "with no sandbox opt-in required. The linked WhatsApp account "
            "acts as the sender — messages appear from your own number."
        ),
        "phone_format": "Save phone numbers in E.164 format, e.g. +919876543210",
    }