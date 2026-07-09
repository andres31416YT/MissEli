from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from app.core.config import settings
from app.routes import chat, vision, insights
import os

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

frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_path, "static")), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(frontend_path, "index.html"))

    @app.get("/index.html")
    def serve_index():
        return FileResponse(os.path.join(frontend_path, "index.html"))

    @app.get("/{full_path:path}")
    def catch_all(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("health"):
            return Response(status_code=404)
        file_path = os.path.join(frontend_path, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_path, "index.html"))
