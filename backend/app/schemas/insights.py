from pydantic import BaseModel
from typing import List, Optional


class Statistic(BaseModel):
    metric: str
    value: float
    unit: str
    trend: str


class InsightsResponse(BaseModel):
    session_id: str
    period: str
    statistics: List[Statistic]
    patterns: List[str]
    recommendations: List[str]
    timestamp: str
