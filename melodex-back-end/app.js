// melodex-back-end/app.js
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running', timestamp: new Date() });
});

// CORS configuration
const corsOptions = {
  origin: 'https://main.dw9xqt12hzzbu.amplifyapp.com', // Your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS for preflight
  allowedHeaders: ['Content-Type', 'Authorization'], // Add Authorization if needed
  credentials: false, // Set to true if cookies/auth are used
  preflightContinue: false, // Ensure preflight requests are handled
  optionsSuccessStatus: 204, // Standard response for OPTIONS
};

app.use(cors(corsOptions));

// Handle CORS preflight requests explicitly
app.options('*', cors(corsOptions), (req, res) => {
  console.log('CORS preflight request received:', req.method, req.url);
  res.sendStatus(204); // No Content response for OPTIONS
});

// Middleware to log requests and CORS headers
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
    console.log('Connected to MongoDB Atlas');
    const db = client.db('melodex');
    app.locals.db = db;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message, error.stack);
    // Keep server running for debugging
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