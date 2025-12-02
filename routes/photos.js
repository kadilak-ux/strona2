const express = require('express');
const router = express.Router();

// Tymczasowe dane zdjęć
let photos = [
    {
        id: '1',
        sessionId: '1',
        url: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Zdj%C4%99cie+1',
        description: 'Start pracy',
        lat: 52.2297,
        lng: 21.0122,
        timestamp: '2024-01-15T08:15:00'
    },
    {
        id: '2',
        sessionId: '1',
        url: 'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Zdj%C4%99cie+2',
        description: 'Montaż',
        lat: 52.2310,
        lng: 21.0140,
        timestamp: '2024-01-15T10:30:00'
    }
];

// Pobierz zdjęcia dla sesji
router.get('/session/:sessionId', (req, res) => {
    const sessionPhotos = photos.filter(p => p.sessionId === req.params.sessionId);
    res.json(sessionPhotos);
});

// Dodaj nowe zdjęcie
router.post('/', (req, res) => {
    const newPhoto = {
        id: Date.now().toString(),
        ...req.body
    };
    photos.push(newPhoto);
    res.json({ success: true, photo: newPhoto });
});

// Usuń zdjęcie
router.delete('/:photoId', (req, res) => {
    photos = photos.filter(p => p.id !== req.params.photoId);
    res.json({ success: true, message: 'Zdjęcie usunięte' });
});

module.exports = router;