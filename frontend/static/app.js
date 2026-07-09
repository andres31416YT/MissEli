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

function setupChildren() {
    const form = document.getElementById('child-form');
    const list = document.getElementById('children-list');
    const detail = document.getElementById('child-detail');
    const noteForm = document.getElementById('note-form');
    const backBtn = document.getElementById('child-back');
    const analyzeBtn = document.getElementById('analyze-btn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('child-name').value.trim();
            const ageRaw = document.getElementById('child-age').value.trim();
            if (!name) return;
            const body = { name };
            if (ageRaw) body.age = parseInt(ageRaw, 10);
            try {
                await api('/children', { method: 'POST', body: JSON.stringify(body) });
                form.reset();
                await loadChildren();
            } catch (error) {
                alert(`Error al registrar: ${error.message}`);
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            detail.style.display = 'none';
            if (list) list.style.display = '';
            list.parentElement.scrollTop = 0;
        });
    }

    if (noteForm) {
        noteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('note-input');
            const content = input.value.trim();
            if (!content || !state.selectedChild) return;
            try {
                await api(`/children/${state.selectedChild}/notes`, {
                    method: 'POST',
                    body: JSON.stringify({ content }),
                });
                input.value = '';
                await openChild(state.selectedChild);
            } catch (error) {
                alert(`Error al guardar nota: ${error.message}`);
            }
        });
    }

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            if (!state.selectedChild) return;
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analizando...';
            try {
                const data = await api(`/children/${state.selectedChild}/analysis`);
                await delay(600);
                showAnalysis(data);
            } catch (error) {
                alert(`Error al analizar: ${error.message}`);
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analizar conducta';
            }
        });
    }
}

async function loadChildren() {
    const list = document.getElementById('children-list');
    if (!list) return;
    try {
        const children = await api('/children');
        if (!children.length) {
            list.innerHTML = `<p class="empty-state">Aún no hay niños registrados. Agregá el primero arriba.</p>`;
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
    } catch (error) {
        list.innerHTML = `<p class="empty-state">Error al cargar: ${escapeHtml(error.message)}</p>`;
    }
}

async function openChild(childId) {
    state.selectedChild = childId;
    const detail = document.getElementById('child-detail');
    const list = document.getElementById('children-list');
    const result = document.getElementById('analysis-result');
    if (result) result.style.display = 'none';
    try {
        const child = await api(`/children/${childId}`);
        document.getElementById('child-detail-name').textContent = child.name;
        detail.style.display = 'block';
        if (list) list.style.display = 'none';
        renderNotes(child.notes || []);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
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
