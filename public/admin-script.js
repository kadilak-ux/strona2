// Panel pracownika - śledzenie pracy

let map = null;
let routePoints = [];
let workInterval = null;
let workStartTime = null;
let workTimer = null;
let currentPhotos = [];
let currentSession = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Sprawdź autoryzację
    const user = checkAuth('worker');
    if (!user) return;
    
    // Inicjalizacja mapy
    initMap();
    
    // Załaduj klientów
    await loadClients();
    
    // Aktualizuj status GPS
    updateGPSStatus();
    
    // Obsługa przycisków
    document.getElementById('start-work-btn').addEventListener('click', startWork);
    document.getElementById('stop-work-btn').addEventListener('click', stopWork);
    document.getElementById('pause-work-btn').addEventListener('click', togglePause);
    document.getElementById('center-map-btn').addEventListener('click', centerMap);
    document.getElementById('clear-route-btn').addEventListener('click', clearRoute);
    document.getElementById('take-photo-btn').addEventListener('click', takePhoto);
    document.getElementById('photo-upload').addEventListener('change', handlePhotoUpload);
    document.getElementById('save-photo-btn').addEventListener('click', savePhoto);
    
    // Aktualizuj wyświetlaną nazwę pracownika
    const workerNameEl = document.getElementById('worker-name');
    if (workerNameEl) {
        workerNameEl.textContent = user.name;
    }
});

// Inicjalizuj mapę Leaflet
function initMap() {
    const defaultCoords = [52.2297, 21.0122];
    map = L.map('map').setView(defaultCoords, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Próbuj pobrać aktualną lokalizację
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const userCoords = [position.coords.latitude, position.coords.longitude];
            map.setView(userCoords, 15);
            
            L.marker(userCoords)
                .addTo(map)
                .bindPopup('Twoja aktualna lokalizacja')
                .openPopup();
        });
    }
}

// Załaduj klientów z API
async function loadClients() {
    try {
        const response = await fetch('/api/clients');
        const clients = await response.json();
        
        const select = document.getElementById('client-select');
        select.innerHTML = '<option value="">-- Wybierz klienta --</option>';
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.name} (${client.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Błąd ładowania klientów:', error);
    }
}

// Rozpocznij pracę
function startWork() {
    const clientSelect = document.getElementById('client-select');
    if (!clientSelect.value) {
        alert('Proszę wybrać klienta przed rozpoczęciem pracy!');
        return;
    }
    
    workStartTime = new Date();
    routePoints = [];
    currentPhotos = [];
    
    // Pobierz dane klienta
    const clientName = clientSelect.options[clientSelect.selectedIndex].text;
    document.getElementById('current-client').textContent = clientName;
    
    // Aktualizuj UI
    document.getElementById('work-status').className = 'status working';
    document.getElementById('work-status').innerHTML = '<span class="status-indicator"></span>PRACA W TOKU';
    
    document.getElementById('start-work-btn').disabled = true;
    document.getElementById('stop-work-btn').disabled = false;
    document.getElementById('pause-work-btn').disabled = false;
    
    // Rozpocznij śledzenie lokalizacji
    startTracking();
    
    // Rozpocznij timer
    startWorkTimer();
    
    // Zaloguj rozpoczęcie pracy
    addToRouteLog('Rozpoczęto pracę dla: ' + clientName);
}

// Zakończ pracę
async function stopWork() {
    const workEndTime = new Date();
    const duration = Math.floor((workEndTime - workStartTime) / 1000);
    
    // Zatrzymaj śledzenie i timer
    stopTracking();
    clearInterval(workTimer);
    
    // Aktualizuj UI
    document.getElementById('work-status').className = 'status stopped';
    document.getElementById('work-status').innerHTML = '<span class="status-indicator"></span>PRZERWA';
    
    document.getElementById('start-work-btn').disabled = false;
    document.getElementById('stop-work-btn').disabled = true;
    document.getElementById('pause-work-btn').disabled = true;
    
    // Zapisz sesję do API
    await saveWorkSession(workStartTime, workEndTime, duration);
    
    // Wyczyść dane
    currentPhotos = [];
    updatePhotoGallery();
    
    // Zaloguj zakończenie
    addToRouteLog('Zakończono pracę. Czas pracy: ' + formatDuration(duration));
}

// Zapisz sesję do API
async function saveWorkSession(startTime, endTime, duration) {
    const clientSelect = document.getElementById('client-select');
    const clientId = clientSelect.value;
    const clientName = clientSelect.options[clientSelect.selectedIndex].text;
    
    const session = {
        clientId: clientId,
        clientName: clientName,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
        route: routePoints.map(p => ({
            lat: p.lat,
            lng: p.lng,
            timestamp: p.time.toISOString(),
            accuracy: p.accuracy || 0
        })),
        photos: currentPhotos,
        status: 'completed'
    };
    
    try {
        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(session)
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Sesja pracy została zapisana!');
            return data.session;
        } else {
            throw new Error('Błąd zapisu sesji');
        }
    } catch (error) {
        console.error('Błąd zapisywania sesji:', error);
        alert('Błąd zapisywania sesji! Dane zostały zapisane lokalnie.');
        
        // Zapisz lokalnie jako backup
        const sessions = getData('workSessions') || [];
        session.id = generateId();
        sessions.push(session);
        saveData('workSessions', sessions);
    }
}

