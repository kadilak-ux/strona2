// Inicjalizacja mapy dla demo
function initDemoMap(mapId = 'map') {
    if (!document.getElementById(mapId)) return null;
    
    const map = L.map(mapId).setView([52.2297, 21.0122], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Demo trasa
    const demoCoords = [
        [52.230, 21.010],
        [52.231, 21.011], 
        [52.232, 21.012],
        [52.233, 21.014]
    ];
    
    const polyline = L.polyline(demoCoords, {color: 'blue'}).addTo(map);
    map.fitBounds(polyline.getBounds());
    
    // Demo markery
    L.marker(demoCoords[0]).addTo(map)
        .bindPopup('<b>Start pracy</b><br>08:00')
        .openPopup();
    
    L.marker(demoCoords[demoCoords.length - 1]).addTo(map)
        .bindPopup('<b>Koniec pracy</b><br>16:30');
    
    return map;
}

// Funkcja do dodawania trasy na mapę
function addRouteToMap(map, routePoints) {
    if (!map || !routePoints || routePoints.length === 0) return;
    
    // Wyczyść poprzednią trasę
    map.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    const latlngs = routePoints.map(p => [p.lat, p.lng]);
    const polyline = L.polyline(latlngs, {color: '#2196F3', weight: 4}).addTo(map);
    
    // Dodaj markery startu i końca
    if (latlngs.length > 0) {
        L.marker(latlngs[0]).addTo(map)
            .bindPopup('Start')
            .openPopup();
        
        L.marker(latlngs[latlngs.length - 1]).addTo(map)
            .bindPopup('Koniec');
    }
    
    map.fitBounds(polyline.getBounds());
}

// Funkcja do dodawania zdjęć na mapę
function addPhotosToMap(map, photos) {
    if (!map || !photos) return;
    
    photos.forEach(photo => {
        if (photo.lat && photo.lng) {
            L.marker([photo.lat, photo.lng], {
                icon: L.icon({
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })
            }).addTo(map)
            .bindPopup(`
                <div style="text-align: center">
                    <img src="${photo.url}" style="max-width: 200px; max-height: 150px; border-radius: 5px;">
                    <p><strong>${photo.description || 'Zdjęcie z pracy'}</strong></p>
                    <small>${photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString() : ''}</small>
                </div>
            `);
        }
    });
}

// Eksport funkcji
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initDemoMap, addRouteToMap, addPhotosToMap };
}