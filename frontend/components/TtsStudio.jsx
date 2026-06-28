'use client';

import { useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const MAX_CHARACTERS = 1000;

const VOICES = [
  {
    id: 'fatima',
    name: 'Fatima',
    detail: 'Female · warm, even cadence',
  },
  {
    id: 'rabiu',
    name: 'Rabiu',
    detail: 'Male · grounded, steady tone',
  },
];

function WaveformBars({ active }) {
  const heights = [40, 70, 100, 65, 85, 50, 75, 95, 55];
  return (
    <div className="flex items-end gap-1 h-10">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full ${active ? 'waveform-bar bg-rust' : 'bg-sandDeep'}`}
          style={{
            height: `${h}%`,
            animationDelay: active ? `${i * 80}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export default function TtsStudio() {
  const [text, setText] = useState(
    "Good morning o! Welcome to Naija Voice — type anything and let's hear how it sounds."
  );
  const [voice, setVoice] = useState(VOICES[0].id);
  const [rate, setRate] = useState(1.0);
  const [status, setStatus] = useState('idle'); // idle | loading | error | ready
  const [errorMsg, setErrorMsg] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const charsLeft = MAX_CHARACTERS - text.length;

  async function handleGenerate(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setStatus('loading');
    setErrorMsg('');
    setIsPlaying(false);

    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voice,
          rate: rate.toFixed(2),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong generating audio.');
      }

      setAudioUrl(data.audioUrl);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Could not reach the server. Try again.');
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center sm:text-left">
          <p className="font-body text-sm uppercase tracking-[0.2em] text-rust">
            Naija Voice
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink sm:text-5xl">
            Hear your words, spoken like home.
          </h1>
          <p className="mt-3 max-w-xl text-base text-ink/70 sm:text-lg">
            Type any text below and Naija Voice reads it back in an authentic
            Nigerian English accent — Fatima or Rabiu, your pick.
          </p>
        </header>

        <form
          onSubmit={handleGenerate}
          className="rounded-2xl border border-sandDeep bg-white/60 p-5 shadow-sm backdrop-blur-sm sm:p-8"
        >
          <label htmlFor="tts-text" className="sr-only">
            Text to convert to speech
          </label>
          <textarea
            id="tts-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARACTERS))}
            rows={6}
            placeholder="Type or paste what you want spoken aloud..."
            className="w-full resize-none rounded-xl border border-sandDeep bg-sand/60 p-4 font-body text-base text-ink placeholder:text-ink/40 focus:border-palm focus:bg-white focus:outline-none"
          />
          <div className="mt-1 flex justify-end text-xs text-ink/50">
            {charsLeft} characters left
          </div>

          <fieldset className="mt-6">
            <legend className="mb-3 font-display text-sm font-semibold text-ink">
              Choose a voice
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {VOICES.map((v) => (
                <label
                  key={v.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors ${
                    voice === v.id
                      ? 'border-palm bg-palm/5'
                      : 'border-sandDeep bg-white/50 hover:border-palm/50'
                  }`}
                >
                  <span>
                    <span className="block font-display text-lg font-semibold text-ink">
                      {v.name}
                    </span>
                    <span className="block text-sm text-ink/60">{v.detail}</span>
                  </span>
                  <input
                    type="radio"
                    name="voice"
                    value={v.id}
                    checked={voice === v.id}
                    onChange={() => setVoice(v.id)}
                    className="h-4 w-4 accent-palm"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="rate" className="font-display text-sm font-semibold text-ink">
                Speaking rate
              </label>
              <span className="text-sm text-ink/60">{rate.toFixed(2)}x</span>
            </div>
            <input
              id="rate"
              type="range"
              min="0.7"
              max="1.4"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-rust"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading' || !text.trim()}
            className="mt-8 w-full rounded-xl bg-palm px-6 py-4 font-display text-lg font-semibold text-sand transition-colors hover:bg-palmDeep disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {status === 'loading' ? 'Generating…' : 'Generate speech'}
          </button>

          {status === 'error' && (
            <p role="alert" className="mt-4 text-sm font-medium text-rust">
              {errorMsg}
            </p>
          )}
        </form>

        {audioUrl && (
          <div className="mt-8 flex items-center gap-5 rounded-2xl border border-sandDeep bg-palm p-5 text-sand sm:p-6">
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={isPlaying ? 'Pause playback' : 'Play audio'}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-palmDeep transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="flex-1">
              <WaveformBars active={isPlaying} />
              <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="mt-3 w-full"
                controls
              />
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-ink/40 sm:text-left">
  Voices: Fatima (Female) &amp; Rabiu (Male) powered by Azure AI Speech.
</footer>
      </div>
    </div>
  );
}
