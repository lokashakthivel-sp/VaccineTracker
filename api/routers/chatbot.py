"""
/chatbot — Gemini AI proxy for VaccineBot.

POST /chatbot/chat   send a message, get a reply from Gemini

The frontend sends conversation history, this router forwards it to
Gemini and returns the reply. API key stays server-side only.
"""
from __future__ import annotations
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ── System prompt ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are VaccineBot, a friendly and knowledgeable assistant for VaccineTrack —
an app that helps Indian parents track their children's vaccinations on the National Immunisation
Schedule (NIS/UIP).

Your expertise:
- India's Universal Immunisation Programme (UIP) and National Immunisation Schedule (NIS)
- All standard vaccines: BCG, OPV, DPT, Hep-B, Hib, Rotavirus, IPV, MCV, MMR, JE, Typhoid, Hep-A, Td, Vitamin A
- Vaccine schedules by age: Birth, 6 weeks, 10 weeks, 14 weeks, 9 months, 12 months, 15 months, 16-18 months, 5 years, 10 years, 16 years
- Side effects, contraindications, catch-up schedules for missed doses
- General child health and immunisation best practices
- Government immunisation centres and AEFI (Adverse Events Following Immunisation)

Rules:
- Be warm, clear and reassuring — parents may be anxious
- Always recommend consulting a doctor for medical decisions
- If asked about a missed dose, explain the catch-up schedule clearly
- Keep responses concise — use bullet points for lists
- Never diagnose illness — only provide information about vaccines
- If unsure, say so and suggest consulting a paediatrician
- Respond in the same language the parent uses (English or Hindi)"""


# ── Request / response schemas ────────────────────────────────
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]   # full conversation history from frontend


class ChatResponse(BaseModel):
    reply: str


# ── Endpoint ──────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse, summary="Send message to VaccineBot")
async def chat(req: ChatRequest):
    s = get_settings()

    if not s.gemini_configured:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Add GEMINI_API_KEY to api/.env",
        )

    if not req.messages:
        raise HTTPException(status_code=400, detail="messages list is empty")

    # Convert to Gemini format — roles must be "user" or "model"
    contents = [
        {
            "role": "model" if m.role == "assistant" else "user",
            "parts": [{"text": m.content}],
        }
        for m in req.messages
    ]

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models"
        f"/{s.gemini_model}:generateContent?key={s.gemini_api_key}"
    )

    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": 1024,
            "temperature": 0.7,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload)

        if response.status_code != 200:
            err = response.json()
            msg = err.get("error", {}).get("message", f"HTTP {response.status_code}")
            logger.error(f"Gemini API error: {msg}")
            raise HTTPException(status_code=502, detail=f"Gemini error: {msg}")

        data = response.json()
        reply = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "Sorry, I could not generate a response.")
        )
        return ChatResponse(reply=reply)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gemini API timed out. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected chatbot error")
        raise HTTPException(status_code=500, detail=str(e))