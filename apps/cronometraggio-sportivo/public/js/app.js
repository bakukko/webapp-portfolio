// App State
let currentCronometraggio = null;
let tempiRegistrati = [];
let intervalId = null;
let lastRegisteredTime = null;
let pendingTempo = null;
let startTime = null;

// DOM Elements
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    cronometraggiSelect: document.getElementById('cronometraggiSelect'),
    currentTime: document.getElementById('currentTime'),
    startTimeDisplay: document.getElementById('startTimeDisplay'),
    startTimeInput: document.getElementById('startTimeInput'),
    setStartTimeBtn: document.getElementById('setStartTimeBtn'),
    timingBtn: document.getElementById('timingBtn'),
    bibInput: document.getElementById('bibInput'),
    noteInput: document.getElementById('noteInput'),
    saveBibBtn: document.getElementById('saveBibBtn'),
    clearInputBtn: document.getElementById('clearInputBtn'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    resultsTableBody: document.getElementById('resultsTableBody'),
    noResults: document.getElementById('noResults'),
    newCronometraggiBtn: document.getElementById('newCronometraggiBtn'),
    newCronometraggiModal: document.getElementById('newCronometraggiModal'),
    editTempoModal: document.getElementById('editTempoModal'),
    themeToggle: document.getElementById('themeToggle'),
    fullscreenBtn: document.getElementById('fullscreenBtn')
};

