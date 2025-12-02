const express = require('express');
const router = express.Router();

// Tymczasowe dane sesji
let sessions = [
    {
        id: '1',
        clientId: 'C001',
        clientName: 'Jan Kowalski',
        workerName: 'Michał Budowlany',
        startTime: '2024-01-15T08:00:00',
        endTime: '2024-01-15T16:30:00',
        duration: 30600, // 8.5h w sekundach
        route: [
            { lat: 52.2297, lng: 21.0122, time: '08:00' },
            { lat: 52.2300, lng: 21.0130, time: '09:00' },
            { lat: 52.2310, lng: 21.0140, time: '10:00' },
            { lat: 52.2320, lng: 21.0150, time: '11:00' }
        ],
        photos: [
            { 
                url: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Start+pracy', 
                description: 'Rozpoczęcie pracy',
                time: '08:15'
            },
            { 
                url: 'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Monta%C5%BC', 
                description: 'Montaż instalacji',
                time: '10:30'
            }
        ],
        notes: 'Wykonana instalacja hydrauliczna zgodnie z projektem.'
    }
];

// Pobierz wszystkie sesje dla klienta
router.get('/client/:clientId', (req, res) => {
    const clientSessions = sessions.filter(s => s.clientId === req.params.clientId);
    res.json(clientSessions);
});

// Pobierz szczegóły sesji
router.get('/:sessionId', (req, res) => {
    const session = sessions.find(s => s.id === req.params.sessionId);
    if (session) {
        res.json(session);
    } else {
        res.status(404).json({ error: 'Sesja nie znaleziona' });
    }
});

// Utwórz nową sesję
router.post('/', (req, res) => {
    const newSession = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...req.body
    };
    sessions.push(newSession);
    res.json({ success: true, session: newSession });
});

// Aktualizuj sesję
router.put('/:sessionId', (req, res) => {
    const index = sessions.findIndex(s => s.id === req.params.sessionId);
    if (index !== -1) {
        sessions[index] = { ...sessions[index], ...req.body };
        res.json({ success: true, session: sessions[index] });
    } else {
        res.status(404).json({ error: 'Sesja nie znaleziona' });
    }
});

// Usuń sesję
router.delete('/:sessionId', (req, res) => {
    sessions = sessions.filter(s => s.id !== req.params.sessionId);
    res.json({ success: true, message: 'Sesja usunięta' });
});

module.exports = router;