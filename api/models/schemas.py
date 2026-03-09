from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class VaccineRow(BaseModel):
    id: str
    name: str
    full_name: str
    recommended_age_weeks: int
    description: Optional[str] = None
    diseases_prevented: Optional[list[str]] = None
    doses_required: int = 1
    dose_number: int = 1
    series_name: Optional[str] = None

class ChildVaccinationRow(BaseModel):
    id: str
    child_id: str
    vaccine_id: str
    status: str
    administered_date: Optional[str] = None
    doctor_id: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None
    vaccine: Optional[VaccineRow] = None

class ChildRow(BaseModel):
    id: str
    parent_id: str
    full_name: str
    dob: str
    gender: str
    blood_group: Optional[str] = None

class ProfileRow(BaseModel):
    id: str
    role: str
    full_name: str
    phone_number: Optional[str] = None

class CertificateRequest(BaseModel):
    child_id: str
    include_pending: bool = False

class ReminderTriggerRequest(BaseModel):
    parent_id: Optional[str] = None
    dry_run: bool = False

class ReminderResult(BaseModel):
    parent_email: str
    parent_name: str
    children_count: int
    overdue_count: int
    upcoming_count: int
    email_sent: bool
    error: Optional[str] = None

class ReminderResponse(BaseModel):
    triggered_at: datetime
    dry_run: bool
    parents_processed: int
    emails_sent: int
    errors: list[str]
    results: list[ReminderResult]

class WhatsAppTriggerRequest(BaseModel):
    parent_id: Optional[str] = None
    dry_run: bool = False

class WhatsAppResult(BaseModel):
    phone: str
    parent_name: str
    message_preview: str
    message_length: int
    sent: bool
    sid: Optional[str] = None
    error: Optional[str] = None

class WhatsAppTriggerResponse(BaseModel):
    triggered_at: datetime
    dry_run: bool
    parents_processed: int
    messages_sent: int
    skipped_no_phone: int
    errors: list[str]
    results: list[WhatsAppResult]

class PhoneUpdateRequest(BaseModel):
    parent_id: str
    phone_number: str

class PhoneUpdateResponse(BaseModel):
    parent_id: str
    phone_number_e164: str
    success: bool
    error: Optional[str] = None

class WhatsAppPreviewResponse(BaseModel):
    parent_name: str
    phone: Optional[str]
    message: str
    character_count: int
    children_count: int
    overdue_count: int
    upcoming_count: int
