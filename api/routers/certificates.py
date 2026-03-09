"""
/certificates — stream PDF vaccination certificates.

GET  /certificates/{child_id}   download PDF
POST /certificates/generate     same with JSON body
"""
from __future__ import annotations
import io, logging
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from services.supabase_client import get_supabase
from services.pdf_service import generate_certificate
from models.schemas import ChildRow, VaccineRow, ChildVaccinationRow, CertificateRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/certificates", tags=["Certificates"])


def _load(child_id: str):
    client = get_supabase()
    cr = client.table("children").select("*").eq("id", child_id).single().execute()
    if not cr.data:
        raise HTTPException(404, f"Child {child_id} not found")
    child = ChildRow(**cr.data)
    vr = client.table("vaccines").select("*").order("recommended_age_weeks").execute()
    vaccines = [VaccineRow(**v) for v in (vr.data or [])]
    xr = (client.table("child_vaccinations")
          .select("*, vaccine:vaccines(*)")
          .eq("child_id", child_id).execute())
    vaccinations = [ChildVaccinationRow(**v) for v in (xr.data or [])]
    return child, vaccines, vaccinations


def _stream(pdf: bytes, name: str) -> StreamingResponse:
    safe = "".join(c if c.isalnum() or c in " _-" else "_" for c in name)
    fname = f"VaccineTrack_{safe}_{date.today()}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf), media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{fname}"',
            "Content-Length": str(len(pdf)),
            "Cache-Control": "no-cache",
        },
    )


@router.get("/{child_id}", summary="Download PDF vaccination certificate")
async def download_certificate(
    child_id: str,
    include_pending: bool = Query(False),
    generated_by: str = Query(""),
):
    child, vaccines, vaccinations = _load(child_id)
    pdf = generate_certificate(child, vaccines, vaccinations,
                               include_pending, generated_by or None)
    return _stream(pdf, child.full_name)


@router.post("/generate", summary="Generate PDF with JSON options")
async def generate_certificate_post(body: CertificateRequest):
    child, vaccines, vaccinations = _load(body.child_id)
    pdf = generate_certificate(child, vaccines, vaccinations, body.include_pending)
    return _stream(pdf, child.full_name)
