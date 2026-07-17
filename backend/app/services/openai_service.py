import base64
import io
import re
from datetime import datetime
from typing import Optional

import google.generativeai as genai
from PIL import Image

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.vision import VisionRequest, VisionResponse, DispersionAnalysis
from app.schemas.insights import InsightsResponse, Statistic

SYSTEM_PROMPT = (
    "Sos Miss Eli, una asistente pedagógica especializada en educación inicial. "
    "Respondé en español, con un tono cálido, cercano y práctico para docentes. "
    "Dá recomendaciones concretas, breves y aplicables en el aula."
)


def _configure():
    if not getattr(_configure, "_initialized", False):
        genai.configure(api_key=settings.API_KEY_OPEN_AI)
        _configure._initialized = True


def _chat_model():
    _configure()
    return genai.GenerativeModel(
        "gemini-1.5-flash",
        system_instruction=SYSTEM_PROMPT,
    )


def _clean(text: str) -> str:
    text = re.sub(r"^```(?:json|text|markdown)?\s*", "", text.strip())
    text = re.sub(r"```$", "", text.strip())
    return text.strip()


def generate_chat_response(request: ChatRequest) -> ChatResponse:
    prompt = request.message
    try:
        model = _chat_model()
        result = model.generate_content(prompt)
        reply = _clean(result.text)
    except Exception as e:
        reply = (
            "Lo siento, en este momento no puedo conectarme con la asistente. "
            f"Detalle: {str(e)}"
        )

    return ChatResponse(
        response=reply,
        session_id=request.session_id or "default",
        timestamp=datetime.utcnow().isoformat(),
    )


def _parse_dispersion(text: str, total_count: int):
    distracted = 0
    recommendations = []
    audio_message = ""

    match = re.search(r"distra(?:í|i)dos?\s*[:=]?\s*(\d+)", text, re.IGNORECASE)
    if match:
        distracted = int(match.group(1))

    recs = re.findall(r"[-*]\s*(.+)", text)
    if recs:
        recommendations = [r.strip() for r in recs]
    else:
        sentences = [s.strip() for s in re.split(r"(?<=[.])\s+", text) if s.strip()]
        recommendations = sentences[:3]

    distracted = min(max(distracted, 0), total_count)
    dispersion_percentage = round((distracted / total_count) * 100, 2) if total_count else 0.0

    if distracted == 0:
        audio_message = "El grupo está atento. Seguí con la dinámica actual."
    elif dispersion_percentage > 40:
        audio_message = (
            f"Detecté a {distracted} niño(s) distraído(s). Redirigí la atención con "
            "una seña no verbal y acercate sin interrumpir la clase."
        )
    else:
        audio_message = (
            f"Detecté a {distracted} niño(s) distraído(s). Reforsá la atención con "
            "un estímulo breve."
        )

    if not recommendations:
        recommendations = [
            "Mantené el contacto visual y el tono de voz animado.",
            "Acercate suavemente sin interrumpir la actividad.",
        ]

    return distracted, dispersion_percentage, recommendations, audio_message


def analyze_vision(request: VisionRequest) -> VisionResponse:
    total_count = 1

    prompt = (
        "Sos el módulo de visión de Miss Eli. Analizá esta imagen de un aula de "
        "educación inicial. Indicá cuántos niños aparecen distraídos con el formato "
        "'Distraídos: N'. Luego da hasta 3 recomendaciones concretas para el docente, "
        "una por línea precedida por '-'."
    )

    try:
        _configure()
        model = genai.GenerativeModel("gemini-1.5-flash")

        parts = [prompt]
        if request.image_base64:
            try:
                image_bytes = base64.b64decode(request.image_base64)
                img = Image.open(io.BytesIO(image_bytes))
                parts.append(img)
                total_count = 1
            except Exception:
                parts.append(request.image_base64)

        result = model.generate_content(parts)
        text = _clean(result.text)
        distracted, dispersion_percentage, recommendations, audio_message = _parse_dispersion(text, total_count)
    except Exception as e:
        distracted = 0
        dispersion_percentage = 0.0
        recommendations = [
            "Mantené el contacto visual y el tono de voz animado.",
            "Acercate suavemente sin interrumpir la actividad.",
        ]
        audio_message = (
            "No pude analizar la imagen en este momento. "
            f"Detalle: {str(e)}"
        )

    return VisionResponse(
        session_id=request.session_id,
        analysis=DispersionAnalysis(
            distracted_count=distracted,
            total_count=total_count,
            dispersion_percentage=round(dispersion_percentage, 2),
            recommendations=recommendations,
        ),
        audio_message=audio_message,
        timestamp=datetime.utcnow().isoformat(),
    )


def generate_insights(session_id: str, period: str = "hoy") -> InsightsResponse:
    statistics = [
        Statistic(metric="Dispersión Promedio", value=12.5, unit="%", trend="down"),
        Statistic(metric="Tiempo de Atención", value=38.0, unit="min", trend="up"),
        Statistic(metric="Intervenciones", value=2.0, unit="cantidad", trend="stable"),
        Statistic(metric="Nivel Energético", value=7.5, unit="escala 1-10", trend="up"),
    ]
    patterns = [
        "Los niños mantienen mejor la atención en actividades de hasta 20 minutos.",
        "Las transiciones con canción reducen la dispersión.",
        "El refuerzo verbal inmediato mejora la continuidad de la tarea.",
    ]
    recommendations = [
        "Incorporá pausas activas cada 20 minutos.",
        "Usá transiciones con canción o consigna corta.",
        "Reforzá los comportamientos atentos en el momento.",
    ]

    return InsightsResponse(
        session_id=session_id,
        period=period,
        statistics=statistics,
        patterns=patterns,
        recommendations=recommendations,
        timestamp=datetime.utcnow().isoformat(),
    )
