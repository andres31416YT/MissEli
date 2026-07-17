import base64
import io
import json
import re
from datetime import datetime

from google import genai
from google.genai import types
from PIL import Image

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.vision import VisionRequest, VisionResponse, DispersionAnalysis
from app.schemas.insights import InsightsResponse, Statistic

MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = (
    "Sos Miss Eli, una asistente pedagógica especializada en educación inicial. "
    "Respondé en español, con un tono cálido, cercano y práctico para docentes. "
    "Dá recomendaciones concretas, breves y aplicables en el aula."
)


_client = None


def _get_client():
    global _client
    if _client is None:
        if not settings.API_KEY_OPEN_AI:
            raise RuntimeError(
                "Falta la API key de Gemini. Configurá la variable API_KEY_OPEN_AI."
            )
        _client = genai.Client(api_key=settings.API_KEY_OPEN_AI)
    return _client


def _clean(text: str) -> str:
    text = re.sub(r"^```(?:json|text|markdown)?\s*", "", text.strip())
    text = re.sub(r"```$", "", text.strip())
    return text.strip()


def generate_chat_response(request: ChatRequest) -> ChatResponse:
    client = _get_client()
    response = client.models.generate_content(
        model=MODEL,
        contents=request.message,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    )
    reply = _clean(response.text)

    return ChatResponse(
        response=reply,
        session_id=request.session_id or "default",
        timestamp=datetime.utcnow().isoformat(),
    )


def _parse_json_block(text: str):
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            return None
        return json.loads(text[start:end])
    except Exception:
        return None


def analyze_vision(request: VisionRequest) -> VisionResponse:
    client = _get_client()

    prompt = (
        "Sos el módulo de visión de Miss Eli para educación inicial. Analizá esta "
        "imagen de un aula. Contá cuántos niños aparecen en total y cuántos están "
        "distraídos (mirando otro lado, sin prestar atención, haciendo otra cosa). "
        "Respondé SOLO con un objeto JSON con esta forma exacta: "
        '{"total_ninos": 0, "ninos_distraidos": 0, "recomendaciones": ["...", "..."]}. '
        "Si no podés ver niños con claridad, usá 0 en ambos. "
        "En 'recomendaciones' da hasta 3 sugerencias concretas para el docente."
    )

    contents = [prompt]
    if request.image_base64:
        image_bytes = base64.b64decode(request.image_base64)
        contents.append(
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
        )

    response = client.models.generate_content(model=MODEL, contents=contents)
    text = _clean(response.text)
    data = _parse_json_block(text)

    if not data:
        total_count = 0
        distracted = 0
        recommendations = [text] if text else ["No se pudo analizar la imagen."]
    else:
        total_count = int(data.get("total_ninos", 0) or 0)
        distracted = int(data.get("ninos_distraidos", 0) or 0)
        distracted = min(max(distracted, 0), total_count)
        recommendations = data.get("recomendaciones", []) or []

    dispersion_percentage = round((distracted / total_count) * 100, 2) if total_count else 0.0
    attention_percentage = round(100 - dispersion_percentage, 2)

    if distracted == 0:
        audio_message = "El grupo está atento. Seguí con la dinámica actual."
    elif dispersion_percentage >= 50:
        audio_message = (
            f"Detecté a {distracted} de {total_count} niño(s) distraído(s). "
            "Redirigí la atención con una seña no verbal y acercate sin interrumpir la clase."
        )
    else:
        audio_message = (
            f"Detecté a {distracted} de {total_count} niño(s) distraído(s). "
            "Reforsá la atención con un estímulo breve."
        )

    return VisionResponse(
        session_id=request.session_id,
        analysis=DispersionAnalysis(
            distracted_count=distracted,
            total_count=total_count,
            dispersion_percentage=dispersion_percentage,
            recommendations=recommendations,
        ),
        audio_message=audio_message,
        timestamp=datetime.utcnow().isoformat(),
    )


def generate_insights(session_id: str, period: str = "hoy") -> InsightsResponse:
    client = _get_client()
    prompt = (
        "Sos Miss Eli, asistente pedagógica. Generá un resumen de indicadores de aula "
        f"para el periodo '{period}'. Respondé SOLO con un objeto JSON con esta forma: "
        '{"statistics":[{"metric":"Dispersión Promedio","value":12.5,"unit":"%","trend":"down"},'
        '{"metric":"Tiempo de Atención","value":38.0,"unit":"min","trend":"up"},'
        '{"metric":"Intervenciones","value":2.0,"unit":"cantidad","trend":"stable"},'
        '{"metric":"Nivel Energético","value":7.5,"unit":"escala 1-10","trend":"up"}],'
        '"patterns":["..."],"recommendations":["..."]}. '
        "Usá valores realistas basados en buenas prácticas docentes."
    )

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    )
    text = _clean(response.text)

    try:
        data = json.loads(text)
        statistics = [Statistic(**s) for s in data.get("statistics", [])]
        patterns = data.get("patterns", [])
        recommendations = data.get("recommendations", [])
    except Exception:
        statistics = []
        patterns = [text]
        recommendations = []

    return InsightsResponse(
        session_id=session_id,
        period=period,
        statistics=statistics,
        patterns=patterns,
        recommendations=recommendations,
        timestamp=datetime.utcnow().isoformat(),
    )
