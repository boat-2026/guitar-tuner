'use client';

import { useEffect, useRef, useState } from 'react';

const STRINGS = [
  { name: 'E', octave: 2, hz: 82.41 }, { name: 'A', octave: 2, hz: 110 },
  { name: 'D', octave: 3, hz: 146.83 }, { name: 'G', octave: 3, hz: 196 },
  { name: 'B', octave: 3, hz: 246.94 }, { name: 'E', octave: 4, hz: 329.63 },
];

function closestString(hz: number) { return STRINGS.reduce((best, string) => Math.abs(1200 * Math.log2(hz / string.hz)) < Math.abs(1200 * Math.log2(hz / best.hz)) ? string : best); }
function detectPitch(buffer: Float32Array, sampleRate: number) {
  let rms = 0; for (const value of buffer) rms += value * value;
  if (Math.sqrt(rms / buffer.length) < 0.012) return -1;
  let bestLag = -1, bestCorrelation = 0;
  for (let lag = Math.floor(sampleRate / 420); lag <= Math.floor(sampleRate / 70); lag += 1) {
    let correlation = 0; for (let index = 0; index < buffer.length - lag; index += 1) correlation += buffer[index] * buffer[index + lag];
    if (correlation > bestCorrelation) { bestCorrelation = correlation; bestLag = lag; }
  }
  return bestLag > 0 ? sampleRate / bestLag : -1;
}

export default function Home() {
  const [started, setStarted] = useState(false), [micError, setMicError] = useState(false);
  const [reading, setReading] = useState<{ note: string; octave: number; hz: number; cents: number }>();
  const streamRef = useRef<MediaStream | null>(null), animationRef = useRef<number | null>(null);
  useEffect(() => () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);
  async function startTuner() {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream; const audio = new AudioContext(); await audio.resume().catch(() => {}); const source = audio.createMediaStreamSource(stream), analyser = audio.createAnalyser(); analyser.fftSize = 2048;
      const samples = new Float32Array(analyser.fftSize); source.connect(analyser); setStarted(true); let smoothed: number | null = null;
      const listen = () => { analyser.getFloatTimeDomainData(samples); const pitch = detectPitch(samples, audio.sampleRate);
        if (pitch > 70 && pitch < 420) { smoothed = smoothed ? smoothed * 0.72 + pitch * 0.28 : pitch; const target = closestString(smoothed); setReading({ note: target.name, octave: target.octave, hz: smoothed, cents: Math.max(-50, Math.min(50, 1200 * Math.log2(smoothed / target.hz))) }); }
        animationRef.current = requestAnimationFrame(listen); };
      listen();
    } catch { setMicError(true); }
  }
  useEffect(() => { void startTuner(); }, []);
  const cents = reading?.cents ?? -14, inTune = !!reading && Math.abs(cents) <= 4;
  const activeIndex = reading ? STRINGS.findIndex((string) => string.name === reading.note && string.octave === reading.octave) : -1;
  const message = micError ? 'Microphone needed' : !started ? 'Tap to start' : !reading ? 'Play a string' : inTune ? 'IN TUNE' : `${Math.round(Math.abs(cents))} cents ${cents < 0 ? 'flat' : 'sharp'}`;
  return <main className="tuner-shell">
    <header><span>GUITAR TUNER</span><span className={started ? 'listening show' : 'listening'}>LISTENING</span></header>
    <section className="note-block" aria-live="polite"><div className="note">{reading?.note ?? '—'}</div><div className="frequency">{reading ? `${reading.note}${reading.octave} · ${reading.hz.toFixed(1)} Hz` : 'Waiting for a note'}</div></section>
    <section className="meter" aria-label="Tuning meter"><svg viewBox="0 0 380 220" aria-hidden="true">{Array.from({ length: 21 }, (_, index) => { const value = -50 + index * 5, angle = (value / 50) * 72 - 90, radians = (angle * Math.PI) / 180, r1 = value % 10 === 0 ? 165 : 171, x1 = 190 + r1 * Math.cos(radians), y1 = 205 + r1 * Math.sin(radians), x2 = 190 + 188 * Math.cos(radians), y2 = 205 + 188 * Math.sin(radians); return <path key={value} className={value === 0 ? 'center' : value % 10 === 0 ? 'major' : ''} d={`M${x1} ${y1}L${x2} ${y2}`} />; })}</svg><div className={`needle${inTune ? ' tuned' : ''}`} style={{ transform: `rotate(${cents * 1.44}deg)` }} /><div className="meter-labels"><span>FLAT</span><span>SHARP</span></div></section>
    <div className={inTune ? 'status tuned-text' : 'status'} aria-live="polite">{message}</div>
    <div className="strings" aria-label="Standard guitar tuning">{STRINGS.map((string, index) => <span className={index === activeIndex ? 'string active' : 'string'} key={`${string.name}${string.octave}`}>{string.name}</span>)}</div>
    <div className="prompt">{micError ? 'Allow microphone access, then try again.' : started ? 'Hold your phone near the guitar.' : 'Your tuner is ready.'}</div>
    {micError && <button className="start" onClick={startTuner}>Enable microphone</button>}
  </main>;
}
