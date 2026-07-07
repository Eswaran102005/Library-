const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    bookId: { type: String, required: true },
    userId: { type: String, required: true },
    userIdRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bookIdRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date },
    fineAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Issued', 'Returned'], default: 'Issued' }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
