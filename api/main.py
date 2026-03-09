"""
VaccineTrack API — FastAPI microservice.

Endpoints:
  GET  /health                              health check
  GET  /certificates/{child_id}            PDF certificate download
  POST /certificates/generate              PDF with JSON body
  POST /reminders/trigger                  Resend email reminders
  POST /reminders/trigger-dry-run          dry-run emails
  GET  /reminders/preview/{parent_id}      HTML email preview
  POST /whatsapp/trigger                   Twilio WhatsApp reminders
  POST /whatsapp/trigger-dry-run           dry-run WhatsApp
  GET  /whatsapp/preview/{parent_id}       WhatsApp message preview
  POST /whatsapp/phone                     save parent phone number
  GET  /whatsapp/setup-info              

Docs: http://localhost:8000/docs
"""
from __future__ import annotations
import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import certificates, reminders, whatsapp, chatbot
from services.supabase_client import check_connection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

settings = get_settings()

app = FastAPI(
    title="VaccineTrack API",
    description=(
        "Python microservice for VaccineTrack. "
        "Handles PDF certificate generation (ReportLab), "
        "email reminders (Resend), and WhatsApp reminders (Twilio)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(certificates.router)
app.include_router(reminders.router)
app.include_router(whatsapp.router)
app.include_router(chatbot.router)

@app.get("/health", tags=["System"], summary="API health check")
async def health():
    supabase_ok = await check_connection()
    return {
        "status": "healthy" if supabase_ok else "degraded",
        "version": "1.0.0",
        "supabase_connected": supabase_ok,
        "resend_configured": settings.resend_configured,
        "green_api_configured": settings.green_api_configured,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "VaccineTrack API — see /docs for all endpoints"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.api_host, port=settings.api_port, reload=True)
