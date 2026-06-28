const express = require('express');
const rateLimit = require('express-rate-limit');
const { synthesizeSpeech, VOICES } = require('../services/azureTts');

const {
  getKey,
  getFromCache,
  saveToCache,
} = require('../services/cache');

const router = express.Router();

// ----------------------------
// Rate limiter
// ----------------------------
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: 'Too many requests. Please wait a moment and try again.',
  },
});

// ----------------------------
// Config
// ----------------------------
const MAX_CHARACTERS = 1000;

// ----------------------------
// Helper: build audio URL
// ----------------------------
function buildAudioUrl(req, filename) {
  const base =
    process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

  return `${base.replace(/\/$/, '')}/audio/${filename}`;
}

// ----------------------------
// Get available voices
// ----------------------------
router.get('/voices', (req, res) => {
  res.json({
    voices: Object.keys(VOICES).map((id) => ({
      id,
      label: id === 'fatima' ? 'Fatima (Female)' : 'Rabiu (Male)',
    })),
  });
});

// ----------------------------
// Generate speech
// ----------------------------
router.post('/tts', ttsLimiter, async (req, res) => {
  try {
    const { text, voice, rate, pitch } = req.body || {};

    // Validate text
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        error: 'Text is required.',
      });
    }

    if (text.length > MAX_CHARACTERS) {
      return res.status(400).json({
        error: `Max ${MAX_CHARACTERS} characters allowed.`,
      });
    }

    // Validate voice (default to fatima)
    const finalVoice = VOICES[voice] ? voice : 'fatima';

    // Cache key
    const key = getKey({
      text: text.trim(),
      voice: finalVoice,
      rate: rate || '1.0',
      pitch: pitch || '0%',
    });

    // Check cache first
    const cached = getFromCache(key);
    if (cached) {
      return res.json({
        audioUrl: cached.value,
        cached: true,
        voice: finalVoice,
      });
    }

    // Generate speech
    const filename = await synthesizeSpeech({
      text: text.trim(),
      voice: finalVoice,
      rate: rate || '1.0',
      pitch: pitch || '0%',
    });

    const audioUrl = buildAudioUrl(req, filename);

    // Save to cache
    saveToCache(key, audioUrl);

    return res.json({
      audioUrl,
      cached: false,
      voice: finalVoice,
    });
  } catch (err) {
    console.error('TTS error:', err.message);

    if (err.response?.status === 401) {
      return res.status(500).json({
        error: 'Azure credentials invalid',
      });
    }

    if (err.response?.status === 429) {
      return res.status(503).json({
        error: 'Azure quota exceeded',
      });
    }

    return res.status(500).json({
      error: 'Failed to generate audio',
    });
  }
});

module.exports = router;