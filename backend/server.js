require('dotenv').config();

const express = require('express');
const cors = require('cors');

const ttsRouter = require('./routes/tts');
const { cleanupOldAudio, AUDIO_DIR } = require('./services/azureTts');

const app = express();
const PORT = process.env.PORT || 5000;

const isDev = process.env.NODE_ENV !== 'production';

// Trust proxy (important for Render/Heroku/etc.)
app.set('trust proxy', 1);

// ----------------------------
// CORS
// ----------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (Postman, server-to-server)
      if (!origin) return callback(null, true);

      // Dev mode: allow everything if no list provided
      if (isDev && allowedOrigins.length === 0) {
        return callback(null, true);
      }

      // Production rule
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

// ----------------------------
// Middleware
// ----------------------------
app.use(express.json({ limit: '100kb' }));

// Serve audio files (consider protecting this in future)
app.use('/audio', express.static(AUDIO_DIR, {
  maxAge: '1h',
}));

// ----------------------------
// Routes
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

app.use('/api', ttsRouter);

// ----------------------------
// 404 Handler
// ----------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ----------------------------
// Error Handler
// ----------------------------
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// ----------------------------
// Start Server
// ----------------------------
const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log(' Naija Voice Backend');
  console.log('========================================');
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Audio directory: ${AUDIO_DIR}`);
  console.log('========================================');
});

// ----------------------------
// Graceful shutdown
// ----------------------------
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  server.close(() => process.exit(0));
});

// ----------------------------
// Cleanup job (disable if serverless)
// ----------------------------
if (!process.env.SERVERLESS) {
  setInterval(cleanupOldAudio, 15 * 60 * 1000);
}

// Run once on startup
cleanupOldAudio();