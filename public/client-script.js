// Panel klienta - podgląd danych

let clientMap = null;
let currentSession = null;

document.addEventListener('DOMContentLoaded', function() {
    // Sprawdź autoryzację
    const user = checkAuth('client');
    if (!user) return;
    
    // Inicjalizacja mapy
    initClientMap();
    
    // Wczytaj sesje klienta
    loadClientSessions(user.clientId || user.id);
    
    // Ustaw timer sesji
    startSessionTimer();
    
    // Obsługa przycisków
    const refreshBtn = document.getElementById('refresh-sessions');
    const printBtn = document.getElementById('print-report');
    const viewPhotosBtn = document.getElementById('view-all-photos');
    
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadClientSessions(user.clientId || user.id));
    if (printBtn) printBtn.addEventListener('click', printReport);
    if (viewPhotosBtn) viewPhotosBtn.addEventListener('click', viewAllPhotos);
    
    // Modal do zdjęć
    const modal = document.getElementById('photo-modal');
    const closeModal = document.querySelector('.close-modal');
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Inicjalizuj mapę
function initClientMap() {
    const defaultCoords = [52.2297, 21.0122];
    clientMap = L.map('client-map').setView(defaultCoords, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(clientMap);
}

// Wczytaj sesje klienta z API
async function loadClientSessions(clientId) {
    try {
        const response = await fetch(`/api/sessions/client/${clientId}`);
        const clientSessions = await response.json();
        
        displaySessionsList(clientSessions);
        updateClientStats(clientSessions);
        
        if (clientSessions.length > 0) {
            displaySession(clientSessions[0]);
            currentSession = clientSessions[0];
        }
    } catch (error) {
        console.error('Błąd ładowania sesji:', error);
        
        // Fallback do localStorage
        const sessions = getData('workSessions') || [];
        const filtered = sessions.filter(s => s.clientId === clientId);
        
        displaySessionsList(filtered);
        updateClientStats(filtered);
        
        if (filtered.length > 0) {
            displaySession(filtered[0]);
            currentSession = filtered[0];
        }
    }
}

// Wyświetl listę sesji
function displaySessionsList(sessions) {
    const list = document.getElementById('sessions-list');
    
    if (!sessions || sessions.length === 0) {
        list.innerHTML = '<p class="no-sessions">Brak zarejestrowanych prac</p>';
        return;
    }
    
    list.innerHTML = '';
    sessions.forEach(session => {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const duration = session.duration || (endTime - startTime) / 1000;
        
        const item = document.createElement('div');
        item.className = 'session-item';
        item.innerHTML = `
            <div class="session-date">
                <i class="fas fa-calendar-day"></i>
                ${startTime.toLocaleDateString('pl-PL')}
            </div>
            <div class="session-info">
                <span class="session-time">${startTime.toLocaleTimeString('pl-PL').substring(0,5)} - ${endTime.toLocaleTimeString('pl-PL').substring(0,5)}</span>
                <span class="session-duration">${formatDurationShort(duration)}</span>
            </div>
            <button class="btn-view-session" onclick="displaySession(${JSON.stringify(session).replace(/"/g, '&quot;')})">
                <i class="fas fa-eye"></i> Zobacz
            </button>
        `;
        list.appendChild(item);
    });
}

// Wyświetl szczegóły sesji
function displaySession(session) {
    currentSession = session;
    
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    const duration = session.duration || (endTime - startTime) / 1000;
    
    // Aktualizuj nagłówek
    document.getElementById('selected-session-date').textContent = 
        `Sesja z ${startTime.toLocaleDateString('pl-PL')}`;
    
    // Aktualizuj informacje
    document.getElementById('session-time').textContent = 
        `${startTime.toLocaleTimeString('pl-PL').substring(0,5)} - ${endTime.toLocaleTimeString('pl-PL').substring(0,5)}`;
    document.getElementById('session-duration').textContent = formatDurationShort(duration);
    
    // Oblicz dystans
    let distance = 0;
    if (session.route && session.route.length > 1) {
        for (let i = 1; i < session.route.length; i++) {
            distance += calculateDistance(
                session.route[i-1].lat, session.route[i-1].lng,
                session.route[i].lat, session.route[i].lng
            );
        }
    }
    
    document.getElementById('session-distance').textContent = distance.toFixed(2) + ' km';
    document.getElementById('session-points').textContent = 
        (session.route ? session.route.length : 0) + ' punktów';
    
    document.getElementById('session-photos').textContent = 
        (session.photos ? session.photos.length : 0) + ' zdjęć';
    
    // Wyświetl notatki
    const notesEl = document.getElementById('session-notes');
    if (notesEl && session.notes) {
        notesEl.innerHTML = `<p>${session.notes}</p>`;
    }
    
    // Wyświetl trasę i zdjęcia
    displayRouteOnMap(session.route);
    displaySessionPhotos(session.photos);
}

// Wyświetl trasę na mapie
function displayRouteOnMap(route) {
    // Wyczyść mapę
    clientMap.eachLayer(function(layer) {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            clientMap.removeLayer(layer);
        }
    });
    
    if (!route || route.length < 2) return;
    
    // Narysuj trasę
    const latlngs = route.map(p => [p.lat, p.lng]);
    const polyline = L.polyline(latlngs, {color: '#3498db', weight: 4}).addTo(clientMap);
    
    // Dodaj markery
    if (route.length > 0) {
        // Marker startu (zielony)
        L.marker([route[0].lat, route[0].lng], {
            icon: L.divIcon({
                className: 'start-marker',
                html: '<div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                iconSize: [20, 20]
            })
        }).addTo(clientMap).bindPopup('Start pracy');
        
        // Marker końca (czerwony)
        L.marker([route[route.length - 1].lat, route[route.length - 1].lng], {
            icon: L.divIcon({
                className: 'end-marker',
                html: '<div style="background: #f44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                iconSize: [20, 20]
            })
        }).addTo(clientMap).bindPopup('Koniec pracy');
    }
    
    // Dodaj markery zdjęć
    if (currentSession && currentSession.photos) {
        currentSession.photos.forEach(photo => {
            if (photo.lat && photo.lng) {
                L.marker([photo.lat, photo.lng], {
                    icon: L.divIcon({
                        className: 'photo-marker',
                        html: '<div style="background: #2196F3; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"><i class="fas fa-camera" style="color: white; font-size: 8px; line-height: 16px;"></i></div>',
                        iconSize: [16, 16]
                    })
                }).addTo(clientMap).bindPopup(`
                    <div style="text-align:center">
                        <img src="${photo.url}" style="max-width:150px; max-height:150px;"><br>
                        <strong>${photo.description || 'Zdjęcie z pracy'}</strong><br>
                        <small>${photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString('pl-PL') : ''}</small>
                    </div>
                `);
            }
        });
    }
    
    // Zoom do trasy
    if (route.length > 0) {
        const bounds = L.latLngBounds(latlngs);
        clientMap.fitBounds(bounds, {padding: [50, 50]});
    }
}

// Wyświetl zdjęcia
function displaySessionPhotos(photos) {
    const gallery = document.getElementById('session-photos-gallery');
    
    if (!photos || photos.length === 0) {
        gallery.innerHTML = '<p class="no-photos">Brak zdjęć z tej sesji</p>';
        return;
    }
    
    gallery.innerHTML = '';
    photos.forEach(photo => {
        const thumb = document.createElement('div');
        thumb.className = 'photo-thumb';
        thumb.innerHTML = `
            <img src="${photo.url}" alt="${photo.description || 'Zdjęcie z pracy'}">
            <div class="photo-time">${photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString('pl-PL').substring(0,5) : ''}</div>
        `;
        thumb.onclick = () => openPhotoModal(photo);
        gallery.appendChild(thumb);
    });
}

// Otwórz modal ze zdjęciem
function openPhotoModal(photo) {
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-photo');
    const modalTime = document.getElementById('modal-photo-time');
    const modalLocation = document.getElementById('modal-photo-location');
    const modalDesc = document.getElementById('modal-photo-desc');
    
    modalImg.src = photo.url;
    modalTime.textContent = `Godzina: ${photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString('pl-PL') : 'Nieznana'}`;
    modalLocation.textContent = `Lokalizacja: ${photo.lat ? photo.lat.toFixed(5) : 'Nieznana'}, ${photo.lng ? photo.lng.toFixed(5) : 'Nieznana'}`;
    modalDesc.textContent = `Opis: ${photo.description || 'Brak opisu'}`;
    
    modal.style.display = 'block';
}

// Zobacz wszystkie zdjęcia
function viewAllPhotos() {
    if (!currentSession || !currentSession.photos || currentSession.photos.length === 0) {
        alert('Brak zdjęć w tej sesji!');
        return;
    }
    
    openPhotoModal(currentSession.photos[0]);
}

// Aktualizuj statystyki
function updateClientStats(sessions) {
    let totalTime = 0;
    let totalSessions = sessions.length;
    let lastWorkDate = 'Brak';
    
    if (sessions.length > 0) {
        sessions.forEach(session => {
            totalTime += session.duration || 0;
        });
        
        const latestSession = sessions.reduce((latest, current) => {
            return new Date(current.startTime) > new Date(latest.startTime) ? current : latest;
        });
        
        lastWorkDate = new Date(latestSession.startTime).toLocaleDateString('pl-PL');
    }
    
    document.getElementById('client-total-time').textContent = formatDurationShort(totalTime);
    document.getElementById('client-sessions-count').textContent = totalSessions;
    document.getElementById('client-last-work').textContent = lastWorkDate;
}

// Formatuj krótki czas
function formatDurationShort(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Oblicz odległość (ta sama funkcja co w admin-script.js)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Drukuj raport
function printReport() {
    if (!currentSession) {
        alert('Najpierw wybierz sesję!');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const startTime = new Date(currentSession.startTime);
    const endTime = new Date(currentSession.endTime);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Raport pracy - ${startTime.toLocaleDateString('pl-PL')}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
                .info-card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; background: #f9f9f9; }
                .map-placeholder { width: 100%; height: 300px; background: #f0f0f0; margin: 20px 0; display: flex; align-items: center; justify-content: center; }
                .photos { margin: 30px 0; }
                .photo-item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                .footer { margin-top: 40px; text-align: center; color: #666; border-top: 1px solid #ccc; padding-top: 20px; }
                @media print { body { margin: 0; padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Raport pracy</h1>
                <h3>Klient: ${currentSession.clientName || 'Nieznany'}</h3>
                <p>Data: ${startTime.toLocaleDateString('pl-PL')}</p>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <h3>Czas pracy</h3>
                    <p><strong>Rozpoczęcie:</strong> ${startTime.toLocaleTimeString('pl-PL')}</p>
                    <p><strong>Zakończenie:</strong> ${endTime.toLocaleTimeString('pl-PL')}</p>
                    <p><strong>Łączny czas:</strong> ${formatDurationShort(currentSession.duration || 0)}</p>
                </div>
                
                <div class="info-card">
                    <h3>Statystyki</h3>
                    <p><strong>Liczba punktów trasy:</strong> ${currentSession.route ? currentSession.route.length : 0}</p>
                    <p><strong>Liczba zdjęć:</strong> ${currentSession.photos ? currentSession.photos.length : 0}</p>
                    <p><strong>Status:</strong> ${currentSession.status || 'completed'}</p>
                </div>
            </div>
            
            <h3>Trasa pracy</h3>
            <div class="map-placeholder">
                <p>Mapa trasy - wygenerowana w systemie śledzenia pracy</p>
            </div>
            
            <div class="photos">
                <h3>Dokumentacja zdjęciowa</h3>
                ${currentSession.photos && currentSession.photos.length > 0 ? 
                    currentSession.photos.map(photo => `
                        <div class="photo-item">
                            <p><strong>${photo.description || 'Zdjęcie z pracy'}</strong></p>
                            <p><strong>Godzina:</strong> ${photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString('pl-PL') : 'Nieznana'}</p>
                            <p><strong>Lokalizacja:</strong> ${photo.lat ? photo.lat.toFixed(5) : 'Nieznana'}, ${photo.lng ? photo.lng.toFixed(5) : 'Nieznana'}</p>
                        </div>
                    `).join('') : 
                    '<p>Brak zdjęć w tej sesji</p>'
                }
            </div>
            
            ${currentSession.notes ? `
                <div class="notes">
                    <h3>Notatki pracownika</h3>
                    <p>${currentSession.notes}</p>
                </div>
            ` : ''}
            
            <div class="footer">
                <p>Wygenerowano: ${new Date().toLocaleString('pl-PL')}</p>
                <p><strong>System śledzenia pracy v1.0</strong></p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Timer sesji
function startSessionTimer() {
    let timeLeft = 30 * 60;
    
    const timer = setInterval(function() {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        const timerEl = document.getElementById('session-timer');
        if (timerEl) {
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            alert('Sesja wygasła! Zaloguj się ponownie.');
            logout();
        }
    }, 1000);
}