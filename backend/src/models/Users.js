
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        unique:true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    avatar: {
        type: String,
        default: '', // or a default avatar URL
    },
    solvedProblems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem'
    }],
    bookmarkedProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    bannedAt: { type: Date, default: null },

}, {
    timestamps: true // Automatically creates 'createdAt' and 'updatedAt' fields
});

// Middleware: Automatically hash the password before saving a user document
userSchema.pre('save', async function() {
    // 'this' refers to the current user document being saved
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Helper Method remains unchanged:
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
