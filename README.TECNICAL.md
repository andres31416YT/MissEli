# DOCUMENTACIÓN TÉCNICA: Miss Eli - Asistente Pedagógica Inteligente

## 1. Concepto y Objetivo
**Miss Eli** es una asistente pedagógica diseñada para reducir el estrés docente y maximizar la atención estudiantil. Utiliza visión computacional y procesamiento de lenguaje natural para asistir al profesor en tiempo real.

* **Objetivo:** Disminuir el nivel de distracción estudiantil y mitigar el agotamiento emocional del profesorado mediante tecnología proactiva.

## 2. Arquitectura de Despliegue y Conectividad
El sistema se basa en una arquitectura de contenedores para garantizar portabilidad y seguridad.

* **Backend:** Ejecución local en la PC del docente mediante **Docker**.
* **Frontend:** Servido en un contenedor independiente, publicado mediante un túnel seguro de **Ngrok** (configurado con `authtoken`) para acceso remoto desde dispositivos móviles (tablets/smartphones).
* **Responsividad:** Interfaz diseñada bajo el enfoque *mobile-first*, asegurando una UX fluida desde cualquier dispositivo dentro del aula.

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
* **Procesamiento de IA:** **OpenAI GPT-4o** (vía API).
* **Visión:** Captura de *snapshots* vía cámara web (procesamiento visual).
* **Red:** Túnel seguro vía **Ngrok**.
* **Contenedores:** **Docker** (Aislamiento de servicios y portabilidad).

## 5. Diseño y Seguridad
* **Gestión de Sesiones:** Manejo de sesiones robustas en backend mediante tokens cifrados para proteger la información del aula.
* **Seguridad en Docker:** Inyección de credenciales (`API_KEYS`, `NGROK_AUTHTOKEN`) mediante variables de entorno protegidas.
* **Seguridad de Red:** Acceso restringido exclusivamente a través del túnel de Ngrok, permitiendo el cierre inmediato de la sesión al finalizar la jornada.
* **Privacidad:** Procesamiento local en contenedor y envío de metadatos anonimizados a la nube, evitando el almacenamiento de rostros o datos sensibles.

## 6. Flujo de Comunicación
1. **Frontend:** El dispositivo del docente envía comandos o imágenes.
2. **Ngrok:** Túnel seguro que recibe los datos desde la red local/externa.
3. **Backend (Docker):** FastAPI procesa la lógica, gestiona la sesión y consulta a la API de OpenAI.
4. **Respuesta:** La IA retorna la acción (texto, metadatos o comando de audio), la cual es ejecutada por el agente.