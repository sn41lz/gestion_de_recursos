/**
 * SGR-IT - Sistema de Gestión de Recursos IT
 * JavaScript Principal
 */

// ========================================
// CONFIGURATION & CONSTANTS
// ========================================
const API_BASE = 'api/';
const TOAST_DURATION = 4000;

// Global State
let currentUser = null;
let recursos = [];
let reservas = [];
let usuarios = [];
let tiposRecurso = [];
let estadosReserva = [];

// Chart instances
let tiposRecursoChart = null;
let estadosReservaChart = null;
let actividadSemanalChart = null;
let usoRecursosChart = null;
let actividadUsuariosChart = null;
let historicoReservasChart = null;

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    try {
        initClock();
        initEventListeners();
        checkAuth();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        // En caso de error, mostrar login
        showLoginModal();
    }
    
    // Fallback: si después de 3 segundos no hay nada visible, mostrar login
    setTimeout(() => {
        const loginModal = document.getElementById('loginModal');
        const app = document.getElementById('app');
        if (!loginModal.classList.contains('active') && app.classList.contains('hidden')) {
            console.warn('Fallback: mostrando login modal');
            showLoginModal();
        }
    }, 3000);
});

function initClock() {
    const updateClock = () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        document.getElementById('liveClock').textContent = timeStr;
    };
    updateClock();
    setInterval(updateClock, 1000);
}

// Helper function for safe event listener
function safeAddListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
    } else {
        console.warn(`Element not found: ${id}`);
    }
}

function initEventListeners() {
    // Login form
    safeAddListener('loginForm', 'submit', handleLogin);
    
    // Logout button
    safeAddListener('logoutBtn', 'click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showSection(section);
        });
    });
    
    // Sidebar toggle
    safeAddListener('sidebarToggle', 'click', () => {
        document.querySelector('.sidebar')?.classList.toggle('open');
    });
    
    // Theme toggle
    safeAddListener('themeToggle', 'click', toggleTheme);
    
    // Notifications
    safeAddListener('notificationsBtn', 'click', toggleNotifications);
    
    // Forms
    safeAddListener('reservaForm', 'submit', handleReservaSubmit);
    safeAddListener('recursoForm', 'submit', handleRecursoSubmit);
    safeAddListener('usuarioForm', 'submit', handleUsuarioSubmit);
    safeAddListener('profileForm', 'submit', handleProfileSubmit);
    
    // Filters
    safeAddListener('filterTipoRecurso', 'change', filterRecursos);
    safeAddListener('filterEstadoRecurso', 'change', filterRecursos);
    safeAddListener('filterEstadoReserva', 'change', filterReservas);
    safeAddListener('filterFechaReserva', 'change', filterReservas);
    
    // Search
    safeAddListener('globalSearch', 'input', debounce(handleGlobalSearch, 300));
    
    // Refresh activity
    safeAddListener('refreshActivity', 'click', loadActivityFeed);
    
    // Close modals on outside click (except login modal)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            // No cerrar el modal de login al hacer clic fuera
            if (modal.id === 'loginModal') return;
            
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ========================================
// AUTHENTICATION
// ========================================
async function checkAuth() {
    const user = localStorage.getItem('sgr_user');
    if (user) {
        try {
            currentUser = JSON.parse(user);
            if (currentUser && currentUser.id_usuario) {
                showApp();
                // Refrescar datos del usuario desde la API
                await refreshCurrentUser();
            } else {
                throw new Error('Usuario inválido');
            }
        } catch (e) {
            console.error('Error en checkAuth:', e);
            localStorage.removeItem('sgr_user');
            currentUser = null;
            showLoginModal();
        }
    } else {
        showLoginModal();
    }
}

function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('app').classList.add('hidden');
}

async function refreshCurrentUser() {
    if (!currentUser || !currentUser.id_usuario) return;
    
    try {
        const response = await fetch(`${API_BASE}usuarios.php?id=${currentUser.id_usuario}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
                currentUser = { ...currentUser, ...data.data };
                localStorage.setItem('sgr_user', JSON.stringify(currentUser));
                updateUserAvatar();
            }
        }
    } catch (e) {
        console.log('No se pudo refrescar datos del usuario:', e);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Disable form while loading
    emailInput.disabled = true;
    passwordInput.disabled = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    
    try {
        console.log('Intentando login con:', email);
        const response = await fetch(`${API_BASE}auth.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password })
        });
        
        console.log('Login response status:', response.status);
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (data.success) {
            // La API devuelve data.data.user
            currentUser = data.data?.user || data.user;
            if (currentUser) {
                localStorage.setItem('sgr_user', JSON.stringify(currentUser));
                showApp();
                showToast('success', `¡Bienvenido, ${currentUser.nombre}!`);
            } else {
                throw new Error('Usuario no encontrado en la respuesta');
            }
        } else {
            showToast('error', data.message || 'Error de autenticación');
            // Re-enable form
            emailInput.disabled = false;
            passwordInput.disabled = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Iniciar Sesión</span><i class="fas fa-arrow-right"></i>';
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('error', 'Error de conexión con el servidor');
        // Re-enable form
        emailInput.disabled = false;
        passwordInput.disabled = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Iniciar Sesión</span><i class="fas fa-arrow-right"></i>';
    }
}

function handleLogout() {
    localStorage.removeItem('sgr_user');
    currentUser = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginModal').classList.add('active');
    document.body.classList.remove('is-admin');
    document.body.classList.remove('is-user');
    showToast('info', 'Sesión cerrada correctamente');
}

function showApp() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('app').classList.remove('hidden');
    
    // Update user info
    document.getElementById('userName').textContent = currentUser.nombre;
    document.getElementById('userRole').textContent = currentUser.rol === 'admin' ? 'Administrador' : 'Usuario';
    
    // Update user avatar
    updateUserAvatar();
    
    // Configure view based on role
    if (currentUser.rol === 'admin') {
        document.body.classList.add('is-admin');
        document.body.classList.remove('is-user');
        // Iniciar monitor de sistema para admins
        startSystemMonitor();
    } else {
        document.body.classList.remove('is-admin');
        document.body.classList.add('is-user');
    }
    
    // Load all data
    loadAllData();
}

function updateUserAvatar() {
    const avatarContainer = document.getElementById('userAvatar');
    if (!avatarContainer) return;
    
    if (currentUser.foto_url) {
        avatarContainer.innerHTML = `<img src="${currentUser.foto_url}" alt="${currentUser.nombre}">`;
    } else {
        avatarContainer.innerHTML = `<div class="avatar-icon"><i class="fas fa-user"></i></div>`;
    }
}

// ========================================
// DATA LOADING
// ========================================
async function loadAllData() {
    console.log('Iniciando carga de datos...');
    console.log('API_BASE:', API_BASE);
    
    try {
        // Test API connection first
        const testResponse = await fetch(`${API_BASE}test.php`);
        console.log('Test API response:', testResponse.status);
        
        await Promise.all([
            loadTiposRecurso(),
            loadEstadosReserva(),
            loadRecursos(),
            loadReservas(),
            loadUsuarios()
        ]);
        
        console.log('Datos cargados:', { recursos, reservas, usuarios, tiposRecurso, estadosReserva });
        
        try { updateDashboard(); } catch(e) { console.error('Error in updateDashboard:', e); }
        try { loadActivityFeed(); } catch(e) { console.error('Error in loadActivityFeed:', e); }
        try { updateBuildingMap(); } catch(e) { console.error('Error in updateBuildingMap:', e); }
        try { initCharts(); } catch(e) { console.error('Error in initCharts:', e); }
        try { updateNotificationBadge(); } catch(e) { console.error('Error in updateNotificationBadge:', e); }
        
        // Initialize calendar (in case user navigates to it)
        console.log('About to call initWeekCalendar...');
        initWeekCalendar();
        console.log('initWeekCalendar completed');
        
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('error', 'Error al cargar los datos: ' + error.message);
    }
}

async function loadTiposRecurso() {
    try {
        console.log('Cargando tipos recurso...');
        const response = await fetch(`${API_BASE}tipos_recurso.php`);
        console.log('Tipos recurso response status:', response.status);
        const data = await response.json();
        console.log('Tipos recurso data:', data);
        tiposRecurso = data.data || [];
        populateTiposRecursoSelects();
    } catch (error) {
        console.error('Error loading tipos recurso:', error);
        throw error;
    }
}

async function loadEstadosReserva() {
    try {
        console.log('Cargando estados reserva...');
        const response = await fetch(`${API_BASE}estados_reserva.php`);
        const data = await response.json();
        estadosReserva = data.data || [];
        populateEstadosReservaSelect();
    } catch (error) {
        console.error('Error loading estados reserva:', error);
        throw error;
    }
}

async function loadRecursos() {
    try {
        console.log('Cargando recursos...');
        const response = await fetch(`${API_BASE}recursos.php`);
        console.log('Recursos response status:', response.status);
        const data = await response.json();
        console.log('Recursos data:', data);
        recursos = data.data || [];
        renderRecursos();
        populateRecursosSelect();
    } catch (error) {
        console.error('Error loading recursos:', error);
        throw error;
    }
}

async function loadReservas() {
    try {
        console.log('Cargando reservas...');
        const response = await fetch(`${API_BASE}reservas.php`);
        const data = await response.json();
        console.log('Reservas data:', data);
        reservas = data.data || [];
        renderReservas();
        renderProximasReservas();
        
        // Update calendar if initialized
        if (calendarCurrentWeekStart) {
            renderWeekCalendar();
        }
    } catch (error) {
        console.error('Error loading reservas:', error);
        throw error;
    }
}

async function loadUsuarios() {
    try {
        console.log('Cargando usuarios...');
        const response = await fetch(`${API_BASE}usuarios.php`);
        const data = await response.json();
        usuarios = data.data || [];
        renderUsuarios();
    } catch (error) {
        console.error('Error loading usuarios:', error);
        throw error;
    }
}

// ========================================
// POPULATE SELECTS
// ========================================
function populateTiposRecursoSelects() {
    const filterSelect = document.getElementById('filterTipoRecurso');
    const formSelect = document.getElementById('recursoTipo');
    
    const options = tiposRecurso.map(t => 
        `<option value="${t.id_tipo_recurso}">${t.nombre}</option>`
    ).join('');
    
    filterSelect.innerHTML = '<option value="">Todos los tipos</option>' + options;
    formSelect.innerHTML = options;
}

function populateEstadosReservaSelect() {
    const filterSelect = document.getElementById('filterEstadoReserva');
    
    const options = estadosReserva.map(e => 
        `<option value="${e.id_estado_reserva}">${e.nombre}</option>`
    ).join('');
    
    filterSelect.innerHTML = '<option value="">Todos los estados</option>' + options;
}

function populateRecursosSelect() {
    const select = document.getElementById('reservaRecurso');
    
    const options = recursos
        .filter(r => r.estado === 'disponible')
        .map(r => `<option value="${r.id_recurso}">${r.nombre} (${r.tipo_nombre})</option>`)
        .join('');
    
    select.innerHTML = '<option value="">Selecciona un recurso</option>' + options;
}

