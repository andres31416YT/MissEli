const API_BASE = window.location.origin;

const state = {
    currentTab: 'chat',
    sessionId: 'session-' + Date.now(),
    messages: [],
    suggestionsCollapsed: false,
    selectedChild: null,
};

function init() {
    setupTabs();
    setupChat();
    setupVision();
    setupChildren();
    loadInsights();
    loadSuggestions();
    setupSuggestionsToggle();
}

function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add('active');
            state.currentTab = tab.dataset.tab;
            if (state.currentTab === 'insights') loadInsights();
            if (state.currentTab === 'children') loadChildren();
        });
    });
}

async function api(endpoint, options = {}) {
    const url = `${API_BASE}/api/v1${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    };
    const response = await fetch(url, config);
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(error.detail || `Error ${response.status}`);
    }
    return response.json();
}

function setupChat() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message) return;

        addMessage('user', message);
        input.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        collapseSuggestions();

        const loadingId = addLoadingMessage();
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const data = await api('/chat/message', {
                method: 'POST',
                body: JSON.stringify({ message, session_id: state.sessionId }),
            });
            await delay(600);
            removeLoadingMessage(loadingId);
            addMessage('assistant', data.response);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            removeLoadingMessage(loadingId);
            addMessage('assistant', `Error: ${error.message}`);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });
}

function addMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🌟';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `<p>${escapeHtml(text)}</p>`;
    
    div.appendChild(avatar);
    div.appendChild(content);
    container.appendChild(div);
    return div;
}

function addLoadingMessage() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message assistant loading-message';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🌟';
    
    const content = document.createElement('div');
    content.className = 'message-content loading-content';
    content.innerHTML = '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';
    
    div.appendChild(avatar);
    div.appendChild(content);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
}

function removeLoadingMessage(div) {
    if (div && div.parentNode) {
        div.parentNode.removeChild(div);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const PRESET_SUGGESTIONS = [
    "¿Cómo reduzco la dispersión en el aula?",
    "Dame una actividad para niños inquietos.",
    "¿Qué música de fondo recomiendas?",
    "Ayúdame con una transición suave.",
    "Mi alumno se distrae con facilidad, ¿qué hago?",
    "¿Cómo organizo una ronda de lectura?",
];

async function loadSuggestions() {
    const list = document.getElementById('suggestions-list');
    const toggle = document.getElementById('suggestions-toggle');
    if (!list) return;
    list.innerHTML = '';
    PRESET_SUGGESTIONS.forEach(suggestion => {
        const chip = document.createElement('div');
        chip.className = 'suggestion-chip';
        chip.textContent = suggestion;
        chip.addEventListener('click', () => {
            const input = document.getElementById('chat-input');
            if (input) {
                input.value = suggestion;
                input.focus();
            }
            collapseSuggestions();
        });
        list.appendChild(chip);
    });
    if (toggle) {
        toggle.textContent = state.suggestionsCollapsed ? 'Mostrar' : 'Ocultar';
        toggle.setAttribute('aria-expanded', String(!state.suggestionsCollapsed));
        list.style.display = state.suggestionsCollapsed ? 'none' : 'flex';
    }
}

function collapseSuggestions() {
    state.suggestionsCollapsed = true;
    const list = document.getElementById('suggestions-list');
    const toggle = document.getElementById('suggestions-toggle');
    if (list) list.style.display = 'none';
    if (toggle) {
        toggle.textContent = 'Mostrar';
        toggle.setAttribute('aria-expanded', 'false');
    }
}

function setupSuggestionsToggle() {
    const toggle = document.getElementById('suggestions-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
        state.suggestionsCollapsed = !state.suggestionsCollapsed;
        const list = document.getElementById('suggestions-list');
        if (list) list.style.display = state.suggestionsCollapsed ? 'none' : 'flex';
        toggle.textContent = state.suggestionsCollapsed ? 'Mostrar' : 'Ocultar';
        toggle.setAttribute('aria-expanded', String(!state.suggestionsCollapsed));
    });
}

function setupVision() {
    const captureBtn = document.getElementById('camera-trigger');
    const cameraInput = document.getElementById('camera-input');

    if (captureBtn && cameraInput) {
        captureBtn.addEventListener('click', () => cameraInput.click());

        cameraInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target.result.split(',')[1];
                const placeholder = document.querySelector('.camera-placeholder');
                if (placeholder) placeholder.style.opacity = '0.5';

                const result = document.getElementById('vision-result');
                if (result) {
                    result.style.display = 'block';
                    document.getElementById('vision-metrics').innerHTML = `
                        <div class="metric-card analyzing-state" style="grid-column: 1 / -1;">
                            <div class="analyzing-spinner"></div>
                            <span>Analizando imagen...</span>
                        </div>
                    `;
                    document.getElementById('result-badge').textContent = 'En proceso';
                    document.getElementById('result-badge').style.background = '#dbeafe';
                    document.getElementById('result-badge').style.color = '#1e40af';
                    document.getElementById('vision-audio').textContent = '';
                }

                try {
                    const data = await api('/vision/analyze', {
                        method: 'POST',
                        body: JSON.stringify({
                            session_id: state.sessionId,
                            image_base64: base64,
                        }),
                    });
                    await delay(800);
                    showVisionResult(data);
                    loadInsights();
                } catch (error) {
                    console.error('Error en Eli-Vision:', error);
                    if (result) {
                        result.style.display = 'block';
                        document.getElementById('vision-metrics').innerHTML = `
                            <div class="metric-card" style="grid-column: 1 / -1;">
                                <div class="metric-value" style="color: var(--danger);">Error</div>
                                <div class="metric-label">${error.message || 'No se pudo analizar la imagen'}</div>
                            </div>
                        `;
                        document.getElementById('result-badge').textContent = 'Error';
                        document.getElementById('result-badge').style.background = '#fee2e2';
                        document.getElementById('result-badge').style.color = '#991b1b';
                    }
                } finally {
                    if (placeholder) placeholder.style.opacity = '1';
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

function showVisionResult(data) {
    const result = document.getElementById('vision-result');
    const metrics = document.getElementById('vision-metrics');
    const audio = document.getElementById('vision-audio');
    const badge = document.getElementById('result-badge');

    result.style.display = 'block';
    
    const dispersion = data.analysis.dispersion_percentage;
    let badgeText = 'Atención Alta';
    let badgeColor = '#10b981';
    if (dispersion > 40) {
        badgeText = 'Atención Baja';
        badgeColor = '#ef4444';
    } else if (dispersion > 20) {
        badgeText = 'Atención Media';
        badgeColor = '#f59e0b';
    }
    
    badge.textContent = badgeText;
    badge.style.background = badgeColor + '20';
    badge.style.color = badgeColor;
    
    metrics.innerHTML = `
        <div class="metric-card">
            <div class="metric-value">${data.analysis.total_count}</div>
            <div class="metric-label">Total Niños</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${data.analysis.distracted_count}</div>
            <div class="metric-label">Distraídos</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${dispersion}%</div>
            <div class="metric-label">Dispersión</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${100 - dispersion}%</div>
            <div class="metric-label">Atención</div>
        </div>
    `;
    audio.textContent = data.audio_message || '';
}

async function loadInsights() {
    const loading = document.getElementById('insights-loading');
    const content = document.getElementById('insights-content');
    loading.style.display = 'flex';
    content.style.display = 'none';

    try {
        const data = await api(`/insights/summary?session_id=${state.sessionId}`);
        showInsights(data);
    } catch (error) {
        loading.innerHTML = `<p style="color: var(--danger)">Error: ${error.message}</p>`;
    }
}

function showInsights(data) {
    document.getElementById('insights-loading').style.display = 'none';
    document.getElementById('insights-content').style.display = 'block';

    const statsGrid = document.getElementById('stats-grid');
    statsGrid.innerHTML = data.statistics.map(stat => `
        <div class="stat-card">
            <div class="stat-header">
                <span class="stat-metric">${stat.metric}</span>
                <span class="stat-trend ${stat.trend}">
                    ${stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}
                </span>
            </div>
            <div class="stat-value">${stat.value}</div>
            <div class="stat-unit">${stat.unit}</div>
        </div>
    `).join('');

    const patternsList = document.getElementById('patterns-list');
    patternsList.innerHTML = data.patterns.map(p => `<li>${p}</li>`).join('');

    const recList = document.getElementById('recommendations-list');
    recList.innerHTML = data.recommendations.map(r => `<li>${r}</li>`).join('');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const CHILDREN_KEY = 'misseli_children';

const SEED_CHILDREN = [
    {
        id: 'seed-lucia',
        name: 'Lucía',
        age: 5,
        notes: [
            { id: 'n1', content: 'Participa mucho en las rondas de lectura y ayuda a sus compañeros.', timestamp: '2026-07-08T09:15:00Z' },
            { id: 'n2', content: 'Se mantiene atenta durante actividades cortas.', timestamp: '2026-07-08T11:00:00Z' },
            { id: 'n3', content: 'A veces se distrae cuando hay ruido en el aula.', timestamp: '2026-07-09T10:30:00Z' },
        ],
    },
    {
        id: 'seed-mateo',
        name: 'Mateo',
        age: 6,
        notes: [
            { id: 'n4', content: 'Muy inquieto, se levanta seguido del puesto.', timestamp: '2026-07-08T09:40:00Z' },
            { id: 'n5', content: 'Le cuesta concentrarse en tareas largas.', timestamp: '2026-07-09T08:50:00Z' },
            { id: 'n6', content: 'Colabora cuando se le asigna un rol concreto como guía.', timestamp: '2026-07-09T11:20:00Z' },
        ],
    },
    {
        id: 'seed-valentina',
        name: 'Valentina',
        age: 4,
        notes: [
            { id: 'n7', content: 'Tranquila y respeta los turnos de los demás.', timestamp: '2026-07-08T10:05:00Z' },
            { id: 'n8', content: 'Energética, disfruta mucho las pausas activas.', timestamp: '2026-07-09T09:10:00Z' },
            { id: 'n9', content: 'Escucha con atención las instrucciones y obedece.', timestamp: '2026-07-09T12:00:00Z' },
        ],
    },
];

const DIMENSIONS = {
    'Atención': {
        positivo: ['atento', 'atenta', 'concentra', 'atencion', 'enfocado', 'enfocada', 'escucha', 'presta atencion', 'atenta'],
        negativo: ['distra', 'despistado', 'despistada', 'ausente', 'no presta', 'olvida', 'desconcentra'],
    },
    'Participación': {
        positivo: ['participa', 'colabora', 'ayuda', 'comparte', 'lider', 'aporta', 'activo en', 'se ofrece', 'ayuda a'],
        negativo: ['no participa', 'retraido', 'retraída', 'callado', 'callada', 'aisla', 'evita'],
    },
    'Comportamiento': {
        positivo: ['tranquilo', 'tranquila', 'respeta', 'amable', 'obediente', 'orden', 'colaborador', 'empatico', 'empática', 'solidario', 'solidaria'],
        negativo: ['inquieto', 'inquieta', 'agresivo', 'agresiva', 'desorden', 'pelea', 'grita', 'interrumpe', 'irritable'],
    },
    'Energía': {
        positivo: ['energetico', 'energética', 'movimiento', 'dinamico', 'dinámica', 'entusiasta', 'jugueton', 'juguetona', 'disfruta'],
        negativo: ['cansado', 'cansada', 'apatico', 'apática', 'somnoliento', 'desmotivado', 'desmotivada', 'bajo de energia'],
    },
};

function loadChildrenStore() {
    try {
        const raw = localStorage.getItem(CHILDREN_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.warn('No se pudo leer el registro local:', e);
    }
    const seed = JSON.parse(JSON.stringify(SEED_CHILDREN));
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(seed));
    return seed;
}

function saveChildrenStore(children) {
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
}

function findChild(id) {
    return loadChildrenStore().find(c => c.id === id);
}

function levelFromScore(score) {
    if (score >= 75) return 'Alto';
    if (score >= 50) return 'Medio';
    if (score >= 30) return 'Bajo';
    return 'Muy bajo';
}

function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function computeAnalysis(child) {
    const notes = child.notes || [];
    const noteCount = notes.length;
    const text = notes.map(n => n.content.toLowerCase()).join(' ');

    if (noteCount === 0) {
        return {
            child_id: child.id,
            child_name: child.name,
            notes_count: 0,
            dimensions: Object.keys(DIMENSIONS).map(d => ({
                dimension: d, score: 0, level: 'Sin datos',
                evidence: 'Aún no hay observaciones registradas.',
            })),
            summary: `Aún no se han registrado observaciones para ${child.name}. Agregá notas para generar su perfil de conducta.`,
            strengths: [],
            recommendations: ['Registrá la primera observación del día para iniciar el seguimiento.'],
        };
    }

    const dimensions = [];
    const strengths = [];
    const alerts = [];

    for (const [dim, terms] of Object.entries(DIMENSIONS)) {
        const pos = terms.positivo.reduce((s, t) => s + text.split(t).length - 1, 0);
        const neg = terms.negativo.reduce((s, t) => s + text.split(t).length - 1, 0);
        const total = pos + neg;
        let score, evidence;
        if (total === 0) {
            score = 55;
            evidence = `Sin menciones directas de ${dim.toLowerCase()}; se asume un nivel base a partir del ritmo general.`;
        } else {
            score = clampScore(50 + ((pos - neg) / total) * 45);
            if (pos && !neg) evidence = `Se destacó por aspectos positivos de ${dim.toLowerCase()} (${pos} observación/es).`;
            else if (neg && !pos) evidence = `Se registraron señales a trabajar en ${dim.toLowerCase()} (${neg} observación/es).`;
            else evidence = `Mezcla de señales en ${dim.toLowerCase()}: ${pos} positiva(s) y ${neg} a trabajar.`;
        }
        const level = levelFromScore(score);
        dimensions.push({ dimension: dim, score, level, evidence });
        if (score >= 70) strengths.push(`${dim} ${level.toLowerCase()}: ${evidence}`);
        else if (score < 40) alerts.push(`${dim} en nivel ${level.toLowerCase()}: conviene reforzar este aspecto.`);
    }

    const avg = clampScore(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
    const top = dimensions.reduce((a, b) => (b.score > a.score ? b : a));
    const weak = dimensions.reduce((a, b) => (b.score < a.score ? b : a));

    const summary = `${child.name} presenta un perfil de conducta general ${levelFromScore(avg).toLowerCase()} ` +
        `(índice ${avg}/100) a partir de ${noteCount} observación(es) registrada(s). ` +
        `Su punto más fuerte es ${top.dimension.toLowerCase()} (${top.score}/100), ` +
        `mientras que ${weak.dimension.toLowerCase()} (${weak.score}/100) es el área con mayor margen de crecimiento.`;

    const recommendations = buildRecommendations(child.name, dimensions, alerts);
    return {
        child_id: child.id, child_name: child.name, notes_count: noteCount,
        dimensions, summary, strengths, recommendations,
    };
}

function buildRecommendations(name, dimensions, alerts) {
    const recs = [...alerts];
    const byDim = Object.fromEntries(dimensions.map(d => [d.dimension, d]));
    if (byDim['Atención'].score < 50) recs.push(`Proponé bloques cortos de actividad (15-20 min) para sostener la atención de ${name}.`);
    if (byDim['Participación'].score < 50) recs.push(`Asignale a ${name} un rol concreto (pasapáginas, guía) para incentivar su participación.`);
    if (byDim['Comportamiento'].score < 50) recs.push(`Reforzá con reconocimiento inmediato los momentos de calma y orden de ${name}.`);
    if (byDim['Energía'].score >= 70) recs.push(`Incluí pausas activas para canalizar la energía de ${name} de forma positiva.`);
    if (byDim['Energía'].score < 40) recs.push(`Variá la dinámica con actividades motivadoras para elevar la energía de ${name}.`);
    if (recs.length === 0) recs.push(`Seguí registrando observaciones de ${name} para afinar su perfil y detectar patrones a tiempo.`);
    return recs;
}

function setupChildren() {
    const list = document.getElementById('children-list');
    const detail = document.getElementById('child-detail');
    const noteForm = document.getElementById('note-form');
    const backBtn = document.getElementById('child-back');
    const analyzeBtn = document.getElementById('analyze-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            detail.style.display = 'none';
            if (list) list.style.display = '';
            list.parentElement.scrollTop = 0;
        });
    }

    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('note-input');
            const content = input.value.trim();
            if (!content || !state.selectedChild) return;
            const children = loadChildrenStore();
            const child = children.find(c => c.id === state.selectedChild);
            if (!child) return;
            child.notes = child.notes || [];
            child.notes.push({
                id: 'n' + Date.now(),
                content,
                timestamp: new Date().toISOString(),
            });
            saveChildrenStore(children);
            input.value = '';
            openChild(state.selectedChild);
        });
    }

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            if (!state.selectedChild) return;
            const child = findChild(state.selectedChild);
            if (!child) return;
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analizando...';
            setTimeout(() => {
                showAnalysis(computeAnalysis(child));
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analizar conducta';
            }, 600);
        });
    }
}

function loadChildren() {
    const list = document.getElementById('children-list');
    if (!list) return;
    const children = loadChildrenStore();
    if (!children.length) {
        list.innerHTML = `<p class="empty-state">No hay niños en el registro.</p>`;
        return;
    }
    list.innerHTML = '';
    children.forEach(child => {
        const card = document.createElement('div');
        card.className = 'child-card';
        const ageText = child.age ? ` · ${child.age} años` : '';
        const notesCount = child.notes ? child.notes.length : 0;
        card.innerHTML = `
            <div class="child-card-info">
                <div class="child-card-name">${escapeHtml(child.name)}</div>
                <div class="child-card-meta">${ageText} · ${notesCount} nota(s)</div>
            </div>
            <button class="child-card-open" aria-label="Abrir">Ver</button>
        `;
        card.querySelector('.child-card-open').addEventListener('click', () => openChild(child.id));
        list.appendChild(card);
    });
}

function openChild(childId) {
    state.selectedChild = childId;
    const detail = document.getElementById('child-detail');
    const list = document.getElementById('children-list');
    const result = document.getElementById('analysis-result');
    if (result) result.style.display = 'none';
    const child = findChild(childId);
    if (!child) return;
    document.getElementById('child-detail-name').textContent = child.name;
    detail.style.display = 'block';
    if (list) list.style.display = 'none';
    renderNotes(child.notes || []);
}

function renderNotes(notes) {
    const container = document.getElementById('notes-list');
    if (!container) return;
    if (!notes.length) {
        container.innerHTML = `<p class="empty-state">Sin observaciones todavía.</p>`;
        return;
    }
    container.innerHTML = notes.map(note => `
        <div class="note-item">
            <p class="note-content">${escapeHtml(note.content)}</p>
            <span class="note-time">${escapeHtml(formatTime(note.timestamp))}</span>
        </div>
    `).join('');
}

function showAnalysis(data) {
    const container = document.getElementById('analysis-result');
    if (!container) return;
    container.style.display = 'block';
    const dims = data.dimensions.map(d => `
        <div class="behavior-dim">
            <div class="behavior-dim-head">
                <span class="behavior-dim-name">${escapeHtml(d.dimension)}</span>
                <span class="behavior-dim-level level-${levelClass(d.level)}">${escapeHtml(d.level)} · ${d.score}</span>
            </div>
            <div class="behavior-bar"><div class="behavior-bar-fill level-${levelClass(d.level)}" style="width:${d.score}%"></div></div>
            <p class="behavior-evidence">${escapeHtml(d.evidence)}</p>
        </div>
    `).join('');

    const strengths = data.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('');
    const recs = data.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('');

    container.innerHTML = `
        <div class="analysis-head">
            <h3>Análisis de Conducta</h3>
            <span class="analysis-count">${data.notes_count} nota(s)</span>
        </div>
        <p class="analysis-summary">${escapeHtml(data.summary)}</p>
        <div class="behavior-dims">${dims}</div>
        <div class="insights-card">
            <h3 class="insights-card-title">Fortalezas</h3>
            <ul class="insights-list">${strengths}</ul>
        </div>
        <div class="insights-card">
            <h3 class="insights-card-title">Recomendaciones</h3>
            <ul class="insights-list">${recs}</ul>
        </div>
    `;
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function levelClass(level) {
    const map = { 'Alto': 'good', 'Medio': 'mid', 'Bajo': 'low', 'Muy bajo': 'low', 'Sin datos': 'mid' };
    return map[level] || 'mid';
}

function formatTime(iso) {
    try {
        return new Date(iso).toLocaleString('es');
    } catch {
        return iso;
    }
}

document.addEventListener('DOMContentLoaded', init);
