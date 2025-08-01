require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const app = express();
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
    const { name, phoneNumber, password } = req.body;
    const newUser = new User({
        name: name,
        phoneNumber: phoneNumber,
        password: password
    });
    try {
        const demouser = new User({
            name: name,
            phoneNumber: phoneNumber
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
app.get('/',async (req, res) => {
    const books= await Book.find();
    const islog= req.session && req.session.userId ? true : false; // Check if user is logged in
    res.render('index.ejs',{books,islog});
});
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
  const bookId = req.params.id;

  try {
    const book = await Book.findById(bookId).populate('owner', 'name'); // Populate owner field with user name
    if (!book) return res.status(404).send('Book not found');
    res.render('showBookDetail.ejs',{ book });
  } catch (err) {
    res.status(500).send('Error fetching book: ' + err.message);
  }
});



app.listen(PORT, () => {
    console.log(`Server running on port:${PORT}`);
});