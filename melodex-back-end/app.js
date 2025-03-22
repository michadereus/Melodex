// melodex-back-end/app.js
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running', timestamp: new Date() });
});

app.use(cors({
  origin: 'https://main.dw9xqt12hzzbu.amplifyapp.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
let client;

async function connectDB() {
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    const db = client.db('melodex');
    app.locals.db = db;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message, error.stack);
    // Don’t exit—keep server running for debugging
  }
}

async function startServer() {
  await connectDB();
  try {
    const apiRoutes = require('./routes/api');
    app.use('/api', apiRoutes);
    console.log('API routes mounted');
  } catch (error) {
    console.error('Failed to mount API routes:', error.message, error.stack);
  }

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

startServer();

process.on('SIGINT', async () => {
  if (client) await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});
