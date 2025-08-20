// smsSender.js
const express = require('express');
const twilio = require('twilio');
const app = express();

app.use(express.json());

// Replace with your Twilio credentials
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);
app.get('/', (req, res) => {
    res.redirect('/send-sms');
});

// Send SMS Route
app.get('/send-sms', async (req, res) => {
    // const { to, message } = req.body;

    try {
        const sms = await client.messages.create({
            body: 'Hello from Twilio!', // Message to send
            from: '+1234567890', // Your Twilio number
            to:8757887103             // Receiver's number
        });

        res.status(200).json({ success: true, sid: sms.sid });
    } catch (err) {
        console.error('SMS Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Start Server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