// ========================================
// DASHBOARD
// ========================================
function updateDashboard() {
    const now = new Date();
    
    // Calcular recursos realmente en uso (tienen reserva activa ahora mismo)
    const recursosEnUsoIds = new Set();
    reservas.forEach(r => {
        if ((r.estado_nombre === 'Confirmada' || r.estado_nombre === 'Pendiente') &&
            new Date(r.fecha_inicio) <= now && new Date(r.fecha_fin) >= now) {
            recursosEnUsoIds.add(r.id_recurso);
        }
    });
    
    const totalRecursos = recursos.length;
    const enMantenimiento = recursos.filter(r => r.estado === 'no_disponible').length;
    const enUsoAhora = recursosEnUsoIds.size;
    const disponibles = totalRecursos - enMantenimiento - enUsoAhora;
    const reservasActivas = reservas.filter(r => 
        (r.estado_nombre === 'Confirmada' || r.estado_nombre === 'Pendiente') &&
        new Date(r.fecha_fin) >= now
    ).length;
    
    // Global Stats
    document.getElementById('totalRecursos').textContent = totalRecursos;
    document.getElementById('recursosDisponibles').textContent = disponibles;
    document.getElementById('recursosNoDisponibles').textContent = enMantenimiento;
    document.getElementById('reservasActivas').textContent = reservasActivas;
    
    // Calcular porcentajes basados en proporciones actuales
    updateStatTrends(totalRecursos, disponibles, enMantenimiento, reservasActivas);
    
    // User Personal Stats (for non-admin users)
    if (currentUser && currentUser.rol !== 'admin') {
        updateUserStats();
    }
    
    // Admin Stats
    if (currentUser?.rol === 'admin') {
        updateAdminStats();
    }
}

function updateStatTrends(total, disponibles, enMantenimiento, reservasActivas) {
    // Porcentaje de disponibilidad (disponibles / total)
    const pctDisponibles = total > 0 ? Math.round((disponibles / total) * 100) : 0;
    
    // Porcentaje de ocupación (en uso o reservados)
    const enUso = total - disponibles - enMantenimiento;
    const pctOcupacion = total > 0 ? Math.round((enUso / total) * 100) : 0;
    
    // Porcentaje de reservas sobre recursos disponibles
    const pctReservas = disponibles > 0 ? Math.round((reservasActivas / total) * 100) : 0;
    
    // Porcentaje en mantenimiento
    const pctMantenimiento = total > 0 ? Math.round((enMantenimiento / total) * 100) : 0;
    
    // Actualizar UI
    updateTrendElement('trendRecursos', pctOcupacion, 'ocupación');
    updateTrendElement('trendDisponibles', pctDisponibles, 'disponible', true);
    updateTrendElement('trendReservas', pctReservas, 'activas');
    updateTrendElement('trendMantenimiento', pctMantenimiento, 'del total', false, true);
}

function updateTrendElement(id, value, label, positiveIsGood = false, negativeIsGood = false) {
    const element = document.getElementById(id);
    if (!element) return;
    
    let icon, className;
    
    if (value === 0) {
        icon = 'fa-minus';
        className = 'neutral';
    } else if (positiveIsGood) {
        // Para disponibilidad: alto es bueno (verde)
        icon = value >= 50 ? 'fa-arrow-up' : 'fa-arrow-down';
        className = value >= 50 ? 'positive' : 'negative';
    } else if (negativeIsGood) {
        // Para mantenimiento: bajo es bueno
        icon = value <= 10 ? 'fa-check' : 'fa-arrow-up';
        className = value <= 10 ? 'positive' : 'negative';
    } else {
        // Neutral - solo mostrar el valor
        icon = 'fa-chart-line';
        className = 'neutral';
    }
    
    element.className = `stat-trend ${className}`;
    element.innerHTML = `<i class="fas ${icon}"></i><span>${value}%</span>`;
    element.title = label;
}

function updateUserStats() {
    const myReservas = reservas.filter(r => r.id_usuario == currentUser.id_usuario);
    const now = new Date();
    
    // Mis reservas activas (confirmadas y en curso)
    const misReservasActivas = myReservas.filter(r => 
        (r.estado_nombre === 'Confirmada' || r.estado_nombre === 'Pendiente') && 
        new Date(r.fecha_fin) >= now
    ).length;
    
    // Total histórico
    const misReservasTotal = myReservas.length;
    
    // Pendientes de aprobación
    const misReservasPendientes = myReservas.filter(r => r.estado_nombre === 'Pendiente').length;
    
    // Recursos que estoy usando ahora mismo
    const recursosUsandoAhora = myReservas.filter(r => {
        const inicio = new Date(r.fecha_inicio);
        const fin = new Date(r.fecha_fin);
        return r.estado_nombre === 'Confirmada' && now >= inicio && now <= fin;
    }).length;
    
    // Update UI
    const el = (id, val) => { 
        const elem = document.getElementById(id);
        if (elem) elem.textContent = val;
    };
    
    el('misReservasActivas', misReservasActivas);
    el('misReservasTotal', misReservasTotal);
    el('misReservasPendientes', misReservasPendientes);
    el('recursosReservados', recursosUsandoAhora);
}

function updateAdminStats() {
    // Count pending reservations for admin badge
    const pendingCount = reservas.filter(r => r.estado_nombre === 'Pendiente').length;
    const pendingEl = document.getElementById('pendingCount');
    if (pendingEl) {
        pendingEl.textContent = pendingCount;
        pendingEl.style.display = pendingCount > 0 ? 'block' : 'none';
    }
}

// Toggle for user's own reservations
let showingMyReservas = false;

function toggleMisReservas(showMine) {
    showingMyReservas = showMine;
    
    // Update button states
    document.getElementById('btnTodasReservas')?.classList.toggle('active', !showMine);
    document.getElementById('btnMisReservas')?.classList.toggle('active', showMine);
    
    // Update table title
    const title = document.getElementById('reservasTableTitle');
    if (title) {
        title.textContent = showMine ? 'Mis Reservas' : 'Próximas Reservas';
    }
    
    // Re-render with filter
    renderProximasReservas();
}

function showPendingReservas() {
    showSection('reservas');
    document.getElementById('filterEstadoReserva').value = '1'; // Pendiente
    filterReservas();
    showToast('info', 'Mostrando reservas pendientes de aprobación');
}

function openMyProfile() {
    // Open a modal with user profile info
    if (!currentUser) return;
    
    showToast('info', `Perfil: ${currentUser.nombre} (${currentUser.email})`);
    // Could implement a full profile modal here
}

function loadActivityFeed() {
    const list = document.getElementById('activityList');
    
    // Generate activity from reservas
    const activities = reservas.slice(0, 5).map(r => {
        let icon, iconClass;
        switch(r.estado_nombre) {
            case 'Confirmada':
                icon = 'fa-check-circle';
                iconClass = 'success';
                break;
            case 'Pendiente':
                icon = 'fa-clock';
                iconClass = 'warning';
                break;
            case 'Cancelada':
                icon = 'fa-times-circle';
                iconClass = 'danger';
                break;
            default:
                icon = 'fa-info-circle';
                iconClass = 'info';
        }
        
        return `
            <li class="activity-item">
                <div class="activity-icon ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${r.usuario_nombre} - ${r.recurso_nombre}</div>
                    <div class="activity-time">${formatDate(r.fecha_inicio)}</div>
                </div>
            </li>
        `;
    }).join('');
    
    list.innerHTML = activities || '<li class="empty-state"><p>No hay actividad reciente</p></li>';
}

// ========================================
// CHARTS
// ========================================
function initCharts() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    
    initTiposRecursoChart();
    initEstadosReservaChart();
    initActividadSemanalChart();
    
    if (currentUser?.rol === 'admin') {
        initUsoRecursosChart();
        initActividadUsuariosChart();
        initHistoricoReservasChart();
    }
}

let currentChartType = 'doughnut';

function initTiposRecursoChart(chartType = null) {
    const ctx = document.getElementById('tiposRecursoChart');
    if (!ctx) return;
    
    if (chartType) currentChartType = chartType;
    
    const data = tiposRecurso.map(tipo => ({
        label: tipo.nombre,
        count: recursos.filter(r => r.id_tipo_recurso == tipo.id_tipo_recurso).length
    }));
    
    if (tiposRecursoChart) tiposRecursoChart.destroy();
    
    tiposRecursoChart = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: [
                    'rgba(99, 102, 241, 1)',
                    'rgba(14, 165, 233, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            cutout: currentChartType === 'doughnut' ? '60%' : '0%'
        }
    });
}

function toggleChartType(type, button) {
    // Actualizar botones activos
    document.querySelectorAll('.btn-chart-action').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Recrear gráfico con nuevo tipo
    initTiposRecursoChart(type);
}

