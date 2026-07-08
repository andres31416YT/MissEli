const API_BASE = window.location.origin;

const state = {
    currentTab: 'chat',
    sessionId: 'session-' + Date.now(),
    messages: [],
};

function init() {
    setupTabs();
    setupChat();
    setupVision();
    loadInsights();
    loadSuggestions();
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

        try {
            const data = await api('/chat/message', {
                method: 'POST',
                body: JSON.stringify({ message, session_id: state.sessionId }),
            });
            addMessage('assistant', data.response);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
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
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadSuggestions() {
    try {
        const data = await api('/chat/suggestions');
        const list = document.getElementById('suggestions-list');
        list.innerHTML = '';
        data.suggestions.forEach(suggestion => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.textContent = suggestion;
            chip.addEventListener('click', () => {
                document.getElementById('chat-input').value = suggestion;
                document.getElementById('chat-input').focus();
            });
            list.appendChild(chip);
        });
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
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

                try {
                    const data = await api('/vision/analyze', {
                        method: 'POST',
                        body: JSON.stringify({
                            session_id: state.sessionId,
                            image_base64: base64,
                        }),
                    });
                    showVisionResult(data);
                } catch (error) {
                    alert(`Error: ${error.message}`);
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

document.addEventListener('DOMContentLoaded', init);
