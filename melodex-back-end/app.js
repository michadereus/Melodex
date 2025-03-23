// melodex-back-end/app.js
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running', timestamp: new Date() });
});

const allowedOrigins = [
  'https://main.dw9xqt12hzzbu.amplifyapp.com',
  'http://localhost:3000', // Frontend port
  'http://localhost:3001' // Add this if frontend runs on 3001
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Explicit OPTIONS handler
app.options('*', (req, res) => {
  console.log('CORS preflight request received:', req.method, req.url);
  res.set('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:3000');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  res.on('finish', () => {
    console.log(`Response: ${res.statusCode}, Headers:`, res.getHeaders());
  });
  next();
});

app.use(express.json());

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
let client;

async function connectDB() {
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log('Connected to MongoDB:', uri.includes('localhost') ? 'Local' : 'Atlas');
    const db = client.db('melodex');
    app.locals.db = db;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message, error.stack);
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