// Utility Functions
const API = {
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            showToast(error.message || 'Errore di connessione', 'error');
            throw error;
        }
    },

    // Cronometraggi
    async getCronometraggi() {
        return this.request('/api/cronometraggi');
    },

    async createCronometraggio(data) {
        return this.request('/api/cronometraggi', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateCronometraggio(id, data) {
        return this.request(`/api/cronometraggi/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteCronometraggio(id) {
        return this.request(`/api/cronometraggi/${id}`, {
            method: 'DELETE'
        });
    },

    async resetCronometraggio(id) {
        return this.request(`/api/cronometraggi/${id}/reset`, {
            method: 'POST'
        });
    },

    // Tempi
    async getTempi(cronometraggioId, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/tempi/${cronometraggioId}?${query}`);
    },

    async addTempo(data) {
        return this.request('/api/tempi', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateTempo(id, data) {
        return this.request(`/api/tempi/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteTempo(id) {
        return this.request(`/api/tempi/${id}`, {
            method: 'DELETE'
        });
    }
};

// Utility Functions
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatGap(milliseconds) {
    if (milliseconds <= 0) return '-';
    return `+${formatTime(milliseconds)}`;
}

function getCurrentTime() {
    return new Date();
}

function playSound() {
    // Feedback audio semplice
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
}

function vibrate() {
    if ('vibrate' in navigator) {
        navigator.vibrate(100);
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const icons = {
        success: '✅',
        error: '❌', 
        warning: '⚠️',
        info: 'ℹ️'
    };
    const colors = {
        success: 'from-green-500 to-emerald-500',
        error: 'from-red-500 to-pink-500',
        warning: 'from-yellow-500 to-orange-500',
        info: 'from-blue-500 to-indigo-500'
    };
    
    toast.className = `bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 translate-x-full backdrop-blur-sm border border-white border-opacity-20`;
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <span class="text-xl">${icons[type]}</span>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    elements.toastContainer = document.getElementById('toastContainer');
    elements.toastContainer.appendChild(toast);
    
    // Animazione entrata
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Rimozione automatica
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}    }, 100);
    
    // Rimozione automatica
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Clock Update
function updateClock() {
    const now = getCurrentTime();
    elements.currentTime.textContent = now.toLocaleTimeString('it-IT');
}

function startClock() {
    updateClock();
    intervalId = setInterval(updateClock, 1000);
}

function stopClock() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

// Cronometraggio Functions
async function loadCronometraggi() {
    try {
        const cronometraggi = await API.getCronometraggi();
        
        elements.cronometraggiSelect.innerHTML = '<option value="">🏁 Seleziona evento sportivo...</option>';
        
        cronometraggi.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.nome} (${c.numero_partecipanti || 0} partecipanti)`;
            elements.cronometraggiSelect.appendChild(option);
        });
        
        // Auto-seleziona l'ultimo cronometraggio se disponibile
        if (cronometraggi.length > 0) {
            elements.cronometraggiSelect.value = cronometraggi[0].id;
            await selectCronometraggio(cronometraggi[0].id);
        }
        
    } catch (error) {
        console.error('Errore nel caricamento cronometraggi:', error);
    }
}

async function selectCronometraggio(id) {
    if (!id) {
        currentCronometraggio = null;
        updateUI();
        return;
    }

    try {
        const cronometraggio = await API.request(`/api/cronometraggi/${id}`);
        currentCronometraggio = cronometraggio;
        
        // Imposta l'ora di partenza se disponibile
        if (cronometraggio.ora_partenza) {
            startTime = new Date(cronometraggio.ora_partenza);
            elements.startTimeDisplay.textContent = `⏰ Partenza: ${startTime.toLocaleTimeString('it-IT')}`;
            elements.startTimeInput.value = startTime.toISOString().slice(0, 16);
        } else {
            startTime = null;
            elements.startTimeDisplay.textContent = '⏰ Ora partenza non impostata';
            elements.startTimeInput.value = '';
        }
        
        await loadTempi();
        updateUI();
        
        showToast(`🏁 Cronometraggio "${cronometraggio.nome}" selezionato`, 'success');
        
    } catch (error) {
        console.error('Errore nella selezione cronometraggio:', error);
    }
}

async function createNewCronometraggio() {
    const name = document.getElementById('newCronometraggiName').value.trim();
    const startTimeValue = document.getElementById('newCronometraggiStart').value;
    const note = document.getElementById('newCronometraggiNote').value.trim();
    
    if (!name) {
        showToast('Nome evento richiesto', 'error');
        return;
    }
    
    try {
        const data = {
            nome: name,
            note: note || null
        };
        
        if (startTimeValue) {
            data.ora_partenza = new Date(startTimeValue).toISOString();
        }
        
        const newCronometraggio = await API.createCronometraggio(data);
        
        await loadCronometraggi();
        elements.cronometraggiSelect.value = newCronometraggio.id;
        await selectCronometraggio(newCronometraggio.id);
        
        closeNewCronometraggiModal();
        showToast('✨ Cronometraggio creato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nella creazione cronometraggio:', error);
    }
}

async function saveBib() {
    if (!pendingTempo) {
        showToast('Nessun tempo in attesa di BIB', 'warning');
        return;
    }
    
    const bib = elements.bibInput.value.trim();
    const note = elements.noteInput.value.trim();
    
    try {
        await API.updateTempo(pendingTempo.id, {
            cronometraggio_id: currentCronometraggio.id,
            bib: bib,
            note: note
        });
        
        pendingTempo = null;
        elements.bibInput.value = '';
        elements.noteInput.value = '';
        
        await loadTempi();
        showToast('💾 BIB salvato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nel salvataggio BIB:', error);
    }
}

// Data Loading
async function loadTempi() {
    if (!currentCronometraggio) return;
    
    try {
        const params = {};
        
        if (elements.searchInput.value.trim()) {
            params.search = elements.searchInput.value.trim();
        }
        
        const [orderBy, orderDir] = elements.sortSelect.value.split(',');
        params.orderBy = orderBy;
        params.orderDir = orderDir;
        
        tempiRegistrati = await API.getTempi(currentCronometraggio.id, params);
        renderTempi();
        updateStats();
        
    } catch (error) {
        console.error('Errore nel caricamento tempi:', error);
    }
}

function updateStats() {
    if (tempiRegistrati.length === 0) {
        document.getElementById('totalCount').textContent = '0';
        document.getElementById('avgTime').textContent = '--:--:--';
        document.getElementById('bestTime').textContent = '--:--:--';
        document.getElementById('lastTime').textContent = '--:--:--';
        return;
    }
    
    const total = tempiRegistrati.length;
    const avgMs = tempiRegistrati.reduce((sum, t) => sum + t.tempo_millisecondi, 0) / total;
    const bestMs = Math.min(...tempiRegistrati.map(t => t.tempo_millisecondi));
    const lastMs = tempiRegistrati[tempiRegistrati.length - 1].tempo_millisecondi;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('avgTime').textContent = formatTime(avgMs);
    document.getElementById('bestTime').textContent = formatTime(bestMs);
    document.getElementById('lastTime').textContent = formatTime(lastMs);
}

// Edit/Delete Functions
let editingTempoId = null;

async function editTempo(id) {
    const tempo = tempiRegistrati.find(t => t.id === id);
    if (!tempo) return;
    
    editingTempoId = id;
    document.getElementById('editBibInput').value = tempo.bib || '';
    document.getElementById('editNoteInput').value = tempo.note || '';
    
    elements.editTempoModal.classList.remove('hidden');
}

async function saveEdit() {
    if (!editingTempoId) return;
    
    const bib = document.getElementById('editBibInput').value.trim();
    const note = document.getElementById('editNoteInput').value.trim();
    
    try {
        await API.updateTempo(editingTempoId, {
            cronometraggio_id: currentCronometraggio.id,
            bib: bib,
            note: note
        });
        
        closeEditModal();
        await loadTempi();
        showToast('✏️ Tempo aggiornato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'aggiornamento tempo:', error);
    }
}

async function deleteTempo(id) {
    if (!confirm('Sei sicuro di voler eliminare questo tempo?')) return;
    
    try {
        await API.deleteTempo(id);
        await loadTempi();
        showToast('🗑️ Tempo eliminato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'eliminazione tempo:', error);
    }
}

// Export Functions
async function exportCSV() {
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    try {
        showToast('📄 Generazione CSV in corso...', 'info');
        
        const response = await fetch(`/api/export/csv/${currentCronometraggio.id}`);
        
        if (!response.ok) {
            throw new Error('Errore nell\'export CSV');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentCronometraggio.nome}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('📄 CSV scaricato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'export CSV:', error);
    }
}

async function exportPDF() {
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    try {
        showToast('📋 Generazione PDF in corso...', 'info');
        
        const response = await fetch(`/api/export/pdf/${currentCronometraggio.id}`);
        
        if (!response.ok) {
            throw new Error('Errore nell\'export PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentCronometraggio.nome}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('📋 PDF scaricato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'export PDF:', error);
    }
}

// Reset and Delete Functions
async function resetCronometraggio() {
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    const confirmMsg = `Sei sicuro di voler resettare "${currentCronometraggio.nome}"?\nTutti i tempi registrati verranno eliminati.`;
    if (!confirm(confirmMsg)) return;
    
    try {
        await API.resetCronometraggio(currentCronometraggio.id);
        await loadTempi();
        
        pendingTempo = null;
        elements.bibInput.value = '';
        elements.noteInput.value = '';
        
        showToast('🔄 Cronometraggio resettato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nel reset cronometraggio:', error);
    }
}

async function deleteCronometraggio() {
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    const confirmMsg = `Sei sicuro di voler eliminare completamente "${currentCronometraggio.nome}"?\nQuesta azione non può essere annullata.`;
    if (!confirm(confirmMsg)) return;
    
    try {
        await API.deleteCronometraggio(currentCronometraggio.id);
        
        currentCronometraggio = null;
        tempiRegistrati = [];
        pendingTempo = null;
        
        await loadCronometraggi();
        updateUI();
        
        showToast('🗑️ Cronometraggio eliminato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'eliminazione cronometraggio:', error);
    }
}

// UI Functions
function updateUI() {
    const hasActive = !!currentCronometraggio;
    
    elements.timingBtn.disabled = !hasActive;
    elements.saveBibBtn.disabled = !hasActive || !pendingTempo;
    
    if (currentCronometraggio) {
        document.getElementById('cronometraggiName').textContent = currentCronometraggio.nome;
        document.getElementById('partecipantiCount').textContent = `${tempiRegistrati.length} partecipanti`;
        document.getElementById('currentCronometraggiInfo').classList.remove('hidden');
    } else {
        document.getElementById('currentCronometraggiInfo').classList.add('hidden');
    }
}

function setStartTime() {
    const timeValue = elements.startTimeInput.value;
    if (!timeValue) {
        showToast('Seleziona un orario di partenza', 'warning');
        return;
    }
    
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    try {
        startTime = new Date(timeValue);
        elements.startTimeDisplay.textContent = `⏰ Partenza: ${startTime.toLocaleTimeString('it-IT')}`;
        
        // Aggiorna il cronometraggio con la nuova ora di partenza
        API.updateCronometraggio(currentCronometraggio.id, {
            ...currentCronometraggio,
            ora_partenza: startTime.toISOString()
        }).then(() => {
            showToast('🚀 Ora di partenza impostata', 'success');
        }).catch(error => {
            console.error('Errore nell\'aggiornamento ora partenza:', error);
        });
        
    } catch (error) {
        showToast('Formato orario non valido', 'error');
    }
}

// Modal Functions
function openNewCronometraggiModal() {
    elements.newCronometraggiModal.classList.remove('hidden');
    document.getElementById('newCronometraggiName').focus();
}

function closeNewCronometraggiModal() {
    elements.newCronometraggiModal.classList.add('hidden');
    document.getElementById('newCronometraggiName').value = '';
    document.getElementById('newCronometraggiStart').value = '';
    document.getElementById('newCronometraggiNote').value = '';
}

function closeEditModal() {
    elements.editTempoModal.classList.add('hidden');
    editingTempoId = null;
}

// Theme Functions
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

// Fullscreen Functions
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen not supported:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Auto-save Function
function startAutoSave() {
    setInterval(async () => {
        if (currentCronometraggio && tempiRegistrati.length > 0) {
            try {
                // Salva lo stato corrente nel localStorage come backup
                const backupData = {
                    cronometraggio: currentCronometraggio,
                    tempi: tempiRegistrati,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('cronometraggio_backup', JSON.stringify(backupData));
            } catch (error) {
                console.error('Errore nel backup automatico:', error);
            }
        }
    }, 30000); // Ogni 30 secondi
}

// Event Listeners
function initEventListeners() {
    // Cronometraggi
    elements.cronometraggiSelect.addEventListener('change', (e) => {
        selectCronometraggio(e.target.value);
    });
    
    elements.newCronometraggiBtn.addEventListener('click', openNewCronometraggiModal);
    
    document.getElementById('createCronometraggiBtn').addEventListener('click', createNewCronometraggio);
    document.getElementById('cancelNewCronometraggiBtn').addEventListener('click', closeNewCronometraggiModal);
    
    // Timing
    elements.timingBtn.addEventListener('click', registerTime);
    elements.setStartTimeBtn.addEventListener('click', setStartTime);
    
    // Input
    elements.saveBibBtn.addEventListener('click', saveBib);
    elements.clearInputBtn.addEventListener('click', () => {
        elements.bibInput.value = '';
        elements.noteInput.value = '';
        pendingTempo = null;
        updateUI();
    });
    
    // Search and Sort
    elements.searchInput.addEventListener('input', debounce(loadTempi, 300));
    elements.sortSelect.addEventListener('change', loadTempi);
    
    // Export
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
    document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);
    
    // Controls
    document.getElementById('resetBtn').addEventListener('click', resetCronometraggio);
    document.getElementById('deleteBtn').addEventListener('click', deleteCronometraggio);
    
    // Edit Modal
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    
    // Theme and Fullscreen
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Evita shortcuts se si sta scrivendo in un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Enter' && e.target === elements.bibInput) {
                e.preventDefault();
                if (pendingTempo) {
                    saveBib();
                }
            }
            return;
        }
        
        switch (e.key) {
            case ' ':
                e.preventDefault();
                registerTime();
                break;
            case 'Escape':
                closeNewCronometraggiModal();
                closeEditModal();
                break;
            case 'f':
            case 'F':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    elements.searchInput.focus();
                }
                break;
        }
    });
    
    // Modal click-outside-to-close
    elements.newCronometraggiModal.addEventListener('click', (e) => {
        if (e.target === elements.newCronometraggiModal) {
            closeNewCronometraggiModal();
        }
    });
    
    elements.editTempoModal.addEventListener('click', (e) => {
        if (e.target === elements.editTempoModal) {
            closeEditModal();
        }
    });
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialization
async function init() {
    try {
        initTheme();
        initEventListeners();
        startClock();
        startAutoSave();
        
        await loadCronometraggi();
        
        // Nascondi loading screen
        setTimeout(() => {
            elements.loadingScreen.classList.add('hidden');
        }, 500);
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Errore nell\'inizializzazione dell\'app', 'error');
    }
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Service Worker Registration (for PWA functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Clock Update
function updateClock() {
    const now = getCurrentTime();
    elements.currentTime.textContent = now.toLocaleTimeString('it-IT');
}

function startClock() {
    updateClock();
    intervalId = setInterval(updateClock, 1000);
}

function stopClock() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

// Cronometraggio Functions
async function loadCronometraggi() {
    try {
        const cronometraggi = await API.getCronometraggi();
        
        elements.cronometraggiSelect.innerHTML = '<option value="">Seleziona cronometraggio...</option>';
        
        cronometraggi.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.nome} (${c.numero_partecipanti || 0} partecipanti)`;
            elements.cronometraggiSelect.appendChild(option);
        });
        
        // Auto-seleziona l'ultimo cronometraggio se disponibile
        if (cronometraggi.length > 0) {
            elements.cronometraggiSelect.value = cronometraggi[0].id;
            await selectCronometraggio(cronometraggi[0].id);
        }
        
    } catch (error) {
        console.error('Errore nel caricamento cronometraggi:', error);
    }
}

async function selectCronometraggio(id) {
    if (!id) {
        currentCronometraggio = null;
        updateUI();
        return;
    }

    try {
        const cronometraggio = await API.request(`/api/cronometraggi/${id}`);
        currentCronometraggio = cronometraggio;
        
        // Imposta l'ora di partenza se disponibile
        if (cronometraggio.ora_partenza) {
            startTime = new Date(cronometraggio.ora_partenza);
            elements.startTimeDisplay.textContent = `Partenza: ${startTime.toLocaleTimeString('it-IT')}`;
            elements.startTimeInput.value = startTime.toISOString().slice(0, 16);
        } else {
            startTime = null;
            elements.startTimeDisplay.textContent = 'Ora partenza non impostata';
            elements.startTimeInput.value = '';
        }
        
        await loadTempi();
        updateUI();
        
        showToast(`Cronometraggio "${cronometraggio.nome}" selezionato`, 'success');
        
    } catch (error) {
        console.error('Errore nella selezione cronometraggio:', error);
    }
}

async function createNewCronometraggio() {
    const name = document.getElementById('newCronometraggiName').value.trim();
    const startTimeValue = document.getElementById('newCronometraggiStart').value;
    const note = document.getElementById('newCronometraggiNote').value.trim();
    
    if (!name) {
        showToast('Nome evento richiesto', 'error');
        return;
    }
    
    try {
        const data = {
            nome: name,
            note: note || null
        };
        
        if (startTimeValue) {
            data.ora_partenza = new Date(startTimeValue).toISOString();
        }
        
        const newCronometraggio = await API.createCronometraggio(data);
        
        await loadCronometraggi();
        elements.cronometraggiSelect.value = newCronometraggio.id;
        await selectCronometraggio(newCronometraggio.id);
        
        closeNewCronometraggiModal();
        showToast('Cronometraggio creato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nella creazione cronometraggio:', error);
    }
}

// Timing Functions
async function registerTime() {
    if (!currentCronometraggio) {
        showToast('Seleziona un evento prima di cronometrare', 'warning');
        return;
    }
    
    const now = getCurrentTime();
    const tempoMillisecondi = now.getTime();
    
    try {
        // Feedback immediato con animazioni moderne
        playSound();
        vibrate();
        
        // Animazione pulsante con effetto moderno
        elements.timingBtn.style.background = 'linear-gradient(135deg, #f472b6 0%, #e3006c 100%)';
        elements.timingBtn.style.transform = 'scale(0.95)';
        elements.timingBtn.style.boxShadow = '0 0 30px rgba(227, 0, 108, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.2)';
        
        setTimeout(() => {
            elements.timingBtn.style.background = 'linear-gradient(135deg, #e3006c 0%, #be185d 100%)';
            elements.timingBtn.style.transform = 'scale(1)';
            elements.timingBtn.style.boxShadow = '0 8px 32px rgba(227, 0, 108, 0.4)';
        }, 200);
        
        const tempoData = {
            cronometraggio_id: currentCronometraggio.id,
            tempo_arrivo: now.toISOString(),
            tempo_millisecondi: tempoMillisecondi,
            bib: '',
            note: ''
        };
        
        const newTempo = await API.addTempo(tempoData);
        
        // Salva il tempo per l'input del BIB
        pendingTempo = newTempo;
        lastRegisteredTime = formatTime(tempoMillisecondi);
        
        // Focus sul campo BIB per input rapido con animazione
        elements.bibInput.focus();
        elements.bibInput.style.borderColor = '#e3006c';
        elements.bibInput.style.boxShadow = '0 0 20px rgba(227, 0, 108, 0.3)';
        
        setTimeout(() => {
            elements.bibInput.style.borderColor = '';
            elements.bibInput.style.boxShadow = '';
        }, 2000);
        
        await loadTempi();
        updateStats();
        
        showToast(`⏱️ Tempo registrato: ${lastRegisteredTime}`, 'success');
        
    } catch (error) {
        console.error('Errore nella registrazione tempo:', error);
        
        // Animazione di errore
        elements.timingBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        elements.timingBtn.classList.add('vibrate');
        
        setTimeout(() => {
            elements.timingBtn.style.background = 'linear-gradient(135deg, #e3006c 0%, #be185d 100%)';
            elements.timingBtn.classList.remove('vibrate');
        }, 500);
        
        showToast('Errore nella registrazione del tempo', 'error');
    }
}

async function saveBib() {
    if (!pendingTempo) {
        showToast('Nessun tempo in attesa di BIB', 'warning');
        return;
    }
    
    const bib = elements.bibInput.value.trim();
    const note = elements.noteInput.value.trim();
    
    try {
        await API.updateTempo(pendingTempo.id, {
            cronometraggio_id: currentCronometraggio.id,
            bib: bib,
            note: note
        });
        
        pendingTempo = null;
        elements.bibInput.value = '';
        elements.noteInput.value = '';
        
        await loadTempi();
        showToast('BIB salvato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nel salvataggio BIB:', error);
    }
}

// Data Loading
async function loadTempi() {
    if (!currentCronometraggio) return;
    
    try {
        const params = {};
        
        if (elements.searchInput.value.trim()) {
            params.search = elements.searchInput.value.trim();
        }
        
        const [orderBy, orderDir] = elements.sortSelect.value.split(',');
        params.orderBy = orderBy;
        params.orderDir = orderDir;
        
        tempiRegistrati = await API.getTempi(currentCronometraggio.id, params);
        renderTempi();
        updateStats();
        
    } catch (error) {
        console.error('Errore nel caricamento tempi:', error);
    }
}

function renderTempi() {
    if (tempiRegistrati.length === 0) {
        elements.resultsTableBody.innerHTML = '';
        elements.noResults.classList.remove('hidden');
        return;
    }
    
    elements.noResults.classList.add('hidden');
    
    elements.resultsTableBody.innerHTML = tempiRegistrati.map((tempo, index) => {
        const posizione = index + 1;
        const timeFormatted = formatTime(tempo.tempo_millisecondi);
        const gapFormatted = formatGap(tempo.gap_primo);
        
        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-2 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    ${posizione}
                </td>
                <td class="px-2 py-3 text-sm text-gray-900 dark:text-white">
                    ${tempo.bib || '-'}
                </td>
                <td class="px-2 py-3 text-sm font-mono text-gray-900 dark:text-white">
                    ${timeFormatted}
                </td>
                <td class="px-2 py-3 text-sm text-gray-600 dark:text-gray-400">
                    ${gapFormatted}
                </td>
                <td class="px-2 py-3 text-sm text-gray-600 dark:text-gray-400">
                    ${tempo.note || '-'}
                </td>
                <td class="px-2 py-3 text-center">
                    <div class="flex justify-center gap-1">
                        <button onclick="editTempo(${tempo.id})" 
                                class="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded">
                            ✏️
                        </button>
                        <button onclick="deleteTempo(${tempo.id})" 
                                class="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    if (tempiRegistrati.length === 0) {
        document.getElementById('totalCount').textContent = '0';
        document.getElementById('avgTime').textContent = '--:--:--';
        document.getElementById('bestTime').textContent = '--:--:--';
        document.getElementById('lastTime').textContent = '--:--:--';
        return;
    }
    
    const total = tempiRegistrati.length;
    const avgMs = tempiRegistrati.reduce((sum, t) => sum + t.tempo_millisecondi, 0) / total;
    const bestMs = Math.min(...tempiRegistrati.map(t => t.tempo_millisecondi));
    const lastMs = tempiRegistrati[tempiRegistrati.length - 1].tempo_millisecondi;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('avgTime').textContent = formatTime(avgMs);
    document.getElementById('bestTime').textContent = formatTime(bestMs);
    document.getElementById('lastTime').textContent = formatTime(lastMs);
}

// Edit/Delete Functions
let editingTempoId = null;

async function editTempo(id) {
    const tempo = tempiRegistrati.find(t => t.id === id);
    if (!tempo) return;
    
    editingTempoId = id;
    document.getElementById('editBibInput').value = tempo.bib || '';
    document.getElementById('editNoteInput').value = tempo.note || '';
    
    elements.editTempoModal.classList.remove('hidden');
}

async function saveEdit() {
    if (!editingTempoId) return;
    
    const bib = document.getElementById('editBibInput').value.trim();
    const note = document.getElementById('editNoteInput').value.trim();
    
    try {
        await API.updateTempo(editingTempoId, {
            cronometraggio_id: currentCronometraggio.id,
            bib: bib,
            note: note
        });
        
        closeEditModal();
        await loadTempi();
        showToast('Tempo aggiornato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'aggiornamento tempo:', error);
    }
}

async function deleteTempo(id) {
    if (!confirm('Sei sicuro di voler eliminare questo tempo?')) return;
    
    try {
        await API.deleteTempo(id);
        await loadTempi();
        showToast('Tempo eliminato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'eliminazione tempo:', error);
    }
}

// Export Functions
async function exportCSV() {
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    try {
        showToast('Generazione CSV in corso...', 'info');
        
        const response = await fetch(`/api/export/csv/${currentCronometraggio.id}`);
        
        if (!response.ok) {
            throw new Error('Errore nell\'export CSV');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentCronometraggio.nome}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('CSV scaricato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'export CSV:', error);
    }
}

async function exportPDF() {
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    try {
        showToast('Generazione PDF in corso...', 'info');
        
        const response = await fetch(`/api/export/pdf/${currentCronometraggio.id}`);
        
        if (!response.ok) {
            throw new Error('Errore nell\'export PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentCronometraggio.nome}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('PDF scaricato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'export PDF:', error);
    }
}

// Reset and Delete Functions
async function resetCronometraggio() {
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    const confirmMsg = `Sei sicuro di voler resettare "${currentCronometraggio.nome}"?\nTutti i tempi registrati verranno eliminati.`;
    if (!confirm(confirmMsg)) return;
    
    try {
        await API.resetCronometraggio(currentCronometraggio.id);
        await loadTempi();
        
        pendingTempo = null;
        elements.bibInput.value = '';
        elements.noteInput.value = '';
        
        showToast('Cronometraggio resettato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nel reset cronometraggio:', error);
    }
}

async function deleteCronometraggio() {
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    const confirmMsg = `Sei sicuro di voler eliminare completamente "${currentCronometraggio.nome}"?\nQuesta azione non può essere annullata.`;
    if (!confirm(confirmMsg)) return;
    
    try {
        await API.deleteCronometraggio(currentCronometraggio.id);
        
        currentCronometraggio = null;
        tempiRegistrati = [];
        pendingTempo = null;
        
        await loadCronometraggi();
        updateUI();
        
        showToast('Cronometraggio eliminato con successo', 'success');
        
    } catch (error) {
        console.error('Errore nell\'eliminazione cronometraggio:', error);
    }
}

// UI Functions
function updateUI() {
    const hasActive = !!currentCronometraggio;
    
    elements.timingBtn.disabled = !hasActive;
    elements.saveBibBtn.disabled = !hasActive || !pendingTempo;
    
    if (currentCronometraggio) {
        document.getElementById('cronometraggiName').textContent = currentCronometraggio.nome;
        document.getElementById('partecipantiCount').textContent = `${tempiRegistrati.length} partecipanti`;
        document.getElementById('currentCronometraggiInfo').classList.remove('hidden');
    } else {
        document.getElementById('currentCronometraggiInfo').classList.add('hidden');
    }
}

function setStartTime() {
    const timeValue = elements.startTimeInput.value;
    if (!timeValue) {
        showToast('Seleziona un orario di partenza', 'warning');
        return;
    }
    
    if (!currentCronometraggio) {
        showToast('Seleziona un cronometraggio prima', 'warning');
        return;
    }
    
    try {
        startTime = new Date(timeValue);
        elements.startTimeDisplay.textContent = `Partenza: ${startTime.toLocaleTimeString('it-IT')}`;
        
        // Aggiorna il cronometraggio con la nuova ora di partenza
        API.updateCronometraggio(currentCronometraggio.id, {
            ...currentCronometraggio,
            ora_partenza: startTime.toISOString()
        }).then(() => {
            showToast('Ora di partenza impostata', 'success');
        }).catch(error => {
            console.error('Errore nell\'aggiornamento ora partenza:', error);
        });
        
    } catch (error) {
        showToast('Formato orario non valido', 'error');
    }
}

// Modal Functions
function openNewCronometraggiModal() {
    elements.newCronometraggiModal.classList.remove('hidden');
    document.getElementById('newCronometraggiName').focus();
}

function closeNewCronometraggiModal() {
    elements.newCronometraggiModal.classList.add('hidden');
    document.getElementById('newCronometraggiName').value = '';
    document.getElementById('newCronometraggiStart').value = '';
    document.getElementById('newCronometraggiNote').value = '';
}

function closeEditModal() {
    elements.editTempoModal.classList.add('hidden');
    editingTempoId = null;
}

// Theme Functions
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

// Fullscreen Functions
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen not supported:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Auto-save Function
function startAutoSave() {
    setInterval(async () => {
        if (currentCronometraggio && tempiRegistrati.length > 0) {
            try {
                // Salva lo stato corrente nel localStorage come backup
                const backupData = {
                    cronometraggio: currentCronometraggio,
                    tempi: tempiRegistrati,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('cronometraggio_backup', JSON.stringify(backupData));
            } catch (error) {
                console.error('Errore nel backup automatico:', error);
            }
        }
    }, 30000); // Ogni 30 secondi
}

// Event Listeners
function initEventListeners() {
    // Cronometraggi
    elements.cronometraggiSelect.addEventListener('change', (e) => {
        selectCronometraggio(e.target.value);
    });
    
    elements.newCronometraggiBtn.addEventListener('click', openNewCronometraggiModal);
    
    document.getElementById('createCronometraggiBtn').addEventListener('click', createNewCronometraggio);
    document.getElementById('cancelNewCronometraggiBtn').addEventListener('click', closeNewCronometraggiModal);
    
    // Timing
    elements.timingBtn.addEventListener('click', registerTime);
    elements.setStartTimeBtn.addEventListener('click', setStartTime);
    
    // Input
    elements.saveBibBtn.addEventListener('click', saveBib);
    elements.clearInputBtn.addEventListener('click', () => {
        elements.bibInput.value = '';
        elements.noteInput.value = '';
        pendingTempo = null;
        updateUI();
    });
    
    // Search and Sort
    elements.searchInput.addEventListener('input', debounce(loadTempi, 300));
    elements.sortSelect.addEventListener('change', loadTempi);
    
    // Export
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
    document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);
    
    // Controls
    document.getElementById('resetBtn').addEventListener('click', resetCronometraggio);
    document.getElementById('deleteBtn').addEventListener('click', deleteCronometraggio);
    
    // Edit Modal
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    
    // Theme and Fullscreen
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Evita shortcuts se si sta scrivendo in un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Enter' && e.target === elements.bibInput) {
                e.preventDefault();
                if (pendingTempo) {
                    saveBib();
                }
            }
            return;
        }
        
        switch (e.key) {
            case ' ':
                e.preventDefault();
                registerTime();
                break;
            case 'Escape':
                closeNewCronometraggiModal();
                closeEditModal();
                break;
            case 'f':
            case 'F':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    elements.searchInput.focus();
                }
                break;
        }
    });
    
    // Modal click-outside-to-close
    elements.newCronometraggiModal.addEventListener('click', (e) => {
        if (e.target === elements.newCronometraggiModal) {
            closeNewCronometraggiModal();
        }
    });
    
    elements.editTempoModal.addEventListener('click', (e) => {
        if (e.target === elements.editTempoModal) {
            closeEditModal();
        }
    });
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialization
async function init() {
    try {
        initTheme();
        initEventListeners();
        startClock();
        startAutoSave();
        
        await loadCronometraggi();
        
        // Nascondi loading screen
        setTimeout(() => {
            elements.loadingScreen.classList.add('hidden');
        }, 500);
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Errore nell\'inizializzazione dell\'app', 'error');
    }
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Service Worker Registration (for PWA functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
