const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ----------------------------------------------------
// Voice aliases used by your frontend
// ----------------------------------------------------
const VOICES = {
  fatima: {
    azure: 'en-NG-EzinneNeural',
  },
  rabiu: {
    azure: 'en-NG-AbeoNeural',
  },
};

// ----------------------------------------------------
// Support old frontend IDs too
// ----------------------------------------------------
function normalizeVoice(voice) {
  switch (voice) {
    case 'fatima-female':
      return 'fatima';

    case 'rabiu-male':
      return 'rabiu';

    default:
      return voice || 'fatima';
  }
}

// ----------------------------------------------------
// Audio directory
// ----------------------------------------------------
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// ----------------------------------------------------
// Escape XML
// ----------------------------------------------------
function escapeForSsml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ----------------------------------------------------
// Build SSML
// ----------------------------------------------------
function buildSsml({
  text,
  voiceId,
  rate = '0%',
  pitch = '0%',
}) {
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

// ----------------------------------------------------
// Generate Speech
// ----------------------------------------------------
async function synthesizeSpeech({
  text,
  voice = 'fatima',
  rate = '0%',
  pitch = '0%',
}) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    throw new Error('Azure Speech credentials are missing.');
  }

  const cleanVoice = normalizeVoice(voice);

  const voiceId =
    VOICES[cleanVoice]?.azure ||
    VOICES.fatima.azure;

  console.log('Using Azure Voice:', voiceId);

  let response;

  try {
    response = await axios.post(
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
          'X-Microsoft-OutputFormat':
            'audio-48khz-192kbitrate-mono-mp3',
          'User-Agent': 'Naija Voice',
        },
      }
    );
  } catch (err) {
    console.error('========== AZURE ERROR ==========');
    console.error('Status:', err.response?.status);

    if (err.response?.data) {
      console.error(
        Buffer.from(err.response.data).toString()
      );
    }

    console.error('=================================');

    throw err;
  }

  const filename = `${uuidv4()}.mp3`;

  fs.writeFileSync(
    path.join(AUDIO_DIR, filename),
    response.data
  );

  return filename;
}

// ----------------------------------------------------
// Cleanup old audio
// ----------------------------------------------------
function cleanupOldAudio() {
  const ttl =
    (Number(process.env.AUDIO_TTL_MINUTES) || 60) *
    60 *
    1000;

  fs.readdir(AUDIO_DIR, (err, files) => {
    if (err) return;

    files.forEach((file) => {
      const fullPath = path.join(AUDIO_DIR, file);

      fs.stat(fullPath, (err, stat) => {
        if (err) return;

        if (Date.now() - stat.mtimeMs > ttl) {
          fs.unlink(fullPath, () => {});
        }
      });
    });
  });
}

module.exports = {
  synthesizeSpeech,
  cleanupOldAudio,
  AUDIO_DIR,
  VOICES,
};