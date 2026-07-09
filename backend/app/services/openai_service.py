from datetime import datetime
from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.vision import VisionRequest, VisionResponse, DispersionAnalysis
from app.schemas.insights import InsightsResponse, Statistic


CHAT_RESPONSES = {
    "dispersión": "Para reducir la dispersión en el aula, podés probar estas estrategias: 1) Usá transiciones claras entre actividades. 2) Incorporá movimiento cada 20-25 minutos. 3) Mantené el contacto visual y variá el tono de voz. 4) Usá materiales concretos y manipulables.",
    "actividad": "Acá tenés una actividad para niños inquietos: 'El detective de sonidos'. Pedí a los niños que caminen por el aula y, cuando digas un sonido, deben congelarse y señalar de dónde viene. Trabaja atención, escucha y control motor.",
    "música": "Te recomiendo música instrumental suave, canciones infantiles acústicas o sonidos de la naturaleza. Evitá letras en este momento. Podés usar playlists de 'Música para aprender' o 'Sonidos de aula tranquila'.",
    "transición": "Para una transición suave: 1) Avisá con anticipación: 'En 2 minutos cambiamos de actividad'. 2) Usá una canción o señal ritual. 3) Pedí una acción específica: 'Vamos a guardar los lápices en la caja azul'. 4) Reconocé el esfuerzo: 'Muy bien rápido y silencioso'.",
    "alumno": "Si un alumno se distrae con facilidad: 1) Acercate sin interrumpir la clase. 2) Usá contacto visual y señas no verbales. 3) Sentalo cerca de vos y lejos de ventanas o compañeros distractores. 4) Dividí las consignas en pasos cortos. 5) Refuerza cada pequeño logro.",
    "lectura": "Para organizar una ronda de lectura: 1) Formá grupos de 3 a 5 niños según el nivel. 2) Elegí un texto corto con imágenes. 3) Asigná roles: lector, pasapáginas, comentarista. 4) Hacé una pregunta antes de leer para dar un propósito. 5) Finalizá con una pregunta de reflexión simple.",
    "default": "Miss Eli está lista para ayudarte. Probá consultarme sobre dispersión, actividades, música, transiciones, alumnos inquietos o lectura.",
}


def _match_response(message: str) -> str:
    text = message.lower()
    for keyword, response in CHAT_RESPONSES.items():
        if keyword in text:
            return response
    return CHAT_RESPONSES["default"]


def generate_chat_response(request: ChatRequest) -> ChatResponse:
    return ChatResponse(
        response=_match_response(request.message),
        session_id=request.session_id or "default",
        timestamp=datetime.utcnow().isoformat(),
    )


def analyze_vision(request: VisionRequest) -> VisionResponse:
    distracted = 0
    recommendations = [
        "Mantené el contacto visual y el tono de voz animado.",
        "Acercate suavemente sin interrumpir la actividad.",
    ]
    audio_message = "El niño está atento. Seguí con la dinámica actual."

    if request.image_base64:
        distracted = 1
        recommendations = [
            "Usá una seña no verbal para redirigir su atención.",
            "Acercate suavemente sin interrumpir la actividad grupal.",
            "Reforzá cualquier intento de volver a la tarea.",
        ]
        audio_message = "Detecté a 1 niño distraído. Usá una seña no verbal y luego acercate para redirigir su atención sin interrumpir la clase."

    dispersion_percentage = (distracted / 1) * 100

    return VisionResponse(
        session_id=request.session_id,
        analysis=DispersionAnalysis(
            distracted_count=distracted,
            total_count=1,
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
