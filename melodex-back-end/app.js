const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const uri = process.env.MONGODB_URI;
let client;

async function connectDB() {
  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas:', error);
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