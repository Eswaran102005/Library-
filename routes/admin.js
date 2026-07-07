const express = require('express');
const router = express.Router();
const Book = require('../models/book');
const Transaction = require('../models/transaction');
const Request = require('../models/request');
const User = require('../models/user');
const { DateTime } = require('luxon');
const { body, validationResult } = require('express-validator');

// Helper to check if admin (Simplified for this project)
const isAdmin = (req, res, next) => {
    // In a real app, check user role. Here we just allow if session exists or generic access
    next();
};

/**
 * @route   GET /admin/dashboard
 * @desc    Admin Dashboard - View All Books and Transactions with Filters
 */
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const { userSearch, startDate, endDate } = req.query;
        let bookQuery = {};
        let transQuery = {};
        let reqQuery = {};
        let hasFilters = false;

        let searchedUser = null;
        if (userSearch) {
            searchedUser = await User.findOne({ userId: { $regex: new RegExp(`^${userSearch}$`, 'i') } });
            transQuery.userId = { $regex: new RegExp(`^${userSearch}$`, 'i') };
            reqQuery.userId = { $regex: new RegExp(`^${userSearch}$`, 'i') };
            hasFilters = true;
        }

        if (startDate || endDate) {
            transQuery.createdAt = {};
            reqQuery.requestDate = {};
            if (startDate) {
                transQuery.createdAt.$gte = new Date(startDate);
                reqQuery.requestDate.$gte = new Date(startDate);
            }
            if (endDate) {
                transQuery.createdAt.$lte = new Date(endDate);
                reqQuery.requestDate.$lte = new Date(endDate);
            }
            hasFilters = true;
        }

        const books = await Book.find({});
        
        let allTransactions;
        let pendingRequests;
        let filteredTransactions = [];
        let filteredRequests = [];

        if (hasFilters) {
            searchedUser = await User.findOne({ userId: { $regex: new RegExp(`^${userSearch}$`, 'i') } });
            allTransactions = await Transaction.find(transQuery).populate('bookIdRef userIdRef').sort({ createdAt: -1 });
            pendingRequests = await Request.find(reqQuery).populate('bookIdRef userIdRef').sort({ createdAt: -1 });
            filteredTransactions = allTransactions;
            filteredRequests = pendingRequests;
        } else {
            allTransactions = await Transaction.find({}).populate('bookIdRef userIdRef').sort({ createdAt: -1 });
            pendingRequests = await Request.find({ status: 'Pending' }).populate('bookIdRef userIdRef').sort({ createdAt: -1 });
        }

        res.render('admin_dashboard', { 
            books, 
            transactions: allTransactions, 
            requests: pendingRequests,
            filteredTransactions,
            filteredRequests,
            searchedUser,
            hasFilters,
            title: 'Admin Dashboard',
            filters: { userSearch: userSearch || '', startDate: startDate || '', endDate: endDate || '' }
        });
    } catch (err) {
        req.flash('error_msg', err.message);
        res.status(500).send(err.message);
    }
});

/**
 * @route   GET /admin/book/:bookId
 * @desc    Get a particular Book Details by Book-ID
 */
