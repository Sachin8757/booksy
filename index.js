require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const app = express();
const mongoose = require('mongoose'); // Add this at the top if not already imported
const PORT = process.env.PORT || 3000;
var methodoverride = require('method-override');
const ejsMate = require('ejs-mate');
const path = require('path');
const { defaultMaxListeners } = require('events');
const { error } = require('console');
const port = process.env.PORT || 3000;
const mongodb = require('./model/connection.js');//connection to mongodb
const User = require('./model/user.js'); // user schema
const Book = require('./model/book.js'); // book schema
const nodemailer = require('nodemailer'); // for sending emails
//config for cloudinary
const multer = require('multer')
const { storage } = require('./cloudConfig.js')
const upload = multer({ storage })

// some middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(methodoverride('_method'));
app.set("views engin", "/views")
app.set("views", path.join(__dirname, "/views"))
app.use(express.static(path.join(__dirname, "/public")))
app.engine("ejs", ejsMate);

// Add session and passport initialization
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy setup
passport.serializeUser(function (user, done) {
    done(null, user.id);
});
passport.deserializeUser(async function (id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

//registion route
app.get('/register', (req, res) => {
    res.render('register.ejs');
});
// registration post route
app.post('/register', async (req, res) => {
    const { name, phoneNumber, gmail, password } = req.body;
    const newUser = new User({
        name: name,
        phoneNumber: phoneNumber,
        gmail: gmail,
        password: password
    });
    try {
        const demouser = new User({
            name: name,
            phoneNumber: phoneNumber,
            gmail: gmail
        })
        demouser.password = password; // You should hash the password before saving in production
        let newuser = await demouser.save();
        req.login(newuser, (err) => {
            if (err) {
                return next(err);
            }
            res.redirect("/")
        })
    } catch (error) {
        console.error('Error registering user:', error);
        res.redirect("/register");
    }

});


//login route
app.get('/login', (req, res) => {
    res.render('login.ejs');
})
app.post('/login', async (req, res) => {
    const { phoneNumber, password } = req.body;
    try {
        const user = await User.findOne({ phoneNumber: phoneNumber });
        if (!user || user.password !== password) {
            console.log('Invalid email or password');
            return res.redirect('/login');
        }
        req.session.userId = user._id; // Assuming you are using session to track logged in users
        res.redirect('/');
    } catch (err) {
        console.error('Error finding user:', err);
        return res.redirect('/login');
    }
})
function isLoggedIn(req, res, next) {
    // Simple check: you can use session, JWT, or any authentication mechanism
    // For demonstration, let's assume req.session.userId is set when logged in
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login'); // Redirect to login if not authenticated
}
// logout route
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error logging out:', err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

//index route
app.get('/', async (req, res) => {
    const books = await Book.find();



    const islog = req.session && req.session.userId ? true : false; // Check if user is logged in
    res.render('index.ejs', { books, islog });
});
//about route
app.get('/about', (req, res) => {
    res.render('about.ejs');
})
// book route
app.get('/addbook', isLoggedIn, (req, res) => {
    res.render('addbook.ejs');
});
app.post('/books/add', isLoggedIn, upload.single('image'), async (req, res) => {
    try {
        const { title, price, address } = req.body;
        let image = req.file.path;
        const owner = req.session.userId; // Assuming user ID is stored in session
        const newBook = new Book({ owner, title, image, price, address });
        await newBook.save();
        const user = await User.findById(owner);
        if (!user) return res.status(404).send('User not found');

        user.book.push(newBook._id); // Push the book ID to user's book array
        await user.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error saving book: ' + err.message);
    }
});

// show book details route
app.get('/detailsbook/:id', async (req, res) => {

    try {
        const bookId = req.params.id;
        const islog = req.session && req.session.userId ? true : false;
        const userId = req.session.userId; // Get the user ID from the session
        const book = await Book.findById(bookId).populate('owner', 'name , phoneNumber'); // Populate owner field
        if (!book) return res.status(404).send('Book not found');
        res.render('showBookDetail.ejs', { book, islog, userId }); // Pass the book and user to the view
    } catch (err) {
        res.status(500).send('Error fetching book: ' + err.message);
    }
});
// delete book route
app.get('/deletebook/:id', isLoggedIn, async (req, res) => {
    try {
        const bookId = req.params.id;
        await Book.findByIdAndDelete(bookId);
    } catch (err) {
        console.error('Error deleting book:', err);
        return res.status(500).send('Error deleting book');
    }
    res.redirect("/")
});


// edit book route

//sow all order route
app.get('/myorder', isLoggedIn, async (req, res) => {
    const islog = req.session && req.session.userId ? true : false; // Check if user is logged in
    const userId = req.session.userId; // Get the user ID from the session
    const books = await Book.find({ order: userId }) // Populate the order field
    res.render('myorder.ejs', { books, islog });
});

// order book route
app.get('/orderbook/:id', isLoggedIn, async (req, res) => {
    try {
        const bookId = req.params.id;
        const userId = req.session.userId // Get the user ID from the session
        //find the book by ID
        const book = await Book.findOne({ _id: bookId }).populate('owner', 'name gmail phoneNumber'); // Populate owner field
        if (!book) return res.status(404).send('Book not found');
        //find the user by ID
        let user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');

        // order the book
        user.order.push(book._id); // Push the book ID to user's order array
        book.order.push(user._id); // Push the user ID to book's order array
        await user.save();
        await book.save();
        // Send email notification to user who ordered the book
        var transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: 'sachin875788@gmail.com ',
                pass: process.env.gmailpass // Use environment variable for security
            }
        });
        var mailOption = {
            form: 'sachin875788@gmail.com',
            to: user.gmail,
            subject: 'Order Confirmation',
            text: `Your order for the book "${book.title}" has been placed successfully. Thank you for your order!`
        }
        transporter.sendMail(mailOption, function (error, info) {
            if (error) {
                console.log(error);
            }
        })
        //send email notification to the book owner
        var transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: 'sachin875788@gmail.com ',
                pass: process.env.gmailpass // Use environment variable for security
            }
        });
        var mailOption = {
            form: 'sachin875788@gmail.com',
            to: book.owner.gmail, // Assuming book.owner has a gmail field
            subject: 'Order Confirmation',
            text: `Your book "${book.title}" has been ordered by ${user.name}. Thank you for your contribution!
            you can contact the user at ${user.phoneNumber} or ${user.gmail} for further details.`
        }
        console.log(book.owner.gmail)
        transporter.sendMail(mailOption, function (error, info) {
            if (error) {
                console.log(error);
            }
        })
        // Redirect to home page after ordering
        res.redirect('/');
    } catch (err) {
        console.error('Error ordering book:', err);
        res.status(500).send('Error ordering book');
    }
});


// Connect to MongoDB
app.listen(PORT, () => {
    console.log(`Server running on port:${PORT}`);
});