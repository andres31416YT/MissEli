from pydantic import BaseModel
from typing import List, Optional


class DispersionAnalysis(BaseModel):
    distracted_count: int
    total_count: int
    dispersion_percentage: float
    recommendations: List[str]


class VisionRequest(BaseModel):
    session_id: str
    image_base64: Optional[str] = None
    timestamp: Optional[str] = None


class VisionResponse(BaseModel):
    session_id: str
    analysis: DispersionAnalysis
    audio_message: Optional[str] = None
    timestamp: str
