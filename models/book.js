const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    bookId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    availableQuantity: { type: Number, required: true },
    ratePerQuantity: { type: Number, required: true },
    dateOfPayment: { type: Date, required: true },
    paidBy: { type: String, required: true },
    totalAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
