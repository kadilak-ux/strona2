const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkSession',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: String,
    path: String,
    url: {
        type: String,
        required: true
    },
    description: String,
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    metadata: {
        device: String,
        resolution: String,
        size: Number
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Photo', PhotoSchema);