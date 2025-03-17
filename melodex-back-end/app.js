// melodex-back-end/app.js
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
let client;

async function connectDB() {
  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    // Check and create user_songs collection
    const db = client.db('melodex');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    if (!collectionNames.includes('user_songs')) {
      await db.createCollection('user_songs');
      console.log('Created user_songs collection');
    } else {
      console.log('user_songs collection already exists');
    }
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas or create collection:', error);
    process.exit(1);
  }
}

async function startServer() {
  await connectDB();
  const db = client.db('melodex');
  app.locals.db = db;

  app.use('/api', require('./routes/api'));

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});