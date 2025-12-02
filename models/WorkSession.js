const mongoose = require('mongoose');

const WorkSessionSchema = new mongoose.Schema({
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    clientName: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // w sekundach
        required: true
    },
    route: [{
        lat: Number,
        lng: Number,
        timestamp: Date,
        accuracy: Number
    }],
    photos: [{
        url: String,
        description: String,
        lat: Number,
        lng: Number,
        timestamp: Date
    }],
    notes: String,
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'cancelled'],
        default: 'completed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Wirtualne pole dla łatwego formatowania czasu
WorkSessionSchema.virtual('formattedDuration').get(function() {
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    return `${hours}h ${minutes}m`;
});

module.exports = mongoose.model('WorkSession', WorkSessionSchema);