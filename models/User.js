const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['client', 'worker', 'admin'],
        default: 'client'
    },
    clientId: {
        type: String,
        unique: true,
        sparse: true
    },
    phone: String,
    address: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date
});

// Metoda do weryfikacji hasła (w uproszczonej wersji)
UserSchema.methods.verifyPassword = function(password) {
    return this.password === password; // W rzeczywistości użyj bcrypt!
};

module.exports = mongoose.model('User', UserSchema);