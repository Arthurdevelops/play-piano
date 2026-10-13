let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  if (!audioContext) audioContext = new AudioContext();
  // Browsers start the context suspended until a user gesture; MIDI input may not count,
  // so we also call this from a click in the UI.
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

/** Call from a user gesture (click) so later MIDI-triggered sounds are allowed to play. */
export function unlockAudio(): void {
  getContext();
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  peak: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playSuccessSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Quick rising major arpeggio (E5, G♯5, B5).
  tone(ctx, 659.25, t, 0.12, "triangle", 0.25);
  tone(ctx, 830.61, t + 0.07, 0.12, "triangle", 0.25);
  tone(ctx, 987.77, t + 0.14, 0.22, "triangle", 0.25);
}

export function playErrorSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Low dissonant buzz.
  tone(ctx, 140, t, 0.3, "sawtooth", 0.15);
  tone(ctx, 148, t, 0.3, "sawtooth", 0.15);
}
