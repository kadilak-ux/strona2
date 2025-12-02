// Główne funkcje pomocnicze

// Pokazuj/zamieniaj zakładki
function showTab(tabName) {
    // Ukryj wszystkie zakładki
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Ukryj wszystkie przyciski zakładek
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Pokaż wybraną zakładkę
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Aktywuj odpowiedni przycisk
    event.target.classList.add('active');
}

// Obsługa logowania przez API
async function handleLogin(role, credentials) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Zapisz dane użytkownika
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAuthenticated', 'true');
            
            // Przekieruj w zależności od roli
            if (data.user.role === 'worker') {
                window.location.href = 'admin-panel.html';
            } else if (data.user.role === 'client') {
                window.location.href = 'client-panel.html';
            }
        } else {
            alert(data.message || 'Błędne dane logowania!');
        }
    } catch (error) {
        console.error('Błąd logowania:', error);
        alert('Błąd połączenia z serwerem!');
    }
}

// Sprawdź czy użytkownik jest zalogowany
function checkAuth(requiredRole = null) {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!isAuthenticated || !user) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        alert('Brak uprawnień do tej strony!');
        window.location.href = 'index.html';
        return false;
    }
    
    return user;
}

// Wyloguj
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Obsługa DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Logowanie klienta
    const clientLoginForm = document.getElementById('client-login-form');
    if (clientLoginForm) {
        clientLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('client-email').value;
            const password = document.getElementById('client-password').value;
            
            handleLogin('client', { email, password });
        });
    }
    
    // Logowanie pracownika
    const workerLoginForm = document.getElementById('worker-login-form');
    if (workerLoginForm) {
        workerLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('worker-login').value;
            const password = document.getElementById('worker-password').value;
            
            handleLogin('worker', { email, password });
        });
    }
    
    // Aktualizuj czas na żywo
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pl-PL');
        const dateString = now.toLocaleDateString('pl-PL');
        
        document.querySelectorAll('#current-time').forEach(el => {
            if (el) el.textContent = timeString;
        });
    }
    
    setInterval(updateTime, 1000);
    updateTime();
    
    // Sprawdź autoryzację na stronach paneli
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'admin-panel.html') {
        const user = checkAuth('worker');
        if (user) {
            // Ustaw nazwę pracownika jeśli element istnieje
            const nameEl = document.getElementById('worker-name');
            if (nameEl) nameEl.textContent = user.name;
        }
    }
    
    if (currentPage === 'client-panel.html') {
        const user = checkAuth('client');
        if (user) {
            document.getElementById('client-name').textContent = user.name;
            document.getElementById('client-email').textContent = user.email;
        }
    }
    
    if (currentPage === 'user-management.html') {
        checkAuth('worker');
    }
    
    // Obsługa wylogowania
    document.querySelectorAll('#logout-btn, #client-logout-btn').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', logout);
        }
    });
});

// Helper functions
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Eksport dla modułów
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showTab, checkAuth, logout, saveData, getData, generateId };
}