
const mongoose = require('mongoose');

const { AsyncLocalStorage } = require('async_hooks');
const queryLocalStorage = new AsyncLocalStorage();

let totalMongoQueries = 0;

mongoose.set('debug', () => {
    totalMongoQueries++;
    const store = queryLocalStorage.getStore();
    if (store && typeof store.mongoQueries === 'number') {
        store.mongoQueries++;
    }
});

const getMongoQueryCount = () => {
    const store = queryLocalStorage.getStore();
    if (store && typeof store.mongoQueries === 'number') {
        return store.mongoQueries;
    }
    return totalMongoQueries;
};

const resetMongoQueryCount = () => {
    totalMongoQueries = 0;
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Database Connection Error: ${error.message}`);
        process.exit(1); 
    }
};

module.exports = connectDB;
module.exports.getMongoQueryCount = getMongoQueryCount;
module.exports.resetMongoQueryCount = resetMongoQueryCount;
module.exports.queryLocalStorage = queryLocalStorage;