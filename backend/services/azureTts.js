const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ----------------------------
// SINGLE SOURCE OF TRUTH
// ----------------------------
const VOICES = {
  fatima: {
    azure: "ezinne-female",
  },
  rabiu: {
    azure: "abeo-male",
  },
};

// ----------------------------
// Normalize old formats safely
// ----------------------------
function normalizeVoice(voice) {
  const map = {
    'fatima-female': 'fatima',
    'rabiu-male': 'rabiu',
  };

  return map[voice] || voice || 'fatima';
}

// ----------------------------
// AUDIO DIRECTORY
// ----------------------------
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// ----------------------------
// SSML escape
// ----------------------------
function escapeForSsml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ----------------------------
// Build SSML
// ----------------------------
function buildSsml({ text, voiceId, rate, pitch }) {
  return `
<speak version="1.0"
xmlns="http://www.w3.org/2001/10/synthesis"
xml:lang="en-NG">
  <voice name="${voiceId}">
    <prosody rate="${rate}" pitch="${pitch}">
      ${escapeForSsml(text)}
    </prosody>
  </voice>
</speak>`;
}

// ----------------------------
// MAIN FUNCTION
// ----------------------------
async function synthesizeSpeech({
  text,
  voice = 'fatima',
  rate = '1.0',
  pitch = '0%',
}) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    throw new Error('Azure Speech credentials are missing.');
  }

  // Normalize voice
  const cleanVoice = normalizeVoice(voice);

  // Get Azure voice safely
  const voiceId = VOICES[cleanVoice]?.azure || VOICES.fatima.azure;

  const response = await axios.post(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    buildSsml({
      text,
      voiceId,
      rate,
      pitch,
    }),
    {
      responseType: 'arraybuffer',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
        'User-Agent': 'Naija Voice',
      },
    }
  );

  const filename = `${uuidv4()}.mp3`;

  fs.writeFileSync(
    path.join(AUDIO_DIR, filename),
    response.data
  );

  return filename;
}

// ----------------------------
// CLEANUP OLD FILES
// ----------------------------
function cleanupOldAudio() {
  const ttl =
    (Number(process.env.AUDIO_TTL_MINUTES) || 60) *
    60 *
    1000;

  fs.readdir(AUDIO_DIR, (err, files) => {
    if (err) return;

    files.forEach((file) => {
      const full = path.join(AUDIO_DIR, file);

      fs.stat(full, (err, stat) => {
        if (err) return;

        if (Date.now() - stat.mtimeMs > ttl) {
          fs.unlink(full, () => {});
        }
      });
    });
  });
}

// ----------------------------
// EXPORTS
// ----------------------------
module.exports = {
  synthesizeSpeech,
  cleanupOldAudio,
  AUDIO_DIR,
  VOICES,
};