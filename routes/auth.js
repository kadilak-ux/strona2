const express = require('express');
const router = express.Router();

// Tymczasowe dane użytkowników
const users = [
    { id: 1, login: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
    { id: 2, login: 'klient1', password: 'pass1', role: 'client', name: 'Jan Kowalski', clientId: 'C001' },
    { id: 3, login: 'klient2', password: 'pass2', role: 'client', name: 'Anna Nowak', clientId: 'C002' }
];

// Logowanie
router.post('/login', (req, res) => {
    const { login, password } = req.body;
    const user = users.find(u => u.login === login && u.password === password);
    
    if (user) {
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                clientId: user.clientId
            }
        });
    } else {
        res.status(401).json({ success: false, message: 'Błędne dane logowania' });
    }
});

// Wylogowanie
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Wylogowano pomyślnie' });
});

// Sprawdzenie sesji
router.get('/check', (req, res) => {
    // W prawdziwej aplikacji sprawdzałobyś token JWT
    res.json({ isAuthenticated: true });
});

module.exports = router;