const express = require('express');
const rateLimit = require('express-rate-limit');
const { synthesizeSpeech, VOICES } = require('../services/azureTts');

const router = express.Router();

// Basic abuse protection — adjust to taste once you have real traffic patterns.
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

const MAX_CHARACTERS = 1000;

function buildAudioUrl(req, filename) {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/audio/${filename}`;
}

router.get('/voices', (req, res) => {
  res.json({
    voices: Object.entries(VOICES).map(([id, azureName]) => ({
      id,
      azureName,
     label: id === 'fatima-female' ? 'Fatima (Female)' : 'Rabiu (Male)',
    })),
  });
});

router.post('/tts', ttsLimiter, async (req, res) => {
  try {
    const { text, voice, rate, pitch } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Field "text" is required.' });
    }

    if (text.length > MAX_CHARACTERS) {
      return res.status(400).json({
        error: `Text is too long. Max ${MAX_CHARACTERS} characters per request.`,
      });
    }

    if (voice && !VOICES[voice]) {
      return res.status(400).json({
        error: `Unknown voice "${voice}". Valid options: ${Object.keys(VOICES).join(', ')}`,
      });
    }

    const filename = await synthesizeSpeech({
      text: text.trim(),
      voice,
      rate: rate || '1.0',
      pitch: pitch || '0%',
    });

    return res.json({
      audioUrl: buildAudioUrl(req, filename),
      voice: voice || 'fatima-female',
    });
  } catch (err) {
    console.error('TTS generation failed:', err.response?.data?.toString?.() || err.message);

    if (err.response?.status === 401) {
      return res.status(500).json({ error: 'Azure Speech credentials are invalid.' });
    }
    if (err.response?.status === 429) {
      return res.status(503).json({ error: 'Azure Speech quota exceeded. Try again shortly.' });
    }

    return res.status(500).json({ error: 'Failed to generate audio. Please try again.' });
  }
});

module.exports = router;
