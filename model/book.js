const mongoose = require('mongoose');
// Define the book schema
const bookSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: { type: String, required: true },
    image: { type: String },
    price: { type: String },
    address: { type: String }
});

module.exports = mongoose.model('Book', bookSchema);