router.get('/book/:bookId', isAdmin, async (req, res) => {
    try {
        const book = await Book.findOne({ bookId: req.params.bookId });
        if (!book) {
            req.flash('error_msg', 'Book not found');
            return res.redirect('/admin/dashboard');
        }
        res.json(book);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   GET /admin/user-details/:userId
 * @desc    Get User Details by User-ID for Modal
 */
router.get('/user-details/:userId', isAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Send user data minus sensitive info like password
        const { password, ...userData } = user.toObject();
        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   POST /admin/add-book
 * @desc    New Book Entry API with Validation (Requirement 4.1)
 */
router.post('/add-book', [
    isAdmin,
    body('bookId').notEmpty().withMessage('Book ID is required'),
    body('name').notEmpty().withMessage('Book Name is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('ratePerQuantity').isFloat({ min: 0.1 }).withMessage('Rate must be positive')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
        return res.redirect('/admin/dashboard');
    }

    try {
        const { bookId, name, quantity, ratePerQuantity, dateOfPayment, paidBy } = req.body;
        const existingBook = await Book.findOne({ bookId });
        if (existingBook) {
            req.flash('error_msg', 'Book ID already exists');
            return res.redirect('/admin/dashboard');
        }

        const totalAmount = quantity * ratePerQuantity;
        const newBook = new Book({
            bookId, name, quantity, availableQuantity: quantity,
            ratePerQuantity, dateOfPayment, paidBy, totalAmount
        });
        
        await newBook.save();
        req.flash('success_msg', 'Book added successfully');
        res.redirect('/admin/dashboard');
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/admin/dashboard');
    }
});

/**
 * @route   POST /admin/update-book/:id
 * @desc    Update a Book Details
 */
router.post('/update-book/:id', [
    isAdmin,
    body('name').notEmpty().withMessage('Book Name is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('ratePerQuantity').isFloat({ min: 0.1 }).withMessage('Rate must be positive')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
        return res.redirect('/admin/dashboard');
    }

    try {
        const { name, quantity, ratePerQuantity, dateOfPayment, paidBy } = req.body;
        const book = await Book.findById(req.params.id);
        if (!book) throw new Error('Book not found');

        const diff = quantity - book.quantity;
        book.name = name;
        book.quantity = quantity;
        book.ratePerQuantity = ratePerQuantity;
        book.dateOfPayment = dateOfPayment;
        book.paidBy = paidBy;
        book.totalAmount = quantity * ratePerQuantity;
        book.availableQuantity += diff;

        await book.save();
        req.flash('success_msg', 'Book updated successfully');
        res.redirect('/admin/dashboard');
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/admin/dashboard');
    }
});

/**
 * @route   POST /admin/issue-book
 * @desc    Issue a Book to a User with Validation (Requirement 4.3)
 */
router.post('/issue-book', [
    isAdmin,
    body('bookId').notEmpty().withMessage('Book ID is required'),
    body('userId').notEmpty().withMessage('User ID is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
        return res.redirect('/admin/dashboard');
    }

    try {
        const { bookId, userId, dueDate } = req.body;
        
        // Find book and user (Case-insensitive user lookup)
        const book = await Book.findOne({ bookId });
        const user = await User.findOne({ userId: { $regex: new RegExp(`^${userId}$`, 'i') } });

        // Basic validations
        if (!book || book.availableQuantity <= 0) {
            req.flash('error_msg', 'Book not found or out of stock');
            return res.redirect('/admin/dashboard');
        }
        if (!user) {
            req.flash('error_msg', 'User not found in system');
            return res.redirect('/admin/dashboard');
        }

        if (!dueDate) {
            req.flash('error_msg', 'Please select a manual due date');
            return res.redirect('/admin/dashboard');
        }

        const finalDueDate = new Date(dueDate);

        // Create transaction record
        const transaction = new Transaction({
            bookId,
            userId: user.userId, // Store canonical ID
            bookIdRef: book._id,
            userIdRef: user._id,
            dueDate: finalDueDate
        });

        // Update book availability
        book.availableQuantity -= 1;
        await book.save();
        await transaction.save();

        req.flash('success_msg', `Book issued to ${user.name}. Due: ${dueDate.toDateString()}`);
        res.redirect('/admin/dashboard');
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/admin/dashboard');
    }
});

router.post('/approve-request/:id', isAdmin, async (req, res) => {
    try {
        const { dueDate } = req.body;
        const request = await Request.findById(req.params.id).populate('bookIdRef userIdRef');
        if (!request) {
            req.flash('error_msg', 'Request not found');
            return res.redirect('/admin/dashboard');
        }

        const book = request.bookIdRef;
        const user = request.userIdRef;

        if (book.availableQuantity <= 0) {
            req.flash('error_msg', 'Book out of stock');
            request.status = 'Rejected';
            await request.save();
            return res.redirect('/admin/dashboard');
        }

        if (!dueDate) {
            req.flash('error_msg', 'Please select a manual due date for approval');
            return res.redirect('/admin/dashboard');
        }

        const finalDueDate = new Date(dueDate);

        // Create Transaction
        const transaction = new Transaction({
            bookId: book.bookId,
            userId: user.userId,
            bookIdRef: book._id,
            userIdRef: user._id,
            dueDate: finalDueDate
        });

        book.availableQuantity -= 1;
        request.status = 'Approved';

        await transaction.save();
        await book.save();
        await request.save();

        req.flash('success_msg', `Request approved. Book issued to ${user.name}`);
        res.redirect('/admin/dashboard');
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/admin/dashboard');
    }
});

/**
 * @route   POST /admin/return-book
 * @desc    Collect/Return Book and calculate fine (Requirement 2 & 4.3)
 */
router.post('/return-book', isAdmin, async (req, res) => {
    try {
        const { transactionId } = req.body;
        const transaction = await Transaction.findById(transactionId).populate('userIdRef');
        
        if (!transaction || transaction.status === 'Returned') {
            req.flash('error_msg', 'Invalid or already returned transaction');
            return res.redirect('/admin/dashboard');
        }

        const user = transaction.userIdRef;
        
        // Calculate fine based on Category (Requirement: Rs 5, 10, 15)
        const returnDate = DateTime.now();
        const dueDate = DateTime.fromJSDate(transaction.dueDate);
        let fineAmount = 0;

        if (returnDate > dueDate) {
            const diffInDays = Math.ceil(returnDate.diff(dueDate, 'days').days);
            
            let rate = 15; // default for other
            if (user.category === 'student') rate = 5;
            else if (user.category === 'faculty') rate = 10;

            fineAmount = diffInDays * rate;
        }

        // Update transaction status
        transaction.returnDate = returnDate.toJSDate();
        transaction.fineAmount = fineAmount;
        transaction.status = 'Returned';
        await transaction.save();

        // Restore book stock
        const book = await Book.findById(transaction.bookIdRef);
        if (book) {
            book.availableQuantity += 1;
            await book.save();
        }

        req.flash('success_msg', `Book returned. Fine collected: Rs. ${fineAmount}`);
        res.redirect('/admin/dashboard');
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/admin/dashboard');
    }
});

module.exports = router;
