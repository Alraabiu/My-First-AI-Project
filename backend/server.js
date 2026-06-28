require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const ttsRouter = require('./routes/tts');
const { cleanupOldAudio, AUDIO_DIR } = require('./services/azureTts');

const app = express();
const PORT = process.env.PORT || 5000;

// Required when deploying behind Render's proxy
app.set('trust proxy', 1);

// ----------------------------
// CORS
// ----------------------------

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);

// ----------------------------
// Middleware
// ----------------------------

app.use(express.json({ limit: '100kb' }));

// Serve generated MP3 files
app.use(
  '/audio',
  express.static(AUDIO_DIR, {
    maxAge: '1h',
  })
);

// ----------------------------
// Health Check
// ----------------------------

app.get('/', (req, res) => {
  res.json({
    success: true,
    app: 'Naija Voice Backend',
    status: 'Running',
    version: '1.1.0',
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
  });
});

// ----------------------------
// API Routes
// ----------------------------

app.use('/api', ttsRouter);

// ----------------------------
// 404
// ----------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ----------------------------
// Global Error Handler
// ----------------------------

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// ----------------------------
// Start Server
// ----------------------------

app.listen(PORT, () => {
  console.log('========================================');
  console.log(' Naija Voice Backend');
  console.log('========================================');
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Audio directory: ${AUDIO_DIR}`);
  console.log('========================================');
});

// Clean old audio every 15 minutes
setInterval(cleanupOldAudio, 15 * 60 * 1000);

// Run cleanup immediately on startup
cleanupOldAudio();