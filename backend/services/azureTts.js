const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// The two genuine Nigerian-English neural voices Azure Speech offers.
// (AWS Polly and Google Cloud TTS do not currently offer an en-NG locale,
// which is why this project uses Azure Speech for synthesis.)
const VOICES = {
  'ezinne-female': 'en-NG-EzinneNeural',
  'abeo-male': 'en-NG-AbeoNeural',
};

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function escapeForSsml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSsml({ text, voiceId, rate, pitch }) {
  const safeText = escapeForSsml(text);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-NG">
  <voice name="${voiceId}">
    <prosody rate="${rate}" pitch="${pitch}">${safeText}</prosody>
  </voice>
</speak>`;
}

/**
 * Calls the Azure Speech REST endpoint and saves the resulting MP3 to disk.
 * Returns the generated filename (not the full URL — that's built by the route).
 */
async function synthesizeSpeech({ text, voice = 'ezinne-female', rate = '1.0', pitch = '0%' }) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    throw new Error('Azure Speech credentials are not configured on the server.');
  }

  const voiceId = VOICES[voice] || VOICES['ezinne-female'];
  const ssml = buildSsml({ text, voiceId, rate, pitch });

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await axios.post(endpoint, ssml, {
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      // 48kHz mp3 is a good balance of quality and file size
      'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
      'User-Agent': 'naija-tts-app',
    },
    responseType: 'arraybuffer',
    timeout: 20000,
  });

  const filename = `${uuidv4()}.mp3`;
  const filePath = path.join(AUDIO_DIR, filename);
  fs.writeFileSync(filePath, response.data);

  return filename;
}

/** Deletes audio files older than AUDIO_TTL_MINUTES. Called on a timer from server.js. */
function cleanupOldAudio() {
  const ttlMs = (Number(process.env.AUDIO_TTL_MINUTES) || 60) * 60 * 1000;
  const now = Date.now();

  fs.readdir(AUDIO_DIR, (err, files) => {
    if (err) return;
    files.forEach((file) => {
      const filePath = path.join(AUDIO_DIR, file);
      fs.stat(filePath, (statErr, stats) => {
        if (statErr) return;
        if (now - stats.mtimeMs > ttlMs) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}

module.exports = { synthesizeSpeech, cleanupOldAudio, VOICES, AUDIO_DIR };
