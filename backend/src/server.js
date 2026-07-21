const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Automatically reads the .env file from the backend root folder
const connectDB = require('./config/db');
const path = require('path');
const app = express();

app.use(cors()); // Allows our React frontend to communicate with this API
app.use(express.json()); 

// 3. Mount Application Routes
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/problems', require('./routes/problemRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 5. Start Server Listener
const PORT = process.env.PORT || 5000;
connectDB().then(()=> {
    app.listen(PORT, () => {
    console.log(`🚀 Server spinning up from src/ on port ${PORT}`);
     })
})
