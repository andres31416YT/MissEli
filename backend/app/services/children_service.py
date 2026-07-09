import uuid
from collections import Counter
from datetime import datetime

from app.schemas.children import (
    Child,
    ChildCreate,
    Note,
    NoteCreate,
    BehaviorAnalysis,
    BehaviorDimension,
)

_CHILDREN: dict[str, Child] = {}


def _now() -> str:
    return datetime.utcnow().isoformat()


def create_child(payload: ChildCreate) -> Child:
    child = Child(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        age=payload.age,
        notes=[],
        created_at=_now(),
    )
    _CHILDREN[child.id] = child
    return child


def list_children() -> list[Child]:
    return sorted(_CHILDREN.values(), key=lambda c: c.created_at)


def get_child(child_id: str) -> Child | None:
    return _CHILDREN.get(child_id)


def add_note(child_id: str, payload: NoteCreate) -> Note | None:
    child = _CHILDREN.get(child_id)
    if not child:
        return None
    note = Note(
        id=str(uuid.uuid4()),
        content=payload.content.strip(),
        author=payload.author,
        timestamp=_now(),
    )
    child.notes.append(note)
    return note


_DIMENSIONS = {
    "Atención": {
        "positivo": ["atento", "concentra", "atencion", "enfocado", "escucha", "presta atencion", "atenta", "enfocada"],
        "negativo": ["distra", "despistado", "ausente", "no presta", "olvida", "desconcentra"],
    },
    "Participación": {
        "positivo": ["participa", "colabora", "ayuda", "comparte", "lider", "aporta", "activo en", "se ofrece"],
        "negativo": ["no participa", "retraido", "retraída", "callado", "callada", "aisla", "evita"],
    },
    "Comportamiento": {
        "positivo": ["tranquilo", "tranquila", "respeta", "amable", "obediente", "orden", "colaborador", "empatico", "empática", "solidario"],
        "negativo": ["inquieto", "inquieta", "agresivo", "agresiva", "desorden", "pelea", "grita", "interrumpe", "irritable"],
    },
    "Energía": {
        "positivo": ["energetico", "energética", "movimiento", "dinamico", "dinámica", "entusiasta", "jugueton", "juguetona"],
        "negativo": ["cansado", "apatico", "apática", "somnoliento", "desmotivado", "bajo de energia"],
    },
}


def _level(score: float) -> str:
    if score >= 75:
        return "Alto"
    if score >= 50:
        return "Medio"
    if score >= 30:
        return "Bajo"
    return "Muy bajo"


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, round(value, 1)))


def analyze_behavior(child_id: str) -> BehaviorAnalysis | None:
    child = _CHILDREN.get(child_id)
    if not child:
        return None

    notes_text = " ".join(n.content.lower() for n in child.notes)
    note_count = len(child.notes)

    if note_count == 0:
        return BehaviorAnalysis(
            child_id=child.id,
            child_name=child.name,
            notes_count=0,
            dimensions=[
                BehaviorDimension(dimension=d, score=0.0, level="Sin datos", evidence="Aún no hay notas registradas.")
                for d in _DIMENSIONS
            ],
            summary=f"Aún no se han registrado notas para {child.name}. Agregá observaciones para generar su perfil de conducta.",
            strengths=[],
            recommendations=["Registrá la primera observación del día para iniciar el seguimiento."],
            timestamp=_now(),
        )

    dimensions: list[BehaviorDimension] = []
    strengths: list[str] = []
    alerts: list[str] = []

    for dim, terms in _DIMENSIONS.items():
        hits_pos = sum(notes_text.count(t) for t in terms["positivo"])
        hits_neg = sum(notes_text.count(t) for t in terms["negativo"])
        total = hits_pos + hits_neg
        if total == 0:
            score = 55.0
            evidence = f"Sin menciones directas de {dim.lower()}; se asume un nivel base a partir del ritmo general."
        else:
            raw = 50 + ((hits_pos - hits_neg) / total) * 45
            score = _clamp(raw)
            if hits_pos and not hits_neg:
                evidence = f"Se destacó por aspectos positivos de {dim.lower()} ({hits_pos} observación/es)."
            elif hits_neg and not hits_pos:
                evidence = f"Se registraron señales de atención en {dim.lower()} ({hits_neg} observación/es)."
            else:
                evidence = f"Mezcla de señales en {dim.lower()}: {hits_pos} positiva(s) y {hits_neg} a trabajar."
        dimensions.append(BehaviorDimension(dimension=dim, score=score, level=_level(score), evidence=evidence))

        if score >= 70:
            strengths.append(f"{dim} {_level(score).lower()}: {evidence}")
        elif score < 40:
            alerts.append(f"{dim} en nivel {_level(score).lower()}: conviene reforzar este aspecto.")

    avg = _clamp(sum(d.score for d in dimensions) / len(dimensions))

    top = max(dimensions, key=lambda d: d.score)
    weak = min(dimensions, key=lambda d: d.score)

    summary = (
        f"{child.name} presenta un perfil de conducta general {_level(avg).lower()} "
        f"(índice {avg}/100) a partir de {note_count} nota(s) registrada(s). "
        f"Su punto más fuerte es {top.dimension.lower()} ({top.score}/100), "
        f"mientras que {weak.dimension.lower()} ({weak.score}/100) es el área con mayor margen de crecimiento."
    )

    recommendations = _build_recommendations(child.name, dimensions, alerts)

    return BehaviorAnalysis(
        child_id=child.id,
        child_name=child.name,
        notes_count=note_count,
        dimensions=dimensions,
        summary=summary,
        strengths=strengths or ["El registro muestra una base de conducta estable para seguir observando."],
        recommendations=recommendations,
        timestamp=_now(),
    )


def _build_recommendations(name: str, dimensions: list[BehaviorDimension], alerts: list[str]) -> list[str]:
    recs: list[str] = []
    if alerts:
        recs.extend(alerts)
    by_dim = {d.dimension: d for d in dimensions}
    if by_dim["Atención"].score < 50:
        recs.append(f"Proponé bloques cortos de actividad (15-20 min) para sostener la atención de {name}.")
    if by_dim["Participación"].score < 50:
        recs.append(f"Asignale a {name} un rol concreto (pasapáginas, guía) para incentivar su participación.")
    if by_dim["Comportamiento"].score < 50:
        recs.append(f"Reforzá con reconocimiento inmediato los momentos de calma y orden de {name}.")
    if by_dim["Energía"].score >= 70:
        recs.append(f"Incluí pausas activas para canalizar la energía de {name} de forma positiva.")
    if by_dim["Energía"].score < 40:
        recs.append(f"Variá la dinámica con actividades motivadoras para elevar la energía de {name}.")
    if not recs:
        recs.append(f"Seguí registrando notas de {name} para afinar su perfil y detectar patrones a tiempo.")
    return recs