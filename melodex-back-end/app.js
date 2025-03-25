// melodex-back-end/app.js
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const app = express();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running', timestamp: new Date() });
});

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
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions), (req, res) => {
  res.sendStatus(204);
});

app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url} from ${req.ip}`);
  res.on('finish', () => {
    console.log(`Outgoing: ${req.method} ${req.url} - ${res.statusCode}`);
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
    app.locals.db = client.db('melodex');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message, error.stack);
  }
}

async function startServer() {
  await connectDB();
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
  console.log('API routes mounted');

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
  });
}

startServer();

process.on('SIGINT', async () => {
  if (client) await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Error handling middleware for CORS errors
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.set('Access-Control-Allow-Origin', '*'); // Temporary for debugging
    res.status(403).json({ error: 'CORS error', message: err.message });
  } else {
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});