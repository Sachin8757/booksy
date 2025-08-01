const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        unique: true // Make phoneNumber unique (acts as primary key)
    },
    password: {
        type: String,
        required: true
    },
    order: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'book'
    }],
    book: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    }]
});
module.exports = mongoose.model('User', userSchema);