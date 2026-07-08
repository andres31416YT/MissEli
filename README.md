# Miss Eli - Asistente Pedagógica Inteligente

**Miss Eli** es un asistente pedagógico inteligente en tiempo real diseñado para potenciar la labor del docente en educación inicial. A través de un sistema de visión artificial, la plataforma monitorea discretamente el nivel de atención y el estado energético del grupo, actuando como un co-docente de apoyo.

## Características

- **Eli-Chat**: Chat pedagógico en tiempo real con recomendaciones basadas en IA
- **Eli-Vision**: Análisis de dispersión del aula mediante visión computacional
- **Eli-Insights**: Panel de estadísticas y patrones conductuales para mejora continua

## Tecnologías

- **Backend**: FastAPI + Python
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla
- **IA**: OpenAI GPT-4o
- **Deploy**: Render

## Deploy en Render

1. Hacé fork de este repositorio
2. Creá un nuevo **Web Service** en [Render](https://render.com)
3. Conectá tu repositorio de GitHub
4. Configurá las variables de entorno:
   - `OPENAI_API_KEY`: Tu clave de OpenAI
5. Render detectará automáticamente el `Dockerfile` y desplegará la aplicación

La aplicación estará disponible en: `https://misseli-backend.onrender.com`

## Desarrollo Local

```bash
# Clonar el repositorio
git clone <tu-repo>
cd MissEli

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu OPENAI_API_KEY

# Levantar servicios
docker compose up -d

# Acceder a la aplicación
# Frontend: http://localhost:8080
# Backend API: http://localhost:8000
# Documentación API: http://localhost:8000/docs
```

## Estructura del Proyecto

```
MissEli/
├── backend/
│   ├── app/
│   │   ├── core/          # Configuración
│   │   ├── routes/        # Endpoints API
│   │   ├── schemas/       # Modelos Pydantic
│   │   └── services/      # Lógica de negocio
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── static/
│   │   ├── styles.css
│   │   └── app.js
│   ├── index.html
│   └── Dockerfile
├── docker-compose.yml
└── render.yaml
```

## Módulos Principales

### I. Eli-Chat (Solo Chat)
Espacio de interacción directa donde la maestra esscribe sus dudas o solicita soporte pedagógico inmediato.

### II. Eli-Vision (Solo Video)
El sistema captura snapshots del aula para ser procesados por el agente de visión, generando recomendaciones proactivas.

### III. Eli-Insights (Solo Estadísticas)
Panel de control para la mejora continua con mediciones y generación de recomendaciones basadas en datos históricos.