// Rozpocznij śledzenie GPS
function startTracking() {
    if (!navigator.geolocation) {
        alert('Twoja przeglądarka nie obsługuje geolokalizacji!');
        return;
    }
    
    workInterval = setInterval(function() {
        navigator.geolocation.getCurrentPosition(function(position) {
            const point = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                time: new Date()
            };
            
            routePoints.push(point);
            updateRouteOnMap();
            updateRouteStats();
            
            const timeStr = point.time.toLocaleTimeString('pl-PL');
            addToRouteLog(`Punkt trasy: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} (${timeStr})`);
        });
    }, 10000);
}

// Zatrzymaj śledzenie
function stopTracking() {
    if (workInterval) {
        clearInterval(workInterval);
        workInterval = null;
    }
}

// Aktualizuj trasę na mapie
function updateRouteOnMap() {
    // Wyczyść poprzednią trasę
    map.eachLayer(function(layer) {
        if (layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    if (routePoints.length < 2) return;
    
    const latlngs = routePoints.map(p => [p.lat, p.lng]);
    const polyline = L.polyline(latlngs, {color: 'blue'}).addTo(map);
    
    if (routePoints.length > 0) {
        L.marker([routePoints[0].lat, routePoints[0].lng])
            .addTo(map)
            .bindPopup('Start pracy');
        
        L.marker([routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lng])
            .addTo(map)
            .bindPopup('Ostatni punkt');
    }
}

// Aktualizuj statystyki trasy
function updateRouteStats() {
    document.getElementById('route-points').textContent = routePoints.length;
    
    let totalDistance = 0;
    for (let i = 1; i < routePoints.length; i++) {
        totalDistance += calculateDistance(
            routePoints[i-1].lat, routePoints[i-1].lng,
            routePoints[i].lat, routePoints[i].lng
        );
    }
    
    document.getElementById('route-distance').textContent = totalDistance.toFixed(2) + ' km';
    
    if (routePoints.length > 0) {
        document.getElementById('route-start').textContent = 
            routePoints[0].time.toLocaleTimeString('pl-PL');
        document.getElementById('route-end').textContent = 
            routePoints[routePoints.length - 1].time.toLocaleTimeString('pl-PL');
    }
}

// Oblicz odległość
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

// Rozpocznij timer pracy
function startWorkTimer() {
    let seconds = 0;
    
    workTimer = setInterval(function() {
        seconds++;
        document.getElementById('work-timer').textContent = formatDuration(seconds);
    }, 1000);
}

// Formatuj czas
function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Dodaj wpis do loga
function addToRouteLog(message) {
    const log = document.getElementById('route-log');
    const entry = document.createElement('p');
    const time = new Date().toLocaleTimeString('pl-PL');
    entry.textContent = `[${time}] ${message}`;
    log.prepend(entry);
}

// Zrób zdjęcie
function takePhoto() {
    document.getElementById('photo-upload').click();
}

// Obsłuż upload zdjęcia
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Podgląd zdjęcia">`;
        document.getElementById('save-photo-btn').disabled = false;
    };
    reader.readAsDataURL(file);
}

// Zapisz zdjęcie
async function savePhoto() {
    const description = document.getElementById('photo-description').value;
    const previewImg = document.getElementById('photo-preview').querySelector('img');
    
    if (!previewImg) {
        alert('Najpierw zrób zdjęcie!');
        return;
    }
    
    if (!navigator.geolocation) {
        alert('GPS nie jest dostępny!');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(async function(position) {
        const photoData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            description: description || 'Bez opisu',
            timestamp: new Date().toISOString()
        };
        
        // Stwórz FormData dla uploadu
        const formData = new FormData();
        const fileInput = document.getElementById('photo-upload');
        formData.append('photo', fileInput.files[0]);
        formData.append('description', photoData.description);
        formData.append('lat', photoData.lat);
        formData.append('lng', photoData.lng);
        
        if (currentSession && currentSession.id) {
            formData.append('sessionId', currentSession.id);
        }
        
        try {
            const response = await fetch('/api/upload-photo', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                const photo = {
                    ...photoData,
                    url: data.photo.url
                };
                
                currentPhotos.push(photo);
                updatePhotoGallery();
                
                // Wyczyść formularz
                document.getElementById('photo-description').value = '';
                document.getElementById('photo-preview').innerHTML = 
                    '<p>Kliknij przycisk, aby dodać zdjęcie</p>';
                document.getElementById('save-photo-btn').disabled = true;
                document.getElementById('photo-upload').value = '';
                
                // Dodaj marker na mapie
                L.marker([photo.lat, photo.lng])
                    .addTo(map)
                    .bindPopup(`<img src="${photo.url}" width="100"><br>${photo.description}`)
                    .openPopup();
                
                addToRouteLog(`Dodano zdjęcie: ${photo.description}`);
            }
        } catch (error) {
            console.error('Błąd uploadu zdjęcia:', error);
            alert('Błąd zapisywania zdjęcia!');
        }
    });
}

// Aktualizuj galerię
function updatePhotoGallery() {
    const gallery = document.getElementById('photos-gallery');
    if (!gallery) return;
    
    if (currentPhotos.length === 0) {
        gallery.innerHTML = '<p>Brak zdjęć</p>';
        return;
    }
    
    gallery.innerHTML = '';
    currentPhotos.forEach(photo => {
        const thumb = document.createElement('div');
        thumb.className = 'photo-thumb';
        thumb.innerHTML = `
            <img src="${photo.url}" alt="${photo.description}">
            <div class="photo-time">${new Date(photo.timestamp).toLocaleTimeString('pl-PL').substring(0,5)}</div>
        `;
        thumb.onclick = () => viewPhoto(photo);
        gallery.appendChild(thumb);
    });
}

// Pokazuj zdjęcie
function viewPhoto(photo) {
    alert(`Zdjęcie: ${photo.description}\nLokalizacja: ${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)}`);
}

// Centruj mapę
function centerMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            map.setView([position.coords.latitude, position.coords.longitude], 15);
        });
    }
}

