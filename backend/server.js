require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const ttsRouter = require('./routes/tts');
const { cleanupOldAudio, AUDIO_DIR } = require('./services/azureTts');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-to-server requests with no Origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '100kb' }));

// Serve generated audio files statically at /audio/<filename>.mp3
app.use('/audio', express.static(AUDIO_DIR, { maxAge: '1h' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', ttsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`Naija TTS backend listening on port ${PORT}`);
});

// Sweep stale audio files every 15 minutes so disk doesn't fill up
setInterval(cleanupOldAudio, 15 * 60 * 1000);
