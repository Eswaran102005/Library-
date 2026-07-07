require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const session = require('express-session');
const flash = require('connect-flash-plus');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.engine('ejs', require('ejs-mate'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'library-secret-key',
    resave: false,
    saveUninitialized: false
}));

app.use(flash());

// Global variables for flash messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg') || [];
    res.locals.error_msg = req.flash('error_msg') || [];
    res.locals.user = req.session.user || null;
    next();
});

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_library';
mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        console.log('Starting app in offline mode - make sure MongoDB is configured in deployment');
    });

// Routes
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

app.use('/admin', adminRoutes);
app.use('/user', userRoutes);

app.get('/', (req, res) => {
    res.redirect('/user/login');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
