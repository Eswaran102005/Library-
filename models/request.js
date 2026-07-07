const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    bookId: { type: String, required: true },
    userIdRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookIdRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected'], 
        default: 'Pending' 
    },
    requestDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
