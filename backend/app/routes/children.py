from fastapi import APIRouter, HTTPException

from app.schemas.children import ChildCreate, NoteCreate
from app.services import children_service

router = APIRouter()


@router.post("", status_code=201)
def create_child(payload: ChildCreate):
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="El nombre del niño es obligatorio.")
    return children_service.create_child(payload)


@router.get("")
def list_children():
    return children_service.list_children()


@router.get("/{child_id}")
def get_child(child_id: str):
    child = children_service.get_child(child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")
    return child


@router.post("/{child_id}/notes", status_code=201)
def add_note(child_id: str, payload: NoteCreate):
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="El contenido de la nota es obligatorio.")
    note = children_service.add_note(child_id, payload)
    if not note:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")
    return note


@router.get("/{child_id}/analysis")
def child_analysis(child_id: str):
    analysis = children_service.analyze_behavior(child_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")
    return analysis