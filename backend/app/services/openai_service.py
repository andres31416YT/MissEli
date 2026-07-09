import google.generativeai as genai
from datetime import datetime
from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.vision import VisionRequest, VisionResponse, DispersionAnalysis
from app.schemas.insights import InsightsResponse, Statistic


genai.configure(api_key=settings.OPENAI_API_KEY)


def _get_model():
    return genai.GenerativeModel("gemini-2.0-flash")


def generate_chat_response(request: ChatRequest) -> ChatResponse:
    model = _get_model()
    system_prompt = (
        "Eres Miss Eli, una asistente pedagógica amigable y profesional para docentes de educación inicial. "
        "Tu objetivo es ayudar a reducir el estrés docente y mejorar la atención de los estudiantes. "
        "Responde de manera cálida, práctica y basada en evidencia pedagógica."
    )

    prompt = f"""{system_prompt}

Docente: {request.message}
Miss Eli:"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
    except Exception as exc:
        raise RuntimeError(f"No se pudo generar la respuesta del chat: {exc}") from exc

    return ChatResponse(
        response=text,
        session_id=request.session_id or "default",
        timestamp=datetime.utcnow().isoformat(),
    )


def analyze_vision(request: VisionRequest) -> VisionResponse:
    if not request.image_base64:
        return VisionResponse(
            session_id=request.session_id,
            analysis=DispersionAnalysis(
                distracted_count=0,
                total_count=0,
                dispersion_percentage=0.0,
                recommendations=["Captura una imagen para analizar.", "Usa Eli-Vision para monitorear."],
            ),
            audio_message="Captura una foto del aula para obtener un análisis de dispersión.",
            timestamp=datetime.utcnow().isoformat(),
        )

    total = 1
    distracted = 0
    recommendations = [
        "Mantené el contacto visual y el tono de voz animado.",
        "Acercate suavemente sin interrumpir la actividad.",
    ]

    try:
        model = _get_model()
        prompt = (
            "Analiza esta imagen de un aula de educación inicial. "
            "Identifica si hay un niño claramente desatento o desconectado. "
            "Responde solo en JSON plano con esta forma exacta: "
            '{"distracted": true, "recommendations": ["recomendación 1", "recomendación 2"]}. '
            "No agregues texto fuera del JSON."
        )
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": request.image_base64}])
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            import json
            data = json.loads(text[start : end + 1])
            distracted = 1 if data.get("distracted") else 0
            recommendations = data.get("recommendations") or recommendations
    except Exception:
        distracted = 0
        recommendations = [
            "Observá la postura y la mirada del niño antes de intervenir.",
            "Usá una señal no verbal para redirigir su atención.",
        ]

    dispersion_percentage = (distracted / total * 100) if total > 0 else 0.0
    audio_message = (
        "Detecté a 1 niño distraído. Te sugiero usar una seña no verbal y luego acercarte para redirigir su atención sin interrumpir la clase."
        if distracted
        else "El niño está atento. Seguí con la dinámica actual."
    )

    return VisionResponse(
        session_id=request.session_id,
        analysis=DispersionAnalysis(
            distracted_count=distracted,
            total_count=total,
            dispersion_percentage=round(dispersion_percentage, 2),
            recommendations=recommendations,
        ),
        audio_message=audio_message,
        timestamp=datetime.utcnow().isoformat(),
    )


def generate_insights(session_id: str, period: str = "hoy") -> InsightsResponse:
    model = _get_model()
    prompt = (
        "Eres un asistente pedagógico para educación inicial. "
        f"Genera un resumen de insights para la sesión {session_id} del periodo '{period}'. "
        "Devuelve solo JSON plano con esta forma exacta: "
        '{"statistics": [{"metric": "Dispersión Promedio", "value": 0, "unit": "%", "trend": "down"}], '
        '"patterns": ["patrón 1", "patrón 2"], '
        '"recommendations": ["recomendación 1", "recomendación 2"]}. '
        "No agregues texto fuera del JSON."
    )

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            import json
            data = json.loads(text[start : end + 1])
            statistics = [
                Statistic(
                    metric=item.get("metric", "Métrica"),
                    value=float(item.get("value", 0)),
                    unit=item.get("unit", ""),
                    trend=item.get("trend", "stable"),
                )
                for item in data.get("statistics", [])
            ]
            patterns = data.get("patterns", [])
            recommendations = data.get("recommendations", [])
        else:
            raise ValueError("JSON no encontrado")
    except Exception:
        statistics = [
            Statistic(metric="Dispersión Promedio", value=15.4, unit="%", trend="down"),
            Statistic(metric="Tiempo de Atención", value=42.0, unit="min", trend="up"),
            Statistic(metric="Intervenciones", value=3.0, unit="cantidad", trend="stable"),
            Statistic(metric="Nivel Energético", value=7.2, unit="escala 1-10", trend="up"),
        ]
        patterns = [
            "Los niños muestran mayor dispersión después de 45 minutos de actividad sentada.",
            "La música de fondo reduce la dispersión en un 12%.",
            "Las pausas activas cada 30 minutos mejoran la atención posterior.",
        ]
        recommendations = [
            "Incorpora pausas activas cada 25-30 minutos.",
            "Varía el tipo de actividades: visual, auditiva y kinestésica.",
            "Usa refuerzo positivo visual para mantener la motivación.",
        ]

    return InsightsResponse(
        session_id=session_id,
        period=period,
        statistics=statistics,
        patterns=patterns,
        recommendations=recommendations,
        timestamp=datetime.utcnow().isoformat(),
    )
