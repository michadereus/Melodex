// melodex-back-end/app.js
const express = require('express');
let MongoClient; // lazy-loaded
require('dotenv').config();
const cors = require('cors');

const app = express();

// --- Health ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running', timestamp: new Date() });
});

// --- CORS ---
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'https://main.dw9xqt12hzzbu.amplifyapp.com',
      'http://main.dw9xqt12hzzbu.amplifyapp.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions), (_req, res) => res.sendStatus(204));

// --- Logging ---
app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url} from ${req.ip}`);
  res.on('finish', () => console.log(`Outgoing: ${req.method} ${req.url} - ${res.statusCode}`));
  next();
});

app.use(express.json());

// --- ⬇️ EAGERLY mount routers so tests see /api/* and /auth/* ---
const { apiRouter, authRouter } = require('./routes/api');
app.use('/api', apiRouter);
app.use(authRouter);
console.log('Routers mounted: /api/* and /auth/*');

// --- DB + server start only when run directly ---
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
let client;

async function connectDB() {
  // Allow tests to disable Mongo entirely
  if (process.env.MONGO_DISABLED_FOR_TESTS === '1') {
    console.log('Mongo disabled for tests — skipping connect');
    return; // no db in app.locals; routes that don’t need it will still work
  }
  try {
    if (!MongoClient) {
      ({ MongoClient } = require('mongodb')); // lazy require
    }
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log('Connected to MongoDB:', uri.includes('localhost') ? 'Local' : 'Atlas');
    app.locals.db = client.db('melodex');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message, error.stack);
  }
}

async function startServer() {
  await connectDB();
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT}`));
}

if (require.main === module) {
  startServer();
}

// --- Graceful shutdown ---
process.on('SIGINT', async () => {
  if (client) await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// --- Error handling ---
app.use((err, _req, res, _next) => {
  if (err && err.message === 'Not allowed by CORS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(403).json({ error: 'CORS error', message: err.message });
  } else {
    res.status(500).json({ error: 'Server error', message: err?.message || 'unknown' });
  }
});

module.exports = app;