function initEstadosReservaChart() {
    const ctx = document.getElementById('estadosReservaChart');
    if (!ctx) return;
    
    const data = estadosReserva.map(estado => ({
        label: estado.nombre,
        count: reservas.filter(r => r.id_estado_reserva == estado.id_estado_reserva).length
    }));
    
    if (estadosReservaChart) estadosReservaChart.destroy();
    
    estadosReservaChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Reservas',
                data: data.map(d => d.count),
                backgroundColor: [
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(245, 158, 11, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function initActividadSemanalChart() {
    const ctx = document.getElementById('actividadSemanalChart');
    if (!ctx) return;
    
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const data = days.map(() => Math.floor(Math.random() * 10) + 1);
    
    if (actividadSemanalChart) actividadSemanalChart.destroy();
    
    actividadSemanalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Reservas',
                data: data,
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 2
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function initUsoRecursosChart() {
    const ctx = document.getElementById('usoRecursosChart');
    if (!ctx) return;
    
    const topRecursos = recursos.slice(0, 5).map(r => ({
        nombre: r.nombre.substring(0, 20),
        uso: reservas.filter(res => res.id_recurso == r.id_recurso).length
    }));
    
    if (usoRecursosChart) usoRecursosChart.destroy();
    
    usoRecursosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topRecursos.map(r => r.nombre),
            datasets: [{
                label: 'Reservas',
                data: topRecursos.map(r => r.uso),
                backgroundColor: 'rgba(14, 165, 233, 0.8)',
                borderColor: 'rgba(14, 165, 233, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function initActividadUsuariosChart() {
    const ctx = document.getElementById('actividadUsuariosChart');
    if (!ctx) return;
    
    const usuariosData = usuarios.map(u => ({
        nombre: u.nombre,
        reservas: reservas.filter(r => r.id_usuario == u.id_usuario).length
    }));
    
    if (actividadUsuariosChart) actividadUsuariosChart.destroy();
    
    actividadUsuariosChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: usuariosData.map(u => u.nombre),
            datasets: [{
                data: usuariosData.map(u => u.reservas),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(14, 165, 233, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

function initHistoricoReservasChart() {
    const ctx = document.getElementById('historicoReservasChart');
    if (!ctx) return;
    
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    
    if (historicoReservasChart) historicoReservasChart.destroy();
    
    historicoReservasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Confirmadas',
                    data: [12, 19, 15, 25, 22, 30],
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Pendientes',
                    data: [5, 8, 6, 10, 7, 12],
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Canceladas',
                    data: [2, 3, 1, 4, 2, 3],
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ========================================
// RECURSOS
// ========================================
function renderRecursos(filteredData = null) {
    const grid = document.getElementById('recursosGrid');
    const data = filteredData || recursos;
    
    if (!data || data.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No hay recursos</h3>
                <p>No se encontraron recursos con los filtros seleccionados</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = data.map(recurso => {
        const tipoNombre = recurso.tipo_nombre || 'Sala';
        const tipoNombreNorm = tipoNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let icon, tipoClass;
        
        switch(tipoNombreNorm) {
            case 'sala': 
                icon = 'fa-door-open'; 
                tipoClass = 'sala';
                break;
            case 'portatil': 
                icon = 'fa-laptop'; 
                tipoClass = 'portatil';
                break;
            case 'proyector': 
                icon = 'fa-video'; 
                tipoClass = 'proyector';
                break;
            default: 
                icon = 'fa-cube';
                tipoClass = 'sala';
        }
        
        // Default images by type
        let defaultImage = '';
        switch(tipoNombreNorm) {
            case 'sala': 
                defaultImage = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400';
                break;
            case 'portatil': 
                defaultImage = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400';
                break;
            case 'proyector': 
                defaultImage = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400';
                break;
            default:
                defaultImage = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400';
        }
        
        const imageUrl = recurso.foto_url || defaultImage;
        
        return `
            <div class="recurso-card ${tipoClass}" data-id="${recurso.id_recurso}" onclick="showRecursoDetail(${recurso.id_recurso})">
                <div class="recurso-image">
                    <img src="${imageUrl}" alt="${recurso.nombre}" onerror="this.src='${defaultImage}'">
                </div>
                <div class="recurso-header">
                    <div class="recurso-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <span class="status-badge ${recurso.estado}">
                        ${recurso.estado === 'disponible' ? 'Disponible' : 'No Disponible'}
                    </span>
                </div>
                <h3 class="recurso-name">${recurso.nombre}</h3>
                <p class="recurso-type">${tipoNombre}</p>
                <div class="recurso-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${recurso.ubicacion || 'Sin ubicación'}</span>
                </div>
                <div class="recurso-footer">
                    <div class="recurso-actions" onclick="event.stopPropagation()">
                        ${recurso.estado === 'disponible' ? `
                            <button class="btn-action" onclick="reservarRecurso(${recurso.id_recurso})" title="Reservar">
                                <i class="fas fa-calendar-plus"></i>
                            </button>
                        ` : ''}
                        <button class="btn-action edit admin-only" onclick="editRecurso(${recurso.id_recurso})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action delete admin-only" onclick="deleteRecurso(${recurso.id_recurso})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterRecursos() {
    const tipoFilter = document.getElementById('filterTipoRecurso').value;
    const estadoFilter = document.getElementById('filterEstadoRecurso').value;
    
    let filtered = recursos;
    
    if (tipoFilter) {
        filtered = filtered.filter(r => r.id_tipo_recurso == tipoFilter);
    }
    
    if (estadoFilter) {
        filtered = filtered.filter(r => r.estado === estadoFilter);
    }
    
    renderRecursos(filtered);
}

function openNewRecursoModal() {
    if (currentUser?.rol !== 'admin') {
        showToast('error', 'Solo los administradores pueden crear recursos');
        return;
    }
    document.getElementById('recursoModalTitle').textContent = 'Nuevo Recurso';
    document.getElementById('recursoForm').reset();
    document.getElementById('recursoId').value = '';
    openModal('recursoModal');
}

function editRecurso(id) {
    if (currentUser?.rol !== 'admin') {
        showToast('error', 'Solo los administradores pueden editar recursos');
        return;
    }
    const recurso = recursos.find(r => r.id_recurso == id);
    if (!recurso) return;
    
    document.getElementById('recursoModalTitle').textContent = 'Editar Recurso';
    document.getElementById('recursoId').value = recurso.id_recurso;
    document.getElementById('recursoNombre').value = recurso.nombre;
    document.getElementById('recursoTipo').value = recurso.id_tipo_recurso;
    document.getElementById('recursoEstado').value = recurso.estado;
    document.getElementById('recursoUbicacion').value = recurso.ubicacion || '';
    document.getElementById('recursoFoto').value = recurso.foto_url || '';
    document.getElementById('recursoDescripcion').value = recurso.descripcion || '';
    
    openModal('recursoModal');
}

async function handleRecursoSubmit(e) {
    e.preventDefault();
    
    if (currentUser?.rol !== 'admin') {
        showToast('error', 'Solo los administradores pueden gestionar recursos');
        return;
    }
    
    const id = document.getElementById('recursoId').value;
    const data = {
        nombre: document.getElementById('recursoNombre').value,
        id_tipo_recurso: document.getElementById('recursoTipo').value,
        estado: document.getElementById('recursoEstado').value,
        ubicacion: document.getElementById('recursoUbicacion').value,
        foto_url: document.getElementById('recursoFoto').value,
        descripcion: document.getElementById('recursoDescripcion').value
    };
    
    try {
        const response = await fetch(`${API_BASE}recursos.php`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(id ? { ...data, id_recurso: id } : data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', id ? 'Recurso actualizado' : 'Recurso creado');
            closeModal('recursoModal');
            await loadRecursos();
            updateDashboard();
            updateBuildingMap();
            initCharts();
        } else {
            showToast('error', result.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

async function deleteRecurso(id) {
    if (currentUser?.rol !== 'admin') {
        showToast('error', 'Solo los administradores pueden eliminar recursos');
        return;
    }
    
    const recurso = recursos.find(r => r.id_recurso == id);
    const confirmed = await showConfirm({
        title: '¿Eliminar este recurso?',
        message: `Se eliminará permanentemente "${recurso?.nombre || 'el recurso'}". Esta acción no se puede deshacer.`,
        type: 'danger',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE}recursos.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_recurso: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', 'Recurso eliminado');
            await loadRecursos();
            updateDashboard();
            updateBuildingMap();
            initCharts();
        } else {
            showToast('error', result.message || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

// ========================================
// RESERVAS
// ========================================
function renderReservas(filteredData = null) {
    const timeline = document.getElementById('reservasTimeline');
    const data = filteredData || reservas;
    
    if (!data || data.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No hay reservas</h3>
                <p>No se encontraron reservas con los filtros seleccionados</p>
            </div>
        `;
        return;
    }
    
    timeline.innerHTML = data.map(reserva => {
        const fecha = new Date(reserva.fecha_inicio);
        const fechaFin = new Date(reserva.fecha_fin);
        const now = new Date();
        const day = fecha.getDate();
        const month = fecha.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
        const isMyReserva = currentUser && reserva.id_usuario == currentUser.id_usuario;
        const isPast = fechaFin < now;
        
        let cardClass = 'reserva-card';
        if (isMyReserva) cardClass += ' my-reserva';
        if (isPast) cardClass += ' pasado';
        
        // Determine display status
        const displayStatus = isPast ? 'Pasado' : reserva.estado_nombre;
        const statusClass = isPast ? 'pasado' : reserva.estado_nombre.toLowerCase();
        
        return `
            <div class="${cardClass}" data-id="${reserva.id_reserva}">
                <div class="reserva-date">
                    <span class="reserva-day">${day}</span>
                    <span class="reserva-month">${month}</span>
                </div>
                <div class="reserva-info">
                    <h3 class="reserva-recurso">
                        ${reserva.recurso_nombre}
                        ${isMyReserva ? '<span class="my-tag">Tu reserva</span>' : ''}
                    </h3>
                    <p class="reserva-usuario"><i class="fas fa-user"></i> ${reserva.usuario_nombre}</p>
                    <div class="reserva-time">
                        <i class="fas fa-clock"></i>
                        <span>${formatTime(reserva.fecha_inicio)} - ${formatTime(reserva.fecha_fin)}</span>
                    </div>
                </div>
                <div class="reserva-status">
                    <span class="status-badge ${statusClass}">${displayStatus}</span>
                </div>
                <div class="reserva-actions">
                    ${!isPast && reserva.estado_nombre === 'Pendiente' && currentUser?.rol === 'admin' ? `
                        <button class="btn-action confirm" onclick="confirmarReserva(${reserva.id_reserva})" title="Confirmar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-action danger" onclick="rechazarReserva(${reserva.id_reserva})" title="Rechazar">
                            <i class="fas fa-ban"></i>
                        </button>
                    ` : ''}
                    ${!isPast && (isMyReserva || currentUser?.rol === 'admin') && reserva.estado_nombre !== 'Cancelada' ? `
                        <button class="btn-action delete" onclick="cancelarReserva(${reserva.id_reserva})" title="Cancelar">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderProximasReservas() {
    const table = document.getElementById('proximasReservasTable');
    
    let proximas = reservas
        .filter(r => new Date(r.fecha_inicio) >= new Date() && r.estado_nombre !== 'Cancelada');
    
    // Filter by current user if "Mis Reservas" is selected
    if (showingMyReservas && currentUser) {
        proximas = proximas.filter(r => r.id_usuario == currentUser.id_usuario);
    }
    
    proximas = proximas.slice(0, 10);
    
    if (proximas.length === 0) {
        const message = showingMyReservas 
            ? 'No tienes reservas próximas' 
            : 'No hay reservas próximas';
        table.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="padding: 40px;">
                    <i class="fas fa-calendar-check" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 12px; display: block;"></i>
                    <p style="color: var(--text-secondary);">${message}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = proximas.map(reserva => {
        const isMyReserva = currentUser && reserva.id_usuario == currentUser.id_usuario;
        const rowClass = isMyReserva ? 'my-reserva-row' : '';
        
        return `
            <tr class="${rowClass}">
                <td>
                    <strong>${reserva.recurso_nombre}</strong>
                    ${isMyReserva ? '<span class="my-badge">Tuya</span>' : ''}
                </td>
                <td>${reserva.usuario_nombre}</td>
                <td>${formatDateTime(reserva.fecha_inicio)}</td>
                <td>${formatDateTime(reserva.fecha_fin)}</td>
                <td><span class="status-badge ${reserva.estado_nombre.toLowerCase()}">${reserva.estado_nombre}</span></td>
                <td>
                    <div class="action-buttons">
                        ${reserva.estado_nombre === 'Pendiente' && currentUser?.rol === 'admin' ? `
                            <button class="btn-action confirm" onclick="confirmarReserva(${reserva.id_reserva})" title="Confirmar">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${(isMyReserva || currentUser?.rol === 'admin') && reserva.estado_nombre !== 'Cancelada' ? `
                            <button class="btn-action delete" onclick="cancelarReserva(${reserva.id_reserva})" title="Cancelar">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterReservas() {
    const estadoFilter = document.getElementById('filterEstadoReserva').value;
    const fechaFilter = document.getElementById('filterFechaReserva').value;
    
    let filtered = reservas;
    
    if (estadoFilter) {
        filtered = filtered.filter(r => r.id_estado_reserva == estadoFilter);
    }
    
    if (fechaFilter) {
        filtered = filtered.filter(r => {
            const reservaDate = new Date(r.fecha_inicio).toISOString().split('T')[0];
            return reservaDate === fechaFilter;
        });
    }
    
    renderReservas(filtered);
}

function openNewReservaModal() {
    document.getElementById('reservaModalTitle').textContent = 'Nueva Reserva';
    document.getElementById('reservaForm').reset();
    document.getElementById('reservaId').value = '';
    
    // Set default date to today
    const now = new Date();
    document.getElementById('reservaFecha').value = now.toISOString().split('T')[0];
    
    // Populate hour selects
    populateHourSelects();
    
    // Set default hours
    const currentHour = now.getHours();
    const defaultStart = Math.max(8, Math.min(currentHour + 1, 19));
    const defaultEnd = Math.min(defaultStart + 2, 20);
    
    document.getElementById('reservaHoraInicio').value = defaultStart;
    document.getElementById('reservaHoraFin').value = defaultEnd;
    
    // Reset schedule grid
    document.getElementById('scheduleGrid').innerHTML = `
        <div class="schedule-placeholder">
            <i class="fas fa-calendar-alt"></i>
            <p>Selecciona un recurso y fecha</p>
        </div>
    `;
    
    // Reset availability indicator
    const indicator = document.getElementById('availabilityIndicator');
    indicator.classList.add('hidden');
    
    // Enable save button
    const btnGuardar = document.getElementById('btnGuardarReserva');
    btnGuardar.disabled = false;
    btnGuardar.classList.remove('btn-disabled');
    
    openModal('reservaModal');
}

function populateHourSelects() {
    const horaInicio = document.getElementById('reservaHoraInicio');
    const horaFin = document.getElementById('reservaHoraFin');
    
    if (!horaInicio || !horaFin) {
        console.error('Hour select elements not found');
        return;
    }
    
    let inicioOptions = '';
    let finOptions = '';
    
    for (let h = 8; h <= 19; h++) {
        inicioOptions += `<option value="${h}">${String(h).padStart(2, '0')}:00</option>`;
    }
    
    for (let h = 9; h <= 20; h++) {
        finOptions += `<option value="${h}">${String(h).padStart(2, '0')}:00</option>`;
    }
    
    horaInicio.innerHTML = inicioOptions;
    horaFin.innerHTML = finOptions;
    
    console.log('Hour selects populated:', horaInicio.options.length, horaFin.options.length);
}

function onRecursoChange() {
    loadDaySchedule();
    checkReservaAvailability();
}

async function loadDaySchedule() {
    const recursoId = document.getElementById('reservaRecurso').value;
    const fecha = document.getElementById('reservaFecha').value;
    const grid = document.getElementById('scheduleGrid');
    
    if (!recursoId || !fecha) {
        grid.innerHTML = `
            <div class="schedule-placeholder">
                <i class="fas fa-calendar-alt"></i>
                <p>Selecciona un recurso y fecha</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = `
        <div class="schedule-loading">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}reservas.php?action=get_day_schedule&recurso_id=${recursoId}&fecha=${fecha}`);
        const data = await response.json();
        
        if (data.success) {
            renderScheduleGrid(data.data.schedule);
        } else {
            grid.innerHTML = `
                <div class="schedule-placeholder">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error al cargar horarios</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
        grid.innerHTML = `
            <div class="schedule-placeholder">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error de conexión</p>
            </div>
        `;
    }
}

function renderScheduleGrid(schedule) {
    const grid = document.getElementById('scheduleGrid');
    
    grid.innerHTML = schedule.map(slot => {
        const hourStr = `${String(slot.hour).padStart(2, '0')}:00 - ${String(slot.hour + 1).padStart(2, '0')}:00`;
        let statusText = 'Libre';
        let info = '';
        
        if (slot.status === 'pending') {
            statusText = 'Pendiente';
            info = slot.reserva?.usuario || '';
        } else if (slot.status === 'confirmed') {
            statusText = 'Ocupado';
            info = slot.reserva?.usuario || '';
        }
        
        return `
            <div class="schedule-slot ${slot.status}" onclick="selectTimeSlot(${slot.hour})" title="${info ? info : 'Clic para seleccionar'}">
                <span class="schedule-slot-hour">${hourStr}</span>
                <div class="schedule-slot-status">
                    <span class="schedule-slot-indicator"></span>
                    <span>${statusText}</span>
                </div>
                ${info ? `<span class="schedule-slot-info">${info}</span>` : ''}
            </div>
        `;
    }).join('');
}

function selectTimeSlot(hour) {
    const slot = document.querySelector(`.schedule-slot[onclick="selectTimeSlot(${hour})"]`);
    
    // Only allow selecting available slots
    if (slot && slot.classList.contains('available')) {
        document.getElementById('reservaHoraInicio').value = hour;
        document.getElementById('reservaHoraFin').value = Math.min(hour + 1, 20);
        checkReservaAvailability();
        
        showToast('info', `Horario ${String(hour).padStart(2, '0')}:00 seleccionado`);
    } else if (slot) {
        showToast('warning', 'Este horario ya está ocupado');
    }
}

function reservarRecurso(id) {
    openNewReservaModal();
    document.getElementById('reservaRecurso').value = id;
    onRecursoChange();
}

// Construir datetime desde fecha + hora
function buildDateTime() {
    const fecha = document.getElementById('reservaFecha').value;
    const horaInicio = document.getElementById('reservaHoraInicio').value;
    const horaFin = document.getElementById('reservaHoraFin').value;
    
    if (fecha && horaInicio && horaFin) {
        document.getElementById('reservaInicio').value = `${fecha}T${String(horaInicio).padStart(2, '0')}:00`;
        document.getElementById('reservaFin').value = `${fecha}T${String(horaFin).padStart(2, '0')}:00`;
    }
}

// Verificación de disponibilidad en tiempo real (AJAX)
let availabilityTimeout = null;
let lastAvailabilityCheck = { recurso: null, inicio: null, fin: null };

async function checkReservaAvailability() {
    // Build datetime from date + hour
    buildDateTime();
    
    const recursoId = document.getElementById('reservaRecurso').value;
    const fechaInicio = document.getElementById('reservaInicio').value;
    const fechaFin = document.getElementById('reservaFin').value;
    const reservaId = document.getElementById('reservaId').value;
    
    const indicator = document.getElementById('availabilityIndicator');
    const checking = indicator.querySelector('.availability-checking');
    const available = indicator.querySelector('.availability-available');
    const conflict = indicator.querySelector('.availability-conflict');
    const conflictMsg = indicator.querySelector('.conflict-message');
    const btnGuardar = document.getElementById('btnGuardarReserva');
    
    // Ocultar si no hay datos suficientes
    if (!recursoId || !fechaInicio || !fechaFin) {
        indicator.classList.add('hidden');
        return;
    }
    
    // Validar que hora fin > hora inicio
    const horaInicio = parseInt(document.getElementById('reservaHoraInicio').value);
    const horaFin = parseInt(document.getElementById('reservaHoraFin').value);
    
    if (horaFin <= horaInicio) {
        indicator.classList.remove('hidden');
        checking.classList.remove('active');
        available.classList.remove('active');
        conflict.classList.add('active');
        conflictMsg.innerHTML = '<strong>La hora de fin debe ser posterior a la de inicio</strong>';
        btnGuardar.disabled = true;
        btnGuardar.classList.add('btn-disabled');
        return;
    }
    
    // Evitar llamadas duplicadas
    const checkKey = `${recursoId}-${fechaInicio}-${fechaFin}`;
    if (checkKey === `${lastAvailabilityCheck.recurso}-${lastAvailabilityCheck.inicio}-${lastAvailabilityCheck.fin}`) {
        return;
    }
    lastAvailabilityCheck = { recurso: recursoId, inicio: fechaInicio, fin: fechaFin };
    
    // Debounce
    if (availabilityTimeout) clearTimeout(availabilityTimeout);
    
    // Mostrar estado "checking"
    indicator.classList.remove('hidden');
    checking.classList.add('active');
    available.classList.remove('active');
    conflict.classList.remove('active');
    
    availabilityTimeout = setTimeout(async () => {
        try {
            let url = `${API_BASE}reservas.php?action=check_availability&recurso_id=${recursoId}&fecha_inicio=${encodeURIComponent(fechaInicio)}&fecha_fin=${encodeURIComponent(fechaFin)}`;
            if (reservaId) url += `&exclude_id=${reservaId}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            checking.classList.remove('active');
            
            if (data.success && data.data.available) {
                available.classList.add('active');
                conflict.classList.remove('active');
                btnGuardar.disabled = false;
                btnGuardar.classList.remove('btn-disabled');
            } else {
                available.classList.remove('active');
                conflict.classList.add('active');
                
                // Mostrar mensaje detallado
                if (data.data?.conflict) {
                    const c = data.data.conflict;
                    const inicio = new Date(c.inicio).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                    const fin = new Date(c.fin).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                    conflictMsg.innerHTML = `<strong>${data.data.reason}</strong><br>${c.usuario}: ${inicio} - ${fin}`;
                } else {
                    conflictMsg.textContent = data.data?.reason || data.message || 'Recurso no disponible';
                }
                
                btnGuardar.disabled = true;
                btnGuardar.classList.add('btn-disabled');
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            checking.classList.remove('active');
            indicator.classList.add('hidden');
        }
    }, 300);
}

async function handleReservaSubmit(e) {
    e.preventDefault();
    
    // Build datetime from date + hour before submitting
    buildDateTime();
    
    const id = document.getElementById('reservaId').value;
    const fechaInicio = document.getElementById('reservaInicio').value;
    const fechaFin = document.getElementById('reservaFin').value;
    
    // Validate times
    if (!fechaInicio || !fechaFin) {
        showToast('error', 'Selecciona fecha y horario');
        return;
    }
    
    const data = {
        id_recurso: document.getElementById('reservaRecurso').value,
        id_usuario: currentUser.id_usuario,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        id_estado_reserva: 1 // Pendiente
    };
    
    // Validate dates
    if (new Date(data.fecha_fin) <= new Date(data.fecha_inicio)) {
        showToast('error', 'La hora de fin debe ser posterior a la de inicio');
        return;
    }
    
    // Double-check availability before submit
    const btnGuardar = document.getElementById('btnGuardarReserva');
    if (btnGuardar.disabled) {
        showToast('error', 'El recurso no está disponible en este horario');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}reservas.php`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(id ? { ...data, id_reserva: id } : data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', id ? 'Reserva actualizada' : 'Reserva creada');
            closeModal('reservaModal');
            await loadReservas();
            updateDashboard();
            loadActivityFeed();
            initCharts();
            updateNotificationBadge();
        } else {
            showToast('error', result.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

async function confirmarReserva(id) {
    if (currentUser?.rol !== 'admin') {
        showToast('error', 'Solo los administradores pueden confirmar reservas');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}reservas.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_reserva: id, id_estado_reserva: 2 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', 'Reserva confirmada');
            await loadReservas();
            updateDashboard();
            loadActivityFeed();
            initCharts();
        } else {
            showToast('error', result.message || 'Error al confirmar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

async function rechazarReserva(id) {
    if (currentUser?.rol !== 'admin') {
        showToast('error', 'Solo los administradores pueden rechazar reservas');
        return;
    }
    
    const reserva = reservas.find(r => r.id_reserva == id);
    const confirmed = await showConfirm({
        title: '¿Rechazar esta reserva?',
        message: `Se rechazará la reserva de "${reserva?.recurso_nombre || 'recurso'}" solicitada por ${reserva?.usuario_nombre || 'usuario'}.`,
        type: 'danger',
        confirmText: 'Sí, rechazar',
        cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE}reservas.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_reserva: id, id_estado_reserva: 3 }) // Cancelada/Rechazada
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', 'Reserva rechazada');
            await loadReservas();
            updateDashboard();
            loadActivityFeed();
            initCharts();
        } else {
            showToast('error', result.message || 'Error al rechazar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

async function cancelarReserva(id) {
    // Find the reservation to check ownership
    const reserva = reservas.find(r => r.id_reserva == id);
    
    if (!reserva) {
        showToast('error', 'Reserva no encontrada');
        return;
    }
    
    // Check if user can cancel
    const isOwner = currentUser && reserva.id_usuario == currentUser.id_usuario;
    const isAdmin = currentUser?.rol === 'admin';
    
    if (!isOwner && !isAdmin) {
        showToast('error', 'No tienes permiso para cancelar esta reserva');
        return;
    }
    
    const confirmed = await showConfirm({
        title: '¿Cancelar esta reserva?',
        message: `Se cancelará la reserva de "${reserva.recurso_nombre}" para ${reserva.usuario_nombre}.`,
        type: 'danger',
        confirmText: 'Sí, cancelar',
        cancelText: 'No, mantener'
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE}reservas.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_reserva: id, id_estado_reserva: 3 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', 'Reserva cancelada');
            await loadReservas();
            updateDashboard();
            loadActivityFeed();
            initCharts();
        } else {
            showToast('error', result.message || 'Error al cancelar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

// ========================================
// USUARIOS
// ========================================
function renderUsuarios() {
    const table = document.getElementById('usuariosTable');
    
    if (usuarios.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="padding: 40px;">
                    <i class="fas fa-users" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 12px;"></i>
                    <p style="color: var(--text-secondary);">No hay usuarios</p>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = usuarios.map(usuario => {
        const avatarHtml = usuario.foto_url 
            ? `<img src="${usuario.foto_url}" alt="${usuario.nombre}">`
            : `<div class="user-avatar-small"><i class="fas fa-user"></i></div>`;
        
        const rolBadgeClass = usuario.rol === 'admin' ? 'admin' : '';
        
        return `
            <tr>
                <td>${usuario.id_usuario}</td>
                <td>
                    <div class="user-cell">
                        ${avatarHtml}
                        <strong>${usuario.nombre}</strong>
                    </div>
                </td>
                <td>${usuario.email}</td>
                <td><span class="role-badge ${rolBadgeClass}">${usuario.rol.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action edit" onclick="editUsuario(${usuario.id_usuario})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${usuario.id_usuario !== currentUser?.id_usuario ? `
                            <button class="btn-action delete" onclick="deleteUsuario(${usuario.id_usuario})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openNewUsuarioModal() {
    document.getElementById('usuarioModalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('usuarioForm').reset();
    document.getElementById('usuarioId').value = '';
    document.getElementById('usuarioPassword').required = true;
    openModal('usuarioModal');
}

function editUsuario(id) {
    const usuario = usuarios.find(u => u.id_usuario == id);
    if (!usuario) return;
    
    document.getElementById('usuarioModalTitle').textContent = 'Editar Usuario';
    document.getElementById('usuarioId').value = usuario.id_usuario;
    document.getElementById('usuarioNombre').value = usuario.nombre;
    document.getElementById('usuarioEmail').value = usuario.email;
    document.getElementById('usuarioPassword').value = '';
    document.getElementById('usuarioPassword').required = false;
    document.getElementById('usuarioRol').value = usuario.rol;
    
    openModal('usuarioModal');
}

async function handleUsuarioSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('usuarioId').value;
    const data = {
        nombre: document.getElementById('usuarioNombre').value,
        email: document.getElementById('usuarioEmail').value,
        rol: document.getElementById('usuarioRol').value
    };
    
    const password = document.getElementById('usuarioPassword').value;
    if (password) {
        data.password = password;
    }
    
    try {
        const response = await fetch(`${API_BASE}usuarios.php`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(id ? { ...data, id_usuario: id } : data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', id ? 'Usuario actualizado' : 'Usuario creado');
            closeModal('usuarioModal');
            await loadUsuarios();
        } else {
            showToast('error', result.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

async function deleteUsuario(id) {
    const usuario = usuarios.find(u => u.id_usuario == id);
    const confirmed = await showConfirm({
        title: '¿Eliminar este usuario?',
        message: `Se eliminará permanentemente a "${usuario?.nombre || 'el usuario'}". Esta acción no se puede deshacer.`,
        type: 'danger',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE}usuarios.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('success', 'Usuario eliminado');
            await loadUsuarios();
        } else {
            showToast('error', result.message || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

// ========================================
// BUILDING MAP
// ========================================
function updateBuildingMap() {
    // Map ubicaciones to room IDs
    const ubicacionMap = {
        'Almacén IT': 'almacen-it',
        'Taller IT': 'taller-it',
        'Oficina CEO': 'oficina-ceo',
        'Oficina 1': 'oficina-1',
        'Oficina 2': 'oficina-2',
        'Oficina 3': 'oficina-3',
        'Oficina 4': 'oficina-4',
        'Oficina 5': 'oficina-5',
        'Sala Juntas Principal': 'sala-juntas',
        'Sala Reuniones Pequeña': 'sala-reuniones',
        'Sala Formación': 'sala-formacion',
        'Sala Videoconferencia': 'sala-video'
    };
    
    // Clear all resource containers
    Object.values(ubicacionMap).forEach(roomId => {
        const container = document.getElementById(`resources-${roomId}`);
        if (container) container.innerHTML = '';
    });
    
    // Add resources to their locations
    recursos.forEach(recurso => {
        let roomId = ubicacionMap[recurso.ubicacion];
        
        // Special case for salas (they are the resource itself)
        if (!roomId && recurso.tipo_nombre === 'Sala') {
            if (recurso.nombre.includes('Juntas')) roomId = 'sala-juntas';
            else if (recurso.nombre.includes('Pequeña')) roomId = 'sala-reuniones';
            else if (recurso.nombre.includes('Formación')) roomId = 'sala-formacion';
            else if (recurso.nombre.includes('Videoconferencia')) roomId = 'sala-video';
        }
        
        if (!roomId) return;
        
        const container = document.getElementById(`resources-${roomId}`);
        if (!container) return;
        
        // Check if resource is currently in use
        const now = new Date();
        const isInUse = reservas.some(r => 
            r.id_recurso == recurso.id_recurso &&
            r.estado_nombre === 'Confirmada' &&
            new Date(r.fecha_inicio) <= now &&
            new Date(r.fecha_fin) >= now
        );
        
        let statusClass = recurso.estado === 'disponible' ? 
            (isInUse ? 'en-uso' : 'disponible') : 'no_disponible';
        
        let icon;
        switch(recurso.tipo_nombre) {
            case 'Sala': icon = 'fa-door-open'; break;
            case 'Portátil': icon = 'fa-laptop'; break;
            case 'Proyector': icon = 'fa-video'; break;
            default: icon = 'fa-cube';
        }
        
        container.innerHTML += `
            <span class="resource-tag ${statusClass}" title="${recurso.nombre}">
                <i class="fas ${icon}"></i>
                ${recurso.nombre.substring(0, 15)}...
            </span>
        `;
    });
}

// ========================================
// NAVIGATION
// ========================================
function showSection(sectionName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });
    
    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update breadcrumb
    const sectionNames = {
        dashboard: 'Dashboard',
        recursos: 'Recursos',
        reservas: 'Reservas',
        calendario: 'Calendario',
        mapa: 'Mapa del Edificio',
        usuarios: 'Usuarios',
        reportes: 'Reportes'
    };
    const breadcrumb = document.getElementById('currentSection');
    if (breadcrumb) {
        breadcrumb.textContent = sectionNames[sectionName] || sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    }
    
    // Initialize calendar when opening that section
    if (sectionName === 'calendario') {
        initWeekCalendar();
    }
    
    // Close sidebar on mobile
    document.querySelector('.sidebar').classList.remove('open');
}

// ========================================
// MODALS
// ========================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ========================================
// CUSTOM CONFIRM DIALOG
// ========================================
function showConfirm(options) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const iconEl = document.getElementById('confirmIcon');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const acceptBtn = document.getElementById('confirmAccept');
        const cancelBtn = document.getElementById('confirmCancel');
        
        // Configurar contenido
        titleEl.textContent = options.title || '¿Estás seguro?';
        messageEl.textContent = options.message || 'Esta acción no se puede deshacer.';
        
        // Configurar icono y tipo
        const type = options.type || 'warning';
        const icons = {
            warning: 'fa-exclamation-triangle',
            danger: 'fa-trash-alt',
            info: 'fa-question-circle',
            success: 'fa-check-circle'
        };
        iconEl.className = `confirm-icon ${type}`;
        iconEl.innerHTML = `<i class="fas ${icons[type]}"></i>`;
        
        // Configurar botón de aceptar
        acceptBtn.className = `btn ${options.type === 'danger' ? 'btn-danger' : 'btn-primary'}`;
        acceptBtn.innerHTML = `<i class="fas fa-check"></i> ${options.confirmText || 'Confirmar'}`;
        
        // Configurar botón de cancelar
        cancelBtn.innerHTML = `<i class="fas fa-times"></i> ${options.cancelText || 'Cancelar'}`;
        
        // Limpiar listeners anteriores
        const newAcceptBtn = acceptBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Agregar listeners
        newAcceptBtn.addEventListener('click', () => {
            closeModal('confirmModal');
            resolve(true);
        });
        
        newCancelBtn.addEventListener('click', () => {
            closeModal('confirmModal');
            resolve(false);
        });
        
        // Mostrar modal
        openModal('confirmModal');
    });
}

// ========================================
// TOASTS
// ========================================
function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION);
}

// ========================================
// UTILITIES
// ========================================
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

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

function handleGlobalSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query) {
        resultsContainer.classList.remove('active');
        return;
    }
    
    // Search in recursos
    const filteredRecursos = recursos.filter(r => 
        r.nombre.toLowerCase().includes(query) ||
        r.ubicacion?.toLowerCase().includes(query) ||
        r.tipo_nombre?.toLowerCase().includes(query)
    ).slice(0, 8);
    
    if (filteredRecursos.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <span>No se encontraron recursos</span>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = filteredRecursos.map(r => `
            <div class="search-result-item" onclick="goToRecurso(${r.id_recurso})">
                <div class="search-result-icon">
                    <i class="fas fa-${getRecursoIcon(r.tipo_nombre)}"></i>
                </div>
                <div class="search-result-info">
                    <span class="search-result-name">${r.nombre}</span>
                    <span class="search-result-meta">${r.tipo_nombre} · ${r.estado === 'disponible' ? 'Disponible' : 'No disponible'}</span>
                </div>
            </div>
        `).join('');
    }
    
    resultsContainer.classList.add('active');
}

function getRecursoIcon(tipoNombre) {
    const tipo = (tipoNombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    switch(tipo) {
        case 'sala': return 'door-open';
        case 'portatil': return 'laptop';
        case 'proyector': return 'video';
        default: return 'cube';
    }
}

function goToRecurso(id) {
    // Close search
    document.getElementById('globalSearch').value = '';
    document.getElementById('searchResults').classList.remove('active');
    
    // Navigate to recursos section
    showSection('recursosSection');
    
    // Highlight the resource
    setTimeout(() => {
        const card = document.querySelector(`.recurso-card[data-id="${id}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlight');
            setTimeout(() => card.classList.remove('highlight'), 2000);
        }
        // Also open detail modal
        showRecursoDetail(id);
    }, 100);
}

// Close search results on click outside
document.addEventListener('click', (e) => {
    const searchBox = document.querySelector('.search-box');
    if (searchBox && !searchBox.contains(e.target)) {
        document.getElementById('searchResults')?.classList.remove('active');
    }
});

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const icon = document.querySelector('#themeToggle i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
}

// ========================================
// WEEK CALENDAR
// ========================================
let calendarCurrentWeekStart = null;

function initWeekCalendar() {
    try {
        console.log('initWeekCalendar called');
        // Set current week
        const today = new Date();
        calendarCurrentWeekStart = getWeekStart(today);
        console.log('Week start set to:', calendarCurrentWeekStart);
        
        // Populate filter with resource types
        populateCalendarFilter();
        
        // Render calendar
        renderWeekCalendar();
    } catch (error) {
        console.error('Error in initWeekCalendar:', error);
    }
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
}

function navigateCalendar(direction) {
    calendarCurrentWeekStart.setDate(calendarCurrentWeekStart.getDate() + (direction * 7));
    renderWeekCalendar();
}

function goToToday() {
    calendarCurrentWeekStart = getWeekStart(new Date());
    renderWeekCalendar();
}

function populateCalendarFilter() {
    const filter = document.getElementById('filterCalendarTipo');
    if (!filter) return;
    
    // Get unique types
    const tipos = [...new Set(recursos.map(r => r.tipo_nombre))];
    
    filter.innerHTML = '<option value="">Todos los recursos</option>';
    tipos.forEach(tipo => {
        filter.innerHTML += `<option value="${tipo}">${tipo}</option>`;
    });
}

function renderWeekCalendar() {
    try {
        console.log('renderWeekCalendar called');
        const container = document.getElementById('weekCalendar');
        if (!container) {
            console.error('weekCalendar container not found');
            return;
        }
        
        // Ensure calendarCurrentWeekStart is initialized
        if (!calendarCurrentWeekStart) {
            console.log('Initializing calendarCurrentWeekStart');
            calendarCurrentWeekStart = getWeekStart(new Date());
        }
        
        console.log('calendarCurrentWeekStart:', calendarCurrentWeekStart);
        console.log('reservas count:', reservas.length);
        
        const filterTipo = document.getElementById('filterCalendarTipo')?.value || '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        // Update week label
        const weekEnd = new Date(calendarCurrentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const labelEl = document.getElementById('calendarWeekLabel');
        if (labelEl) {
            const startStr = calendarCurrentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            const endStr = weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            labelEl.textContent = `${startStr} - ${endStr}`;
        }
        
        // Build hours column
        let hoursHTML = '<div class="calendar-header-cell"></div>';
        for (let h = 8; h <= 20; h++) {
            hoursHTML += `<div class="calendar-hour-label">${String(h).padStart(2, '0')}:00</div>`;
        }
        
        // Build day columns
        let daysHTML = '';
        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(calendarCurrentWeekStart);
            dayDate.setDate(dayDate.getDate() + i);
            
            const isToday = dayDate.getTime() === today.getTime();
            const dayName = dayNames[i];
            const dayNumber = dayDate.getDate();
        
            // Get reservations for this day
            const dayReservas = getReservasForDay(dayDate, filterTipo);
            
            // Build hour slots
            let slotsHTML = '';
            for (let h = 8; h <= 20; h++) {
                slotsHTML += `<div class="calendar-hour-slot" data-hour="${h}"></div>`;
            }
            
            // Build events
            const eventsHTML = renderDayEvents(dayReservas, dayDate);
            
            // Current time line
            let timeLineHTML = '';
            if (isToday) {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinutes = now.getMinutes();
                if (currentHour >= 8 && currentHour <= 20) {
                    const topPosition = (currentHour - 8) * 60 + currentMinutes;
                    timeLineHTML = `<div class="current-time-line" style="top: ${topPosition}px;"></div>`;
                }
            }
            
            daysHTML += `
                <div class="calendar-day-column" data-date="${dayDate.toISOString().split('T')[0]}">
                    <div class="calendar-header-cell ${isToday ? 'today' : ''}">
                        <div class="day-name">${dayName}</div>
                        <div class="day-number">${dayNumber}</div>
                    </div>
                    <div class="calendar-day-slots">
                        ${slotsHTML}
                        ${eventsHTML}
                        ${timeLineHTML}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="calendar-hours">${hoursHTML}</div>
            ${daysHTML}
        `;
        console.log('Calendar rendered successfully');
    } catch (error) {
        console.error('Error in renderWeekCalendar:', error);
    }
}

function getReservasForDay(date, filterTipo) {
    const dateStr = date.toISOString().split('T')[0];
    
    return reservas.filter(r => {
        // Check date overlap
        const resStart = new Date(r.fecha_inicio);
        const resEnd = new Date(r.fecha_fin);
        const dayStart = new Date(dateStr + 'T00:00:00');
        const dayEnd = new Date(dateStr + 'T23:59:59');
        
        const overlaps = resStart <= dayEnd && resEnd >= dayStart;
        
        // Check type filter
        if (filterTipo && r.tipo_recurso !== filterTipo) {
            return false;
        }
        
        return overlaps && r.estado_nombre !== 'Cancelada';
    });
}

function renderDayEvents(dayReservas, dayDate) {
    if (dayReservas.length === 0) return '';
    
    const dateStr = dayDate.toISOString().split('T')[0];
    
    // Group overlapping events
    const events = dayReservas.map(r => {
        const start = new Date(r.fecha_inicio);
        const end = new Date(r.fecha_fin);
        
        // Clamp to day boundaries
        const dayStart = new Date(dateStr + 'T08:00:00');
        const dayEnd = new Date(dateStr + 'T20:00:00');
        
        const effectiveStart = start < dayStart ? dayStart : start;
        const effectiveEnd = end > dayEnd ? dayEnd : end;
        
        // Calculate position (60px per hour)
        const startHour = effectiveStart.getHours() + effectiveStart.getMinutes() / 60;
        const endHour = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60;
        
        const top = Math.max(0, (startHour - 8) * 60);
        const height = Math.max(20, (endHour - startHour) * 60);
        
        return {
            ...r,
            top,
            height,
            startHour,
            endHour
        };
    });
    
    // Calculate overlaps and assign columns
    events.sort((a, b) => a.top - b.top);
    
    const columns = [];
    events.forEach(event => {
        // Find a column where this event doesn't overlap
        let placed = false;
        for (let col = 0; col < columns.length; col++) {
            const lastInCol = columns[col][columns[col].length - 1];
            if (lastInCol.top + lastInCol.height <= event.top) {
                columns[col].push(event);
                event.column = col;
                placed = true;
                break;
            }
        }
        if (!placed) {
            event.column = columns.length;
            columns.push([event]);
        }
    });
    
    const numColumns = columns.length;
    
    // Render events
    const now = new Date();
    return events.map(e => {
        const width = numColumns > 1 ? `calc(${100 / numColumns}% - 4px)` : 'calc(100% - 4px)';
        const left = numColumns > 1 ? `calc(${(e.column * 100) / numColumns}% + 2px)` : '2px';
        
        const eventEndDate = new Date(e.fecha_fin);
        const isPast = eventEndDate < now;
        
        let estadoClass = e.estado_nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (isPast) estadoClass += ' pasado';
        
        const startTime = new Date(e.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(e.fecha_fin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="calendar-event ${estadoClass}" 
                 style="top: ${e.top}px; height: ${e.height}px; width: ${width}; left: ${left};"
                 onclick="showReservaDetail(${e.id_reserva})"
                 title="${e.recurso_nombre} - ${e.usuario_nombre}${isPast ? ' (Pasado)' : ''}">
                <div class="calendar-event-title">${e.recurso_nombre}</div>
                ${e.height > 30 ? `<div class="calendar-event-time">${startTime} - ${endTime}</div>` : ''}
                ${e.height > 50 ? `<div class="calendar-event-user">${e.usuario_nombre}</div>` : ''}
            </div>
        `;
    }).join('');
}

function showReservaDetail(id) {
    const reserva = reservas.find(r => r.id_reserva == id);
    if (!reserva) return;
    
    const startDate = new Date(reserva.fecha_inicio);
    const endDate = new Date(reserva.fecha_fin);
    
    const content = `
        <div class="reserva-detail">
            <h3>${reserva.recurso_nombre}</h3>
            <p><i class="fas fa-user"></i> ${reserva.usuario_nombre}</p>
            <p><i class="fas fa-calendar"></i> ${startDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p><i class="fas fa-clock"></i> ${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><i class="fas fa-info-circle"></i> Estado: <span class="badge badge-${reserva.estado_nombre.toLowerCase()}">${reserva.estado_nombre}</span></p>
        </div>
    `;
    
    showToast('info', `${reserva.recurso_nombre} - ${reserva.usuario_nombre}`);
}

// ========================================
// SYSTEM MONITOR (Real-time)
// ========================================
let systemMonitorInterval = null;

function startSystemMonitor() {
    // Actualizar inmediatamente
    updateSystemMetrics();
    
    // Actualizar cada 5 segundos
    if (systemMonitorInterval) clearInterval(systemMonitorInterval);
    systemMonitorInterval = setInterval(updateSystemMetrics, 5000);
}

function stopSystemMonitor() {
    if (systemMonitorInterval) {
        clearInterval(systemMonitorInterval);
        systemMonitorInterval = null;
    }
}

async function updateSystemMetrics() {
    try {
        const response = await fetch(`${API_BASE}system.php`);
        const data = await response.json();
        
        if (data.success) {
            const metrics = data.data;
            
            // CPU
            updateMetricBar('cpu', metrics.cpu);
            
            // RAM
            updateMetricBar('ram', metrics.memory.percentage, 
                `${metrics.memory.percentage}% (${metrics.memory.used_gb}/${metrics.memory.total_gb} GB)`);
            
            // Disco
            updateMetricBar('disk', metrics.disk.percentage,
                `${metrics.disk.percentage}% (${metrics.disk.used_gb}/${metrics.disk.total_gb} GB)`);
            
            // Red
            updateMetricBar('network', metrics.network.percentage,
                `${metrics.network.connections} conn`);
            
            // Uptime
            const uptimeEl = document.getElementById('uptimeValue');
            if (uptimeEl) uptimeEl.textContent = metrics.uptime.formatted;
            
            // Status online
            const statusEl = document.getElementById('systemStatus');
            if (statusEl) {
                statusEl.className = 'siem-status online';
                statusEl.innerHTML = '<i class="fas fa-circle"></i> EN LÍNEA';
            }
        }
    } catch (error) {
        console.error('Error fetching system metrics:', error);
        const statusEl = document.getElementById('systemStatus');
        if (statusEl) {
            statusEl.className = 'siem-status offline';
            statusEl.innerHTML = '<i class="fas fa-circle"></i> ERROR';
        }
    }
}

function updateMetricBar(name, percentage, customValue = null) {
    const bar = document.getElementById(`${name}Bar`);
    const value = document.getElementById(`${name}Value`);
    
    if (bar) {
        bar.style.width = `${percentage}%`;
        
        // Quitar clases anteriores
        bar.classList.remove('success', 'warning', 'danger');
        
        // Añadir clase según nivel
        if (percentage >= 90) {
            bar.classList.add('danger');
        } else if (percentage >= 70) {
            bar.classList.add('warning');
        } else if (percentage <= 30) {
            bar.classList.add('success');
        }
    }
    
    if (value) {
        value.textContent = customValue || `${percentage}%`;
        value.title = customValue || `${percentage}%`;
    }
}

// Export functions
function exportReport() {
    showToast('info', 'Generando reporte...');
    setTimeout(() => {
        showToast('success', 'Reporte generado correctamente');
    }, 1500);
}

// AI Summary with Groq
async function generateAISummary() {
    // Open modal with loading state
    const modal = document.getElementById('aiSummaryModal');
    const content = document.getElementById('aiSummaryContent');
    
    content.innerHTML = `
        <div class="ai-loading">
            <div class="ai-loading-spinner"></div>
            <p>Generando resumen ejecutivo con IA...</p>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Prepare data for AI
    const stats = {
        totalRecursos: recursos.length,
        disponibles: recursos.filter(r => r.estado === 'disponible').length,
        enUso: recursos.filter(r => r.estado === 'en_uso' || r.estado === 'reservado').length,
        totalReservas: reservas.length,
        reservasActivas: reservas.filter(r => r.estado_nombre === 'Confirmada' || r.estado_nombre === 'En uso').length,
        reservasPendientes: reservas.filter(r => r.estado_nombre === 'Pendiente').length,
        totalUsuarios: usuarios.length
    };
    
    try {
        const response = await fetch(`${API_BASE}gemini.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generate_summary',
                stats: stats,
                recursos: recursos,
                reservas: reservas,
                usuarios: usuarios.map(u => ({ nombre: u.nombre, rol: u.rol }))
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Parse markdown to HTML
            content.innerHTML = parseMarkdown(data.data.summary);
        } else {
            content.innerHTML = `
                <div class="ai-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${data.message || 'Error al generar el resumen'}</p>
                    <p style="font-size: 0.85rem; margin-top: 10px; opacity: 0.8;">
                        Asegúrate de configurar tu API Key de Groq en api/api_keys.php
                    </p>
                </div>
            `;
        }
    } catch (error) {
        content.innerHTML = `
            <div class="ai-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error de conexión: ${error.message}</p>
            </div>
        `;
    }
}

// Simple Markdown parser
function parseMarkdown(text) {
    if (!text) return '';
    
    return text
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // Code
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
        // Paragraphs
        .replace(/\n\n/gim, '</p><p>')
        // Line breaks
        .replace(/\n/gim, '<br>')
        // Wrap in paragraphs
        .replace(/^(.*)$/gim, '<p>$1</p>')
        // Clean up empty paragraphs
        .replace(/<p><\/p>/gim, '')
        .replace(/<p><br><\/p>/gim, '')
        // Fix nested elements
        .replace(/<p>(<h[1-3]>)/gim, '$1')
        .replace(/(<\/h[1-3]>)<\/p>/gim, '$1')
        .replace(/<p>(<li>)/gim, '$1')
        .replace(/(<\/li>)<\/p>/gim, '$1');
}

// Copy AI Summary to clipboard
function copyAISummary() {
    const content = document.getElementById('aiSummaryContent');
    const text = content.innerText || content.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('success', 'Resumen copiado al portapapeles');
    }).catch(() => {
        showToast('error', 'No se pudo copiar el resumen');
    });
}

function exportCSV() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    // BOM para UTF-8 (para que Excel lo lea bien)
    const BOM = '\uFEFF';
    
    // Headers más descriptivos
    const headers = [
        'ID Reserva',
        'Recurso',
        'Tipo Recurso', 
        'Usuario',
        'Email Usuario',
        'Fecha Inicio',
        'Hora Inicio',
        'Fecha Fin',
        'Hora Fin',
        'Duración (horas)',
        'Estado',
        'Ubicación'
    ];
    
    // Procesar datos
    const rows = reservas.map(r => {
        const inicio = new Date(r.fecha_inicio);
        const fin = new Date(r.fecha_fin);
        const duracion = ((fin - inicio) / (1000 * 60 * 60)).toFixed(1);
        const recurso = recursos.find(rec => rec.id_recurso == r.id_recurso);
        
        return [
            r.id_reserva,
            `"${r.recurso_nombre}"`,
            `"${r.tipo_recurso || ''}"`,
            `"${r.usuario_nombre}"`,
            `"${r.usuario_email || ''}"`,
            inicio.toLocaleDateString('es-ES'),
            inicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            fin.toLocaleDateString('es-ES'),
            fin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            duracion,
            r.estado_nombre,
            `"${recurso?.ubicacion || ''}"`
        ];
    });
    
    // Agregar resumen al final
    const totalReservas = reservas.length;
    const confirmadas = reservas.filter(r => r.estado_nombre === 'Confirmada').length;
    const pendientes = reservas.filter(r => r.estado_nombre === 'Pendiente').length;
    const canceladas = reservas.filter(r => r.estado_nombre === 'Cancelada').length;
    
    const summary = [
        [],
        ['--- RESUMEN ---'],
        ['Total Reservas', totalReservas],
        ['Confirmadas', confirmadas],
        ['Pendientes', pendientes],
        ['Canceladas', canceladas],
        ['Generado el', now.toLocaleString('es-ES')]
    ];
    
    const csv = BOM + [headers, ...rows, ...summary].map(row => row.join(';')).join('\n');
    downloadFile(csv, `SGR-IT_Reservas_${dateStr}.csv`, 'text/csv;charset=utf-8');
    showToast('success', 'CSV exportado correctamente');
}

function exportPDF() {
    showToast('info', 'Generando PDF...');
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // Estadísticas
    const totalRecursos = recursos.length;
    const disponibles = recursos.filter(r => r.estado === 'disponible').length;
    const totalReservas = reservas.length;
    const confirmadas = reservas.filter(r => r.estado_nombre === 'Confirmada').length;
    const pendientes = reservas.filter(r => r.estado_nombre === 'Pendiente').length;
    
    // Crear contenido HTML para el PDF
    const content = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SGR-IT - Informe de Gestión</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 40px; 
            color: #1e1e2e;
            background: #fff;
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #6366f1;
        }
        .header h1 { 
            color: #6366f1; 
            font-size: 28px;
            margin-bottom: 5px;
        }
        .header p { color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section h2 { 
            color: #1e1e2e; 
            font-size: 18px; 
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 15px; 
            margin-bottom: 30px;
        }
        .stat-box { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 10px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        .stat-box .value { 
            font-size: 32px; 
            font-weight: 700; 
            color: #6366f1;
        }
        .stat-box .label { 
            font-size: 12px; 
            color: #666;
            text-transform: uppercase;
            margin-top: 5px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 12px;
        }
        th { 
            background: #6366f1; 
            color: white; 
            padding: 12px 8px;
            text-align: left;
        }
        td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #e5e7eb;
        }
        tr:nth-child(even) { background: #f8fafc; }
        .status { 
            padding: 4px 10px; 
            border-radius: 20px; 
            font-size: 11px;
            font-weight: 600;
        }
        .status.confirmada { background: #d1fae5; color: #059669; }
        .status.pendiente { background: #fef3c7; color: #d97706; }
        .status.cancelada { background: #fee2e2; color: #dc2626; }
        .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #999; 
            font-size: 11px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 SGR-IT - Informe de Gestión</h1>
        <p>Sistema de Gestión de Recursos IT</p>
        <p style="margin-top: 10px;">${dateStr}</p>
    </div>

    <div class="stats-grid">
        <div class="stat-box">
            <div class="value">${totalRecursos}</div>
            <div class="label">Total Recursos</div>
        </div>
        <div class="stat-box">
            <div class="value">${disponibles}</div>
            <div class="label">Disponibles</div>
        </div>
        <div class="stat-box">
            <div class="value">${totalReservas}</div>
            <div class="label">Total Reservas</div>
        </div>
        <div class="stat-box">
            <div class="value">${confirmadas}</div>
            <div class="label">Confirmadas</div>
        </div>
    </div>

    <div class="section">
        <h2>📋 Listado de Reservas</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Recurso</th>
                    <th>Usuario</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${reservas.map(r => `
                    <tr>
                        <td>${r.id_reserva}</td>
                        <td>${r.recurso_nombre}</td>
                        <td>${r.usuario_nombre}</td>
                        <td>${new Date(r.fecha_inicio).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td>${new Date(r.fecha_fin).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td><span class="status ${r.estado_nombre.toLowerCase()}">${r.estado_nombre}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>💻 Inventario de Recursos</h2>
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${recursos.map(r => `
                    <tr>
                        <td>${r.nombre}</td>
                        <td>${r.tipo_nombre || ''}</td>
                        <td>${r.ubicacion || ''}</td>
                        <td><span class="status ${r.estado === 'disponible' ? 'confirmada' : 'cancelada'}">${r.estado === 'disponible' ? 'Disponible' : 'No disponible'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>Generado por SGR-IT | ${now.toLocaleString('es-ES')}</p>
        <p class="no-print" style="margin-top: 15px;">
            <button onclick="window.print()" style="padding: 10px 30px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
                🖨️ Imprimir / Guardar como PDF
            </button>
        </p>
    </div>
</body>
</html>`;

    // Abrir en nueva ventana para imprimir
    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.document.close();
    
    showToast('success', 'Informe generado - Usa Ctrl+P para guardar como PDF');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ========================================
// NOTIFICATIONS
// ========================================
let notificationsOpen = false;

function getNotificationsDismissed() {
    const dismissed = localStorage.getItem('sgr_notifications_dismissed');
    return dismissed ? JSON.parse(dismissed) : [];
}

function saveNotificationDismissed(ids) {
    localStorage.setItem('sgr_notifications_dismissed', JSON.stringify(ids));
}

function getActiveNotifications() {
    const dismissed = getNotificationsDismissed();
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Filter user's reservations if not admin
    let userReservas = reservas;
    if (currentUser && currentUser.rol !== 'admin') {
        userReservas = reservas.filter(r => r.id_usuario == currentUser.id_usuario);
    }
    
    const notifications = [];
    
    userReservas.forEach(r => {
        const fechaInicio = new Date(r.fecha_inicio);
        const fechaFin = new Date(r.fecha_fin);
        
        // Active now (Confirmada and currently in time range)
        if (r.estado_nombre === 'Confirmada' && fechaInicio <= now && fechaFin >= now) {
            const notifId = `active_${r.id_reserva}`;
            if (!dismissed.includes(notifId)) {
                notifications.push({
                    id: notifId,
                    type: 'active',
                    icon: 'play-circle',
                    title: 'Reserva activa ahora',
                    message: r.recurso_nombre,
                    detail: `Hasta ${fechaFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
                    priority: 1,
                    reserva: r
                });
            }
        }
        
        // Upcoming in next 24h (Confirmada)
        else if (r.estado_nombre === 'Confirmada' && fechaInicio > now && fechaInicio <= in24h) {
            const notifId = `upcoming_${r.id_reserva}`;
            if (!dismissed.includes(notifId)) {
                const hoursUntil = Math.round((fechaInicio - now) / (1000 * 60 * 60));
                notifications.push({
                    id: notifId,
                    type: 'upcoming',
                    icon: 'clock',
                    title: hoursUntil <= 1 ? 'Reserva en menos de 1 hora' : `Reserva en ${hoursUntil}h`,
                    message: r.recurso_nombre,
                    detail: fechaInicio.toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
                    priority: 2,
                    reserva: r
                });
            }
        }
        
        // Pending approval (for all users)
        else if (r.estado_nombre === 'Pendiente') {
            const notifId = `pending_${r.id_reserva}`;
            if (!dismissed.includes(notifId)) {
                notifications.push({
                    id: notifId,
                    type: 'pending',
                    icon: 'hourglass-half',
                    title: 'Reserva pendiente de aprobación',
                    message: r.recurso_nombre,
                    detail: r.usuario_nombre,
                    priority: 3,
                    reserva: r
                });
            }
        }
    });
    
    // Sort by priority
    notifications.sort((a, b) => a.priority - b.priority);
    
    return notifications.slice(0, 10);
}

function toggleNotifications() {
    const btn = document.getElementById('notificationsBtn');
    let panel = document.getElementById('notificationsPanel');
    
    if (!panel) {
        panel = createNotificationsPanel();
        document.body.appendChild(panel);
    } else {
        updateNotificationsPanel(panel);
    }
    
    notificationsOpen = !notificationsOpen;
    panel.classList.toggle('active', notificationsOpen);
    
    // Position panel
    const rect = btn.getBoundingClientRect();
    panel.style.top = (rect.bottom + 10) + 'px';
    panel.style.right = (window.innerWidth - rect.right) + 'px';
    
    // Close on outside click
    if (notificationsOpen) {
        setTimeout(() => {
            document.addEventListener('click', closeNotificationsOnOutside);
        }, 100);
    }
}

function closeNotificationsOnOutside(e) {
    const panel = document.getElementById('notificationsPanel');
    const btn = document.getElementById('notificationsBtn');
    
    if (panel && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('active');
        notificationsOpen = false;
        document.removeEventListener('click', closeNotificationsOnOutside);
    }
}

function updateNotificationBadge() {
    const badge = document.querySelector('#notificationsBtn .notification-badge');
    if (badge) {
        const count = getActiveNotifications().length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function createNotificationsPanel() {
    const panel = document.createElement('div');
    panel.id = 'notificationsPanel';
    panel.className = 'notifications-panel';
    
    updateNotificationsPanel(panel);
    
    return panel;
}

function getNotificationTypeClass(type) {
    switch(type) {
        case 'active': return 'success';
        case 'upcoming': return 'info';
        case 'pending': return 'warning';
        default: return 'info';
    }
}

function updateNotificationsPanel(panel) {
    const notifications = getActiveNotifications();
    
    panel.innerHTML = `
        <div class="notifications-header">
            <h4><i class="fas fa-bell"></i> Notificaciones</h4>
            ${notifications.length > 0 ? `<button class="btn-clear-notif" onclick="clearNotifications()">Limpiar todo</button>` : ''}
        </div>
        <div class="notifications-list">
            ${notifications.length > 0 ? notifications.map(n => `
                <div class="notification-item ${n.type}" data-id="${n.id}">
                    <div class="notification-icon ${getNotificationTypeClass(n.type)}">
                        <i class="fas fa-${n.icon}"></i>
                    </div>
                    <div class="notification-content">
                        <p class="notification-title">${n.title}</p>
                        <p class="notification-message"><strong>${n.message}</strong></p>
                        <span class="notification-detail">${n.detail}</span>
                    </div>
                    <button class="btn-dismiss-notif" onclick="dismissNotification('${n.id}')" title="Descartar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('') : `
                <div class="notification-empty">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay notificaciones</p>
                    <span>¡Todo al día!</span>
                </div>
            `}
        </div>
    `;
}

function dismissNotification(id) {
    const dismissed = getNotificationsDismissed();
    if (!dismissed.includes(id)) {
        dismissed.push(id);
        saveNotificationDismissed(dismissed);
    }
    
    // Update panel
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        updateNotificationsPanel(panel);
    }
    
    // Update badge
    updateNotificationBadge();
}

function clearNotifications() {
    const activeNotifications = getActiveNotifications();
    const dismissed = getNotificationsDismissed();
    
    // Add all current notification IDs to dismissed list
    activeNotifications.forEach(n => {
        if (!dismissed.includes(n.id)) {
            dismissed.push(n.id);
        }
    });
    
    saveNotificationDismissed(dismissed);
    
    // Update panel
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        updateNotificationsPanel(panel);
    }
    
    // Update badge
    updateNotificationBadge();
    
    showToast('success', 'Notificaciones limpiadas');
}

// ========================================
// RESOURCE DETAIL
// ========================================
let selectedRecursoId = null;

function showRecursoDetail(id) {
    const recurso = recursos.find(r => r.id_recurso == id);
    if (!recurso) return;
    
    selectedRecursoId = id;
    
    const tipoNombre = recurso.tipo_nombre || 'Recurso';
    const tipoNombreNorm = tipoNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Default images
    let defaultImage = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400';
    switch(tipoNombreNorm) {
        case 'sala': 
            defaultImage = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400';
            break;
        case 'portatil': 
            defaultImage = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400';
            break;
        case 'proyector': 
            defaultImage = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400';
            break;
    }
    
    // Update modal content
    document.getElementById('recursoDetailTitle').textContent = tipoNombre;
    document.getElementById('recursoDetailName').textContent = recurso.nombre;
    document.getElementById('recursoDetailType').textContent = tipoNombre;
    document.getElementById('recursoDetailLocation').textContent = recurso.ubicacion || 'Sin ubicación asignada';
    document.getElementById('recursoDetailDesc').textContent = recurso.descripcion || 'Sin especificaciones disponibles';
    
    const statusEl = document.getElementById('recursoDetailStatus');
    statusEl.textContent = recurso.estado === 'disponible' ? 'Disponible' : 'No Disponible';
    statusEl.className = `status-badge ${recurso.estado}`;
    
    const imgEl = document.querySelector('#recursoDetailImage img');
    imgEl.src = recurso.foto_url || defaultImage;
    imgEl.onerror = () => { imgEl.src = defaultImage; };
    
    // Show/hide reserve button
    const btnReservar = document.getElementById('btnReservarDetail');
    btnReservar.style.display = recurso.estado === 'disponible' ? 'flex' : 'none';
    
    openModal('recursoDetailModal');
}

function reservarRecursoFromDetail() {
    if (selectedRecursoId) {
        closeModal('recursoDetailModal');
        reservarRecurso(selectedRecursoId);
    }
}

function editRecursoFromDetail() {
    if (selectedRecursoId) {
        closeModal('recursoDetailModal');
        editRecurso(selectedRecursoId);
    }
}

// ========================================
// USER PROFILE
// ========================================
function openMyProfile() {
    if (!currentUser) return;
    
    // Populate form
    document.getElementById('profileNombre').value = currentUser.nombre;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profileRol').value = currentUser.rol === 'admin' ? 'Administrador' : 'Empleado';
    document.getElementById('profileNewPassword').value = '';
    document.getElementById('profileConfirmPassword').value = '';
    
    // Update avatar
    const imgEl = document.getElementById('profileAvatarImg');
    const placeholderEl = document.getElementById('profileAvatarPlaceholder');
    
    if (currentUser.foto_url) {
        imgEl.src = currentUser.foto_url;
        imgEl.style.display = 'block';
        placeholderEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
    }
    
    openModal('profileModal');
}

function changeProfilePhoto() {
    // This function is replaced by handleProfilePhotoUpload
    document.getElementById('profilePhotoInput').click();
}

async function handleProfilePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
        showToast('error', 'Solo se permiten archivos de imagen');
        return;
    }
    
    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('error', 'La imagen no puede superar 2MB');
        return;
    }
    
    // Mostrar loading
    const btn = event.target.nextElementSibling;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    btn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('photo', file);
        
        const response = await fetch(`${API_BASE}upload.php`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update user profile with new photo URL
            await updateUserProfile({ foto_url: result.data.url });
            showToast('success', 'Foto actualizada correctamente');
        } else {
            showToast('error', result.message || 'Error al subir la foto');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión al subir la foto');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        event.target.value = ''; // Reset input
    }
}

async function updateUserProfile(data) {
    try {
        const response = await fetch(`${API_BASE}usuarios.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: currentUser.id_usuario, ...data })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local user
            Object.assign(currentUser, data);
            localStorage.setItem('sgr_user', JSON.stringify(currentUser));
            
            // Update UI
            updateUserAvatar();
            
            // Update avatar in profile modal
            if (data.foto_url !== undefined) {
                const imgEl = document.getElementById('profileAvatarImg');
                const placeholderEl = document.getElementById('profileAvatarPlaceholder');
                
                if (data.foto_url) {
                    imgEl.src = data.foto_url;
                    imgEl.style.display = 'block';
                    placeholderEl.style.display = 'none';
                } else {
                    imgEl.style.display = 'none';
                    placeholderEl.style.display = 'flex';
                }
            }
            
            showToast('success', 'Perfil actualizado');
        } else {
            showToast('error', result.message || 'Error al actualizar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error de conexión');
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('profileNombre').value;
    const newPassword = document.getElementById('profileNewPassword').value;
    const confirmPassword = document.getElementById('profileConfirmPassword').value;
    
    const data = { nombre };
    
    // Check password
    if (newPassword) {
        if (newPassword.length < 6) {
            showToast('error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('error', 'Las contraseñas no coinciden');
            return;
        }
        data.password = newPassword;
    }
    
    await updateUserProfile(data);
    
    if (data.nombre) {
        document.getElementById('userName').textContent = data.nombre;
        currentUser.nombre = data.nombre;
    }
    
    closeModal('profileModal');
}
