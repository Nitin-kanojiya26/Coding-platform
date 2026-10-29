const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(uri);
  const Contest = mongoose.model('Contest', new mongoose.Schema({}, { strict: false }));
  const res = await Contest.updateMany({}, { $set: { allowLateJoin: false } });
  console.log('Successfully updated contests in MongoDB:', res);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