// Wyczyść trasę
function clearRoute() {
    if (confirm('Czy na pewno chcesz wyczyścić aktualną trasę?')) {
        routePoints = [];
        updateRouteOnMap();
        updateRouteStats();
        
        const log = document.getElementById('route-log');
        log.innerHTML = '<p>Trasa nie została jeszcze rozpoczęta</p>';
    }
}

// Pauza/wznów
function togglePause() {
    const statusEl = document.getElementById('work-status');
    const btn = document.getElementById('pause-work-btn');
    
    if (statusEl.classList.contains('working')) {
        statusEl.className = 'status paused';
        statusEl.innerHTML = '<span class="status-indicator"></span>PAUZA';
        btn.innerHTML = '<i class="fas fa-play"></i> Wznów pracę';
        
        stopTracking();
        clearInterval(workTimer);
        addToRouteLog('Włączono pauzę');
    } else {
        statusEl.className = 'status working';
        statusEl.innerHTML = '<span class="status-indicator"></span>PRACA W TOKU';
        btn.innerHTML = '<i class="fas fa-pause"></i> Przerwa';
        
        startTracking();
        startWorkTimer();
        addToRouteLog('Wznówiono pracę');
    }
}

// Pokazuj zakładki
function showDetailsTab(tabName) {
    document.querySelectorAll('.details-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.details-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}

// Aktualizuj status GPS
function updateGPSStatus() {
    const statusEl = document.getElementById('gps-status');
    if (!statusEl) return;
    
    if (navigator.geolocation) {
        statusEl.innerHTML = '<i class="fas fa-satellite"></i> GPS: Aktywny';
        statusEl.style.color = '#4CAF50';
    } else {
        statusEl.innerHTML = '<i class="fas fa-satellite"></i> GPS: Niedostępny';
        statusEl.style.color = '#f44336';
    }
}