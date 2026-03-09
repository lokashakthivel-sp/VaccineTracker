"""
/reminders — SendGrid email reminders for parents.

POST /reminders/trigger          send to all parents (or one)
POST /reminders/trigger-dry-run  compute only, no emails
GET  /reminders/preview/{id}     HTML preview for one parent
"""
from __future__ import annotations
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import HTMLResponse

from config import get_settings
from services.supabase_client import get_supabase
from services.vaccine_logic import build_schedule, format_age
from services.email_service import build_reminder_html, send_email
from models.schemas import (
    ReminderTriggerRequest, ReminderResponse, ReminderResult,
    ChildRow, ProfileRow, VaccineRow, ChildVaccinationRow,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reminders", tags=["Reminders"])


# ── Auth guard ────────────────────────────────────────────────
def require_secret(x_scheduler_secret: str = Header(default="")):
    if x_scheduler_secret != get_settings().scheduler_secret:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid scheduler secret")


# ── Data helpers (shared with whatsapp router) ────────────────
def fetch_vaccines(client) -> list[VaccineRow]:
    return [VaccineRow(**v) for v in (client.table("vaccines").select("*").execute().data or [])]

def fetch_children(client, parent_id: str) -> list[ChildRow]:
    return [ChildRow(**c) for c in (client.table("children").select("*").eq("parent_id", parent_id).execute().data or [])]

def fetch_vaccinations(client, child_id: str) -> list[ChildVaccinationRow]:
    return [ChildVaccinationRow(**v) for v in (
        client.table("child_vaccinations")
              .select("*, vaccine:vaccines(*)")
              .eq("child_id", child_id).execute().data or [])]

def child_reminder_data(child: ChildRow, vaccines: list[VaccineRow],
                        vaccinations: list[ChildVaccinationRow],
                        days_ahead: int, today: date) -> dict:
    dob = date.fromisoformat(child.dob)
    schedule = build_schedule(dob, vaccines, vaccinations, today)
    return {
        "name": child.full_name,
        "age": format_age(dob, today),
        "gender": child.gender,
        "overdue": [
            {"vaccine_name": e.vaccine.name, "full_name": e.vaccine.full_name,
             "days_overdue": e.days_until_due, "due_date": e.due_date.isoformat()}
            for e in schedule if e.status == "overdue"
        ],
        "upcoming": [
            {"vaccine_name": e.vaccine.name, "full_name": e.vaccine.full_name,
             "days_until_due": e.days_until_due, "due_date": e.due_date.strftime("%d %b %Y")}
            for e in schedule if e.status == "upcoming" and 0 <= e.days_until_due <= days_ahead
        ],
    }


# ── Core logic ────────────────────────────────────────────────
async def run_reminders(parent_id: Optional[str], dry_run: bool) -> ReminderResponse:
    client = get_supabase()
    s = get_settings()
    today = date.today()
    all_vaccines = fetch_vaccines(client)

    q = client.table("profiles").select("*").eq("role", "parent")
    if parent_id:
        q = q.eq("id", parent_id)
    parents = [ProfileRow(**p) for p in (q.execute().data or [])]

    results: list[ReminderResult] = []
    sent = 0
    errors: list[str] = []

    for parent in parents:
        try:
            user = client.auth.admin.get_user_by_id(parent.id)
            email = user.user.email if user.user else None
            if not email:
                errors.append(f"No email for parent {parent.id}")
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

            subject, html = build_reminder_html(parent.full_name, children_data)
            email_sent, err = False, None

            if not dry_run:
                try:
                    send_email("lokashakthivelsp@gmail.com", parent.full_name, subject, html) # hardcoding the email to mine, bcoz resend free trial allows only the verified email as recipient
                    email_sent = True
                    sent += 1
                except Exception as e:
                    err = str(e)
                    errors.append(f"{email}: {e}")
                    logger.error(f"Resend failed for {email}: {e}")

            results.append(ReminderResult(
                parent_email=email, parent_name=parent.full_name,
                children_count=len(children), overdue_count=total_over,
                upcoming_count=total_up, email_sent=email_sent, error=err,
            ))
        except Exception as e:
            errors.append(f"Parent {parent.id}: {e}")
            logger.error(f"Reminder error for {parent.id}: {e}")

    return ReminderResponse(
        triggered_at=datetime.utcnow(), dry_run=dry_run,
        parents_processed=len(parents), emails_sent=sent,
        errors=errors, results=results,
    )


# ── Routes ────────────────────────────────────────────────────
@router.post("/trigger", response_model=ReminderResponse,
             summary="Send reminder emails to all parents (Resend)")
async def trigger_reminders(
    body: ReminderTriggerRequest = ReminderTriggerRequest(),
    _: None = Depends(require_secret),
):
    s = get_settings()
    if not s.resend_configured:
        raise HTTPException(503, "RESEND_API_KEY is not configured")
    return await run_reminders(body.parent_id, body.dry_run)


@router.post("/trigger-dry-run", response_model=ReminderResponse,
             summary="Dry-run: compute emails, send nothing")
async def trigger_dry_run(
    body: ReminderTriggerRequest = ReminderTriggerRequest(),
    _: None = Depends(require_secret),
):
    body.dry_run = True
    return await run_reminders(body.parent_id, True)


@router.get("/preview/{parent_id}", response_class=HTMLResponse,
            summary="Preview the HTML email for one parent")
async def preview_reminder(parent_id: str, _: None = Depends(require_secret)):
    client = get_supabase()
    s = get_settings()
    all_vaccines = fetch_vaccines(client)
    today = date.today()

    pr = client.table("profiles").select("*").eq("id", parent_id).single().execute()
    if not pr.data:
        raise HTTPException(404, "Parent not found")
    parent = ProfileRow(**pr.data)

    children_data = []
    for child in fetch_children(client, parent_id):
        vaccinations = fetch_vaccinations(client, child.id)
        children_data.append(
            child_reminder_data(child, all_vaccines, vaccinations, s.reminder_days_ahead, today)
        )

    _, html = build_reminder_html(parent.full_name, children_data)
    return HTMLResponse(html)
