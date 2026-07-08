from fastapi import APIRouter, HTTPException
from app.schemas.vision import VisionRequest, VisionResponse
from app.services.openai_service import analyze_vision

router = APIRouter()


@router.post("/analyze", response_model=VisionResponse)
def vision_analyze(request: VisionRequest):
    try:
        return analyze_vision(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Eli-Vision: {str(e)}")


@router.get("/status")
def vision_status():
    return {
        "status": "active",
        "mode": "snapshot",
        "camera_required": True,
        "description": "Eli-Vision lista para capturar y analizar el aula.",
    }
