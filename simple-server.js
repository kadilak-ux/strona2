const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Utwórz folder na dane jeśli nie istnieje
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// Prosta "baza danych" w plikach JSON
const DB = {
    users: loadData('users') || [
        { id: 1, email: 'klient@test.pl', password: 'test123', name: 'Jan Kowalski', role: 'client' },
        { id: 2, email: 'admin@test.pl', password: 'admin123', name: 'Michał Budowlany', role: 'worker' }
    ],
    sessions: loadData('sessions') || [],
    photos: loadData('photos') || []
};

// Helper functions
function loadData(filename) {
    try {
        const data = fs.readFileSync(`data/${filename}.json`, 'utf8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function saveData(filename, data) {
    fs.writeFileSync(`data/${filename}.json`, JSON.stringify(data, null, 2));
}

// API Endpoints
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = DB.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } else {
        res.status(401).json({ success: false, message: 'Błędne dane' });
    }
});

app.post('/api/session', (req, res) => {
    const session = req.body;
    session.id = Date.now();
    session.createdAt = new Date().toISOString();
    
    DB.sessions.push(session);
    saveData('sessions', DB.sessions);
    
    res.json({ success: true, sessionId: session.id });
});

app.get('/api/sessions/:clientId', (req, res) => {
    const clientSessions = DB.sessions.filter(s => s.clientId == req.params.clientId);
    res.json(clientSessions);
});

app.post('/api/photo', (req, res) => {
    const photo = req.body;
    photo.id = Date.now();
    photo.createdAt = new Date().toISOString();
    
    DB.photos.push(photo);
    saveData('photos', DB.photos);
    
    res.json({ success: true, photoId: photo.id });
});

// Serwuj frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Serwer działa: http://localhost:${PORT}`);
    console.log(`📁 Dane zapisywane w folderze: ${__dirname}/data/`);
});