const VOICES = {
  fatima: {
    label: "Fatima (Female)",
    azure: "ezinne-female",
  },
  rabiu: {
    label: "Rabiu (Male)",
    azure: "abeo-male",
  },
};

// Normalize old formats (backward compatibility)
const normalizeVoice = (voice) => {
  const map = {
    "fatima-female": "fatima",
    "rabiu-male": "rabiu",
  };

  return map[voice] || voice;
};

const getAzureVoice = (voice) => {
  const clean = normalizeVoice(voice);
  return VOICES[clean]?.azure || VOICES.fatima.azure;
};

module.exports = {
  VOICES,
  normalizeVoice,
  getAzureVoice,
};