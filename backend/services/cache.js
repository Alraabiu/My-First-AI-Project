const crypto = require('crypto');

const cache = new Map();

// create unique key from request
function getKey({ text, voice, rate, pitch }) {
  return crypto
    .createHash('md5')
    .update(`${text}|${voice}|${rate}|${pitch}`)
    .digest('hex');
}

function getFromCache(key) {
  return cache.get(key);
}

function saveToCache(key, value) {
  cache.set(key, {
    value,
    time: Date.now(),
  });
}

// optional cleanup (prevents memory growth)
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of cache.entries()) {
    if (now - data.time > 60 * 60 * 1000) {
      cache.delete(key);
    }
  }
}, 30 * 60 * 1000);

module.exports = {
  getKey,
  getFromCache,
  saveToCache,
};