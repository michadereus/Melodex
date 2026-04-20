// melodex-back-end/app.js
const express = require('express');
let MongoClient; // lazy-loaded
require('dotenv').config();
const cors = require('cors');

const app = express(); // ✅ MUST come before app.use

// --- CORS (single clean setup) ---
app.use(
  cors({
    origin: [
      "https://www.melodx.io",
      "http://localhost:3000",
      "http://127.0.0.1:3001",
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// --- Health ---
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend is running',
    timestamp: new Date(),
  });
});

// --- Logging ---
app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url} from ${req.ip}`);
  res.on('finish', () =>
    console.log(`Outgoing: ${req.method} ${req.url} - ${res.statusCode}`)
  );
  next();
});

app.use(express.json());

// --- Routes ---
const { apiRouter, authRouter } = require('./routes/api');
app.use('/api', apiRouter);
app.use(authRouter);
console.log('Routers mounted: /api/* and /auth/*');

// --- DB + server start ---
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
let client;

async function connectDB() {
  if (process.env.MONGO_DISABLED_FOR_TESTS === '1') {
    console.log('Mongo disabled for tests — skipping connect');
    return;
  }
  try {
    if (!MongoClient) {
      ({ MongoClient } = require('mongodb'));
    }
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log(
      'Connected to MongoDB:',
      uri.includes('localhost') ? 'Local' : 'Atlas'
    );
    app.locals.db = client.db('melodex');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message, error.stack);
  }
}

async function startServer() {
  await connectDB();
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`Server started on port ${PORT}`)
  );
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
  if (err && err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ error: "CORS error", message: err.message });
  }
});

module.exports = app;