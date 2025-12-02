const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Utwórz foldery jeśli nie istnieją
if (!fs.existsSync('data')) fs.mkdirSync('data');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Konfiguracja multer dla uploadu zdjęć
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Ładowanie danych z plików JSON
function loadData(filename) {
    try {
        const data = fs.readFileSync(`data/${filename}.json`, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.log(`Tworzenie nowego pliku ${filename}.json`);
        return [];
    }
}

function saveData(filename, data) {
    fs.writeFileSync(`data/${filename}.json`, JSON.stringify(data, null, 2));
}

// Baza danych w pamięci
const DB = {
    users: loadData('users') || [
        { 
            id: 1, 
            email: 'klient@test.pl', 
            password: 'test123', 
            name: 'Jan Kowalski', 
            role: 'client',
            clientId: 'client_001'
        },
        { 
            id: 2, 
            email: 'admin@test.pl', 
            password: 'admin123', 
            name: 'Michał Budowlany', 
            role: 'worker' 
        },
        { 
            id: 2, 
            email: '22@22', 
            password: '22', 
            name: 'Michał Budowlany', 
            role: 'worker' 
        }
    ],
    sessions: loadData('sessions') || [],
    photos: loadData('photos') || [],
    clients: loadData('clients') || []
};

// API Endpoints

// Test API
app.get('/api/test', (req, res) => {
    res.json({ message: 'API działa poprawnie!', timestamp: new Date() });
});

// Logowanie
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
                role: user.role,
                clientId: user.clientId
            }
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Błędny email lub hasło' 
        });
    }
});

// Pobierz wszystkie sesje
app.get('/api/sessions', (req, res) => {
    res.json(DB.sessions);
});

// Pobierz sesje dla klienta
app.get('/api/sessions/client/:clientId', (req, res) => {
    const clientSessions = DB.sessions.filter(s => s.clientId === req.params.clientId);
    res.json(clientSessions);
});

// Pobierz szczegóły sesji
app.get('/api/sessions/:sessionId', (req, res) => {
    const session = DB.sessions.find(s => s.id === req.params.sessionId);
    if (session) {
        res.json(session);
    } else {
        res.status(404).json({ error: 'Sesja nie znaleziona' });
    }
});

// Zapisz nową sesję
app.post('/api/sessions', (req, res) => {
    const session = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...req.body
    };
    
    DB.sessions.push(session);
    saveData('sessions', DB.sessions);
    
    res.json({ 
        success: true, 
        session: session
    });
});

// Upload zdjęcia
app.post('/api/upload-photo', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Brak pliku' });
    }
    
    const photo = {
        id: Date.now().toString(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        uploadedAt: new Date().toISOString(),
        ...req.body
    };
    
    DB.photos.push(photo);
    saveData('photos', DB.photos);
    
    // Dodaj do sesji jeśli podano sessionId
    if (req.body.sessionId) {
        const session = DB.sessions.find(s => s.id === req.body.sessionId);
        if (session) {
            if (!session.photos) session.photos = [];
            session.photos.push({
                id: photo.id,
                url: photo.url,
                description: req.body.description || '',
                uploadedAt: photo.uploadedAt
            });
            saveData('sessions', DB.sessions);
        }
    }
    
    res.json({ 
        success: true, 
        photo: photo
    });
});

// Pobierz klientów
app.get('/api/clients', (req, res) => {
    // Pobierz tylko użytkowników z rolą client
    const clients = DB.users
        .filter(u => u.role === 'client')
        .map(u => ({
            id: u.clientId || u.id,
            name: u.name,
            email: u.email
        }));
    res.json(clients);
});

// Statystyki klienta
app.get('/api/stats/:clientId', (req, res) => {
    const clientSessions = DB.sessions.filter(s => s.clientId === req.params.clientId);
    
    const stats = {
        totalSessions: clientSessions.length,
        totalHours: clientSessions.reduce((sum, session) => {
            const duration = session.duration || 0;
            return sum + (duration / 3600);
        }, 0).toFixed(2),
        totalPhotos: clientSessions.reduce((sum, session) => {
            return sum + (session.photos ? session.photos.length : 0);
        }, 0),
        lastSession: clientSessions.length > 0 
            ? clientSessions[clientSessions.length - 1] 
            : null
    };
    
    res.json(stats);
});

// API dla admina - użytkownicy
app.get('/api/admin/users', (req, res) => {
    const usersWithoutPasswords = DB.users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
    res.json(usersWithoutPasswords);
});

// Dodaj nowego użytkownika
app.post('/api/admin/users', (req, res) => {
    const { email, password, name, role, clientId } = req.body;
    
    // Sprawdź czy email już istnieje
    const existingUser = DB.users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ 
            success: false, 
            message: 'Użytkownik z tym emailem już istnieje' 
        });
    }
    
    // Generuj nowe ID
    const newId = DB.users.length > 0 
        ? Math.max(...DB.users.map(u => u.id)) + 1 
        : 1;
    
    const newUser = {
        id: newId,
        email,
        password,
        name,
        role: role || 'client',
        clientId: clientId || `client_${Date.now()}`,
        createdAt: new Date().toISOString()
    };
    
    DB.users.push(newUser);
    saveData('users', DB.users);
    
    // Nie zwracaj hasła
    const { password: _, ...userResponse } = newUser;
    
    res.json({ 
        success: true, 
        user: userResponse
    });
});

// Usuń użytkownika
app.delete('/api/admin/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const initialLength = DB.users.length;
    
    DB.users = DB.users.filter(user => user.id !== userId);
    
    if (DB.users.length < initialLength) {
        saveData('users', DB.users);
        res.json({ success: true, message: 'Użytkownik usunięty' });
    } else {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    }
});

// Single Page Application routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start serwera
app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
    console.log(`📁 Dane: ./data/`);
    console.log(`🖼️ Uploads: ./uploads/`);
    console.log(`\nTestowe dane logowania:`);
    console.log(`👷 Pracownik: admin@test.pl / admin123`);
    console.log(`👤 Klient: klient@test.pl / test123`);
});