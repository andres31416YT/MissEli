from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.openai_service import generate_chat_response

router = APIRouter()


@router.post("/message", response_model=ChatResponse)
def chat_message(request: ChatRequest):
    try:
        return generate_chat_response(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Eli-Chat: {str(e)}")


@router.get("/suggestions")
def chat_suggestions():
    return {
        "suggestions": [
            "¿Cómo reduzco la dispersión en el aula?",
            "Dame una actividad para niños inquietos.",
            "¿Qué música de fondo recomiendas?",
            "Ayúdame con una transición suave.",
            "Mi alumno se distrae con facilidad, ¿qué hago?",
            "¿Cómo organizo una ronda de lectura?",
        ]
    }

