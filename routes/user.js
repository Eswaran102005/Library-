const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Book = require('../models/book');
const Transaction = require('../models/transaction');
const Request = require('../models/request');
const { body, validationResult } = require('express-validator');

// Helper to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/user/login');
};

// User Home Screen - View available books
router.get('/home', isAuthenticated, async (req, res) => {
    try {
        const books = await Book.find({ availableQuantity: { $gt: 0 } });
        // Get user's pending requests to change button status
        const pendingRequests = await Request.find({ 
            userId: req.session.user.userId, 
            status: 'Pending' 
        });
        const requestedBookIds = pendingRequests.map(r => r.bookId);

        res.render('user_home', { books, requestedBookIds, title: 'Library Books' });
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/user/login');
    }
});

// Request a Book (New Requirement)
router.post('/request-book/:bookId', isAuthenticated, async (req, res) => {
    console.log('Requesting book:', req.params.bookId);
    try {
        const book = await Book.findOne({ bookId: req.params.bookId });
        if (!book) {
            req.flash('error_msg', 'Book not found');
            return res.redirect('/user/home');
        }

        // Check if already requested
        const existingRequest = await Request.findOne({ 
            userId: req.session.user.userId, 
            bookId: book.bookId,
            status: 'Pending'
        });

        if (existingRequest) {
            req.flash('error_msg', 'You already have a pending request for this book');
            return res.redirect('/user/home');
        }

        const newRequest = new Request({
            userId: req.session.user.userId,
            bookId: book.bookId,
            userIdRef: req.session.user.id,
            bookIdRef: book._id
        });

        await newRequest.save();
        req.flash('success_msg', 'Request submitted to admin for approval');
        res.redirect('/user/home');
    } catch (err) {
        console.error('Request error:', err);
        req.flash('error_msg', err.message);
        res.redirect('/user/home');
    }
});

// User Assigned Books Page
router.get('/books', isAuthenticated, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.session.user.userId })
            .populate('bookIdRef')
            .sort({ issueDate: -1 });
        
        res.render('user_books', { transactions, title: 'My Books' });
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/user/home');
    }
});

// User Contact Page
router.get('/contact', isAuthenticated, (req, res) => {
    res.render('user_contact', { title: 'Contact Admin' });
});

// User Requests Page
router.get('/requests', isAuthenticated, async (req, res) => {
    try {
        // Fetch all requests by user
        const requests = await Request.find({ userId: req.session.user.userId })
            .populate('bookIdRef')
            .sort({ requestDate: -1, createdAt: -1 }); // Fallback sorting
        
        res.render('user_requests', { requests, title: 'My Requests' });
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/user/home');
    }
});

// Edit Profile Page
router.get('/edit-profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('edit_profile', { user, title: 'Edit Profile' });
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect(`/user/profile/${req.session.user.userId}`);
    }
});

// Edit Profile API
router.post('/edit-profile', [
    isAuthenticated,
    body('name').notEmpty().withMessage('Name is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
        return res.redirect('/user/edit-profile');
    }

    try {
        const { name, phoneNumber, photo } = req.body;
        const user = await User.findById(req.session.user.id);
        
        user.name = name;
        user.phoneNumber = phoneNumber;
        if (photo) user.photo = photo;

        await user.save();
        req.session.user.name = user.name; // Update session
        
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect(`/user/profile/${user.userId}`);
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/user/edit-profile');
    }
});

// User Profile View - Shows personal details and transaction history (Requirement 2a)
router.get('/profile/:userId', isAuthenticated, async (req, res) => {
    try {
        // Find user by ID (Case-insensitive lookup)
        const user = await User.findOne({ userId: { $regex: new RegExp(`^${req.params.userId}$`, 'i') } });
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/user/login');
        }

        // Get transactions for this user (using ObjectId for reliability)
        const transactions = await Transaction.find({ userIdRef: user._id })
            .populate('bookIdRef')
            .sort({ createdAt: -1 });
        
        console.log(`Found ${transactions.length} transactions for user ID: ${user._id}`);
        
        // Return reminders: Check for books due in 1 day
        const reminders = transactions.filter(tx => {
            if (tx.status === 'Returned') return false;
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return new Date(tx.dueDate).toDateString() === tomorrow.toDateString();
        });

        res.render('user_dashboard', { profileData: user, transactions, reminders, title: 'User Profile' });
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect('/user/login');
    }
});

// Registration Page
router.get('/register', (req, res) => {
    res.render('register', { title: 'User Registration' });
});

// User Registration API with Validation (Requirement 4.2 & 5)
router.post('/register', [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('category').isIn(['student', 'faculty', 'other']).withMessage('Invalid user category')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
        return res.redirect('/user/register');
    }

    try {
        console.log('Registration attempt:', req.body);
        const { userId, name, email, password, category, phoneNumber, photo } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
        if (existingUser) {
            req.flash('error_msg', 'User ID or Email already registered');
            return res.redirect('/user/register');
        }

        // Create new user (Hashing happens in pre-save hook)
        const newUser = new User({ userId, name, email, password, category, phoneNumber, photo });
        await newUser.save();

        req.flash('success_msg', 'Registration successful! Please login.');
        res.redirect('/user/login');
    } catch (err) {
        req.flash('error_msg', 'Registration failed: ' + err.message);
        res.redirect('/user/register');
    }
});

// Login Page
router.get('/login', (req, res) => {
    const type = req.query.type || 'user';
    res.render('login', { title: type === 'admin' ? 'Admin Login' : 'User Login', type });
});

// User Login API with bcrypt verification (Requirement 5)
router.post('/login', async (req, res) => {
    const loginType = req.body.loginType || 'user';
    try {
        const { userId, password } = req.body;
        // Find by userId OR email (case-insensitive)
        const user = await User.findOne({ 
            $or: [
                { userId: { $regex: new RegExp(`^${userId}$`, 'i') } },
                { email: { $regex: new RegExp(`^${userId}$`, 'i') } }
            ]
        });

        if (!user || !(await user.comparePassword(password))) {
            req.flash('error_msg', 'Invalid User ID or Password');
            return res.redirect(`/user/login?type=${loginType}`);
        }

        // Prevent crossing contexts
        if (loginType === 'admin' && user.category !== 'admin') {
            req.flash('error_msg', 'Access Denied: Incorrect portal for users');
            return res.redirect('/user/login?type=admin');
        }
        if (loginType === 'user' && user.category === 'admin') {
            req.flash('error_msg', 'Access Denied: Please use the Admin login button');
            return res.redirect('/user/login?type=user');
        }

        // Set session
        req.session.user = { id: user._id, userId: user.userId, name: user.name, category: user.category };
        
        // Unified Redirection
        if (user.category === 'admin') {
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/user/home');
        }
    } catch (err) {
        req.flash('error_msg', err.message);
        res.redirect(`/user/login?type=${loginType}`);
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/user/login');
});

module.exports = router;
