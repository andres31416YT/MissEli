# DOCUMENTACIÓN TÉCNICA: Miss Eli - Asistente Pedagógica Inteligente

## 1. Concepto y Objetivo
**Miss Eli** es una asistente pedagógica diseñada para reducir el estrés docente y maximizar la atención estudiantil. Utiliza visión computacional y procesamiento de lenguaje natural para asistir al profesor en tiempo real.

* **Objetivo:** Disminuir el nivel de distracción estudiantil y mitigar el agotamiento emocional del profesorado mediante tecnología proactiva.

## 2. Arquitectura de Despliegue
El sistema se despliega en **Render** como un único servicio web que sirve tanto el backend API como el frontend estático.

* **Backend + Frontend:** Servicio web en Render utilizando Docker
* **API:** FastAPI sirve endpoints REST bajo `/api/v1/*`
* **Frontend:** Archivos estáticos servidos por FastAPI en la ruta raíz `/`
* **Procesamiento de IA:** OpenAI GPT-4o (vía API)
* **Visión:** Captura de snapshots vía cámara web (procesamiento visual)

## 3. Módulos Principales de Miss Eli

### I. Eli-Chat (Solo Chat)
Espacio de interacción directa donde la maestra escribe sus dudas o solicita soporte pedagógico inmediato.
* **Funcionalidad:** Recepción de recomendaciones de IA en tiempo real basadas en la consulta del docente.

### II. Eli-Vision (Solo Video)
El sistema captura *snapshots* del aula para ser procesados por el agente de visión.
* **Funcionalidad:** Análisis de dispersión mediante visión computacional, recomendaciones proactivas y salida de audio (voz del agente) para redireccionar la atención o sugerir dinámicas.

### III. Eli-Insights (Solo Estadísticas)
Panel de control para la mejora continua.
* **Funcionalidad:** Medición del promedio de estudiantes distraídos, identificación de patrones conductuales y generación de recomendaciones basadas en datos históricos.

## 4. Stack Tecnológico
* **Lenguaje:** **Python** (Versatilidad, rapidez y ecosistema robusto de IA).
* **Framework Backend:** **FastAPI** (Rendimiento asíncrono, alta velocidad y validación automática).
* **Procesamiento de IA:** **Google Gemini** (vía API).
* **Visión:** Captura de *snapshots* vía cámara web (procesamiento visual).
* **Frontend:** HTML5, CSS3, JavaScript vanilla (mobile-first).
* **Contenedores:** **Docker** (Aislamiento de servicios y portabilidad).
* **Deploy:** **Render** (PaaS para despliegue automático).

## 5. Diseño y Seguridad
* **Gestión de Sesiones:** Manejo de sesiones robustas en backend mediante tokens cifrados para proteger la información del aula.
* **Seguridad en Render:** Variables de entorno protegidas para `OPENAI_API_KEY`.
* **Privacidad:** Procesamiento en la nube con metadatos anonimizados, evitando el almacenamiento de rostros o datos sensibles.
* **CORS:** Configuración de CORS en FastAPI para permitir acceso desde el frontend.

## 6. Flujo de Comunicación
1. **Frontend:** El usuario envía comandos o imágenes desde el navegador.
2. **Backend (Render):** FastAPI procesa la lógica, gestiona la sesión y consulta a la API de Gemini.
3. **Respuesta:** La IA retorna la acción (texto, metadatos o comando de audio), la cual es ejecutada por el agente.

## 7. Variables de Entorno
| Variable | Descripción |
|----------|-------------|
| `API_KEY_OPEN_AI` | Clave de API de Google Gemini (la variable conserva este nombre por compatibilidad) |

## 8. Despliegue en Render

### Pasos:
1. Crear cuenta en [Render](https://render.com)
2. Crear nuevo **Web Service**
3. Conectar repositorio de GitHub/GitLab
4. Configurar:
   - **Runtime:** Docker
   - **Dockerfile Path:** `./backend/Dockerfile`
   - **Plan:** Free (o superior según necesidades)
  5. Agregar variable de entorno `API_KEY_OPEN_AI` con la clave de Google Gemini
6. Deploy automático en cada push a main

### URL de acceso:
Una vez desplegado, la aplicación estará disponible en:
```
https://misseli.onrender.com
```
