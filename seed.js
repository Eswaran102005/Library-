const mongoose = require('mongoose');
const User = require('./models/user');
const Book = require('./models/book');

// Use Atlas or other connection string from environment, fallback to localhost
const mongoURI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/campus_library';

function maskUri(uri) {
    try {
        return uri.replace(/(mongodb(?:\+srv)?:\/\/)(.*@)/, '$1<credentials>@');
    } catch (e) {
        return uri;
    }
}

async function seed() {
    try {
        console.log('Connecting to MongoDB at', maskUri(mongoURI));
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000
        });
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Book.deleteMany({});

        // Add dummy users (Hashing happens in model pre-save hook)
        const user1 = new User({ 
            userId: 'S101', 
            password: 'password123',
            name: 'John Student', 
            category: 'student', 
            email: 'john@uni.edu',
            phoneNumber: '9876543210'
        });
        const user2 = new User({ 
            userId: 'F201', 
            password: 'password123',
            name: 'Dr. Smith', 
            category: 'faculty', 
            email: 'smith@uni.edu',
            phoneNumber: '1234567890'
        });
        
        await user1.save();
        await user2.save();
        const adminUser = new User({
            userId: 'A001',
            password: 'admin123',
            name: 'Library Admin',
            category: 'admin',
            email: 'admin@library.edu',
            phoneNumber: '5550001111'
        });
        await adminUser.save();
        console.log('Seed: Users added with hashed passwords');

        // Add dummy books
        const books = [
            {
                bookId: 'B001',
                name: 'The Great Gatsby',
                quantity: 10,
                availableQuantity: 10,
                ratePerQuantity: 20,
                dateOfPayment: new Date(),
                paidBy: 'Main Library',
                totalAmount: 200
            },
            {
                bookId: 'B002',
                name: 'Clean Code',
                quantity: 5,
                availableQuantity: 5,
                ratePerQuantity: 50,
                dateOfPayment: new Date(),
                paidBy: 'CS Dept',
                totalAmount: 250
            }
        ];
        await Book.insertMany(books);
        console.log('Seed: Books added');

        mongoose.connection.close();
        console.log('Database seeded and connection closed');
    } catch (err) {
        console.error('Seed Error:', err);
    }
}

seed();
