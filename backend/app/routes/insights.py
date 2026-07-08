from fastapi import APIRouter, HTTPException
from app.schemas.insights import InsightsResponse
from app.services.openai_service import generate_insights

router = APIRouter()


@router.get("/summary", response_model=InsightsResponse)
def insights_summary(session_id: str = "default", period: str = "hoy"):
    try:
        return generate_insights(session_id, period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Eli-Insights: {str(e)}")


@router.get("/patterns")
def insights_patterns():
    return {
        "patterns": [
            "Dispersión alta después de 45 min de actividad.",
            "Música de fondo reduce dispersión 12%.",
            "Pausas activas mejoran atención.",
        ],
        "recommendations": [
            "Pausas cada 25-30 min.",
            "Variar tipo de actividades.",
            "Refuerzo positivo visual.",
        ],
    }
