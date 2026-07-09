from pydantic import BaseModel
from typing import List, Optional


class ChildCreate(BaseModel):
    name: str
    age: Optional[int] = None


class NoteCreate(BaseModel):
    content: str
    author: Optional[str] = None


class Note(BaseModel):
    id: str
    content: str
    author: Optional[str] = None
    timestamp: str


class Child(BaseModel):
    id: str
    name: str
    age: Optional[int] = None
    notes: List[Note] = []
    created_at: str


class BehaviorDimension(BaseModel):
    dimension: str
    score: float
    level: str
    evidence: str


class BehaviorAnalysis(BaseModel):
    child_id: str
    child_name: str
    notes_count: int
    dimensions: List[BehaviorDimension]
    summary: str
    strengths: List[str]
    recommendations: List[str]
    timestamp: str