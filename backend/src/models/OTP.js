// backend/src/models/OTP.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    name: { 
        type: String
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true
    },
    password: { 
        type: String
    },
    otp: { 
        type: String, 
        required: true 
    },
    purpose: {
        type: String,
        enum: ['register', 'forgot-password'],
        required: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: 600 // Automatically self-deletes from MongoDB after 10 minutes
    }
});

module.exports = mongoose.model('OTP', otpSchema);
