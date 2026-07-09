const API_BASE = window.location.origin;

const state = {
    currentTab: 'chat',
    sessionId: 'session-' + Date.now(),
    messages: [],
    suggestionsCollapsed: false,
};

function init() {
    setupTabs();
    setupChat();
    setupVision();
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

document.addEventListener('DOMContentLoaded', init);
