from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routes import chat, vision, insights

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Asistente pedagógica inteligente para educación inicial",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


app.include_router(chat.router, prefix=f"{settings.API_PREFIX}/chat", tags=["Eli-Chat"])
app.include_router(vision.router, prefix=f"{settings.API_PREFIX}/vision", tags=["Eli-Vision"])
app.include_router(insights.router, prefix=f"{settings.API_PREFIX}/insights", tags=["Eli-Insights"])
