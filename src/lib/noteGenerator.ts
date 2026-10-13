export type Clef = "treble" | "bass";
export type ClefMode = Clef | "both";
export type Difficulty = "easy" | "medium" | "hard";

export type Step = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export interface RandomNote {
  clef: Clef;
  step: Step;
  /** -1 = flat, 0 = natural, 1 = sharp */
  alter: -1 | 0 | 1;
  /** Scientific pitch notation octave (C4 = middle C). */
  octave: number;
  midi: number;
}

const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const STEP_SEMITONES: Record<Step, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
// Only common accidentals (no E♯, B♯, C♭, F♭) to keep reading exercises idiomatic.
const SHARPABLE = new Set<Step>(["C", "D", "F", "G", "A"]);
const FLATTABLE = new Set<Step>(["D", "E", "G", "A", "B"]);

/** Diatonic index of a natural note: C4 → 4 * 7 + 0. */
function diatonic(step: Step, octave: number): number {
  return octave * 7 + STEPS.indexOf(step);
}

interface LevelConfig {
  low: number;
  high: number;
  accidentals: boolean;
}

export const LEVELS: Record<Clef, Record<Difficulty, LevelConfig>> = {
  treble: {
    // Inside the staff (E4–F5), then ±2 ledger lines (A3–C6), then ±3 ledger lines (F3–E6).
    easy: { low: diatonic("E", 4), high: diatonic("F", 5), accidentals: false },
    medium: {
      low: diatonic("A", 3),
      high: diatonic("C", 6),
      accidentals: false,
    },
    hard: { low: diatonic("F", 3), high: diatonic("E", 6), accidentals: true },
  },
  bass: {
    // Inside the staff (G2–A3), then ±2 ledger lines (C2–E4), then ±3 ledger lines (A1–G4).
    easy: { low: diatonic("G", 2), high: diatonic("A", 3), accidentals: false },
    medium: {
      low: diatonic("C", 2),
      high: diatonic("E", 4),
      accidentals: false,
    },
    hard: { low: diatonic("A", 1), high: diatonic("G", 4), accidentals: true },
  },
};

const ACCIDENTAL_PROBABILITY = 0.4;

export function toMidi(step: Step, alter: number, octave: number): number {
  return (octave + 1) * 12 + STEP_SEMITONES[step] + alter;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function drawNote(clef: Clef, difficulty: Difficulty): RandomNote {
  const { low, high, accidentals } = LEVELS[clef][difficulty];
  const d = randomInt(low, high);
  const step = STEPS[d % 7];
  const octave = Math.floor(d / 7);
  let alter: -1 | 0 | 1 = 0;
  if (accidentals && Math.random() < ACCIDENTAL_PROBABILITY) {
    const options: (-1 | 1)[] = [];
    if (SHARPABLE.has(step)) options.push(1);
    if (FLATTABLE.has(step)) options.push(-1);
    alter = options[randomInt(0, options.length - 1)];
  }
  return { clef, step, alter, octave, midi: toMidi(step, alter, octave) };
}

/** Draws a random note for the given clef mode and level, never identical to `previous`. */
export function randomNote(
  mode: ClefMode,
  difficulty: Difficulty,
  previous?: RandomNote | null,
): RandomNote {
  for (let i = 0; i < 50; i++) {
    const clef: Clef =
      mode === "both" ? (Math.random() < 0.5 ? "treble" : "bass") : mode;
    const note = drawNote(clef, difficulty);
    if (
      !previous ||
      note.clef !== previous.clef ||
      note.step !== previous.step ||
      note.octave !== previous.octave ||
      note.alter !== previous.alter
    ) {
      return note;
    }
  }
  return drawNote(mode === "both" ? "treble" : mode, difficulty);
}

/** MIDI range (natural notes ±1 semitone for accidentals) covered by a clef mode/level. */
export function midiRange(
  mode: ClefMode,
  difficulty: Difficulty,
): { min: number; max: number } {
  const clefs: Clef[] = mode === "both" ? ["treble", "bass"] : [mode];
  let min = Infinity;
  let max = -Infinity;
  for (const clef of clefs) {
    const { low, high } = LEVELS[clef][difficulty];
    min = Math.min(min, toMidi(STEPS[low % 7], -1, Math.floor(low / 7)));
    max = Math.max(max, toMidi(STEPS[high % 7], 1, Math.floor(high / 7)));
  }
  return { min, max };
}

const FRENCH_NAMES: Record<Step, string> = {
  C: "Do",
  D: "Ré",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

export function noteName(note: RandomNote): string {
  const acc = note.alter === 1 ? "♯" : note.alter === -1 ? "♭" : "";
  return `${FRENCH_NAMES[note.step]}${acc}${note.octave}`;
}
