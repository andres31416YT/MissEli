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

MODEL = "gemini-flash-latest"

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

    return distracted, dispersion_percentage, recommendations, audio_message


def analyze_vision(request: VisionRequest) -> VisionResponse:
    client = _get_client()
    total_count = 1

    prompt = (
        "Sos el módulo de visión de Miss Eli. Analizá esta imagen de un aula de "
        "educación inicial. Indicá cuántos niños aparecen distraídos con el formato "
        "'Distraídos: N'. Luego da hasta 3 recomendaciones concretas para el docente, "
        "una por línea precedida por '-'."
    )

    contents = [prompt]
    if request.image_base64:
        image_bytes = base64.b64decode(request.image_base64)
        contents.append(
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
        )

    response = client.models.generate_content(model=MODEL, contents=contents)
    text = _clean(response.text)
    distracted, dispersion_percentage, recommendations, audio_message = _parse_dispersion(text, total_count)

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
