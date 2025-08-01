const mongoose = require('mongoose');

mongoose.connect(process.env.ATLASDB_URL)
.then(() => {
    console.log('MongoDB connected successfully');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
});

module.exports = mongoose;