import { useMemo } from "react";
import type { ExpectedNote, Hand } from "./ScoreView";
import "./PianoKeyboard.css";

interface PianoKeyboardProps {
  rangeMin: number;
  rangeMax: number;
  expectedNotes: ExpectedNote[];
  pressedNotes: Set<number>;
  /** Pressed keys to show as correct even when they are no longer expected. */
  correctNotes?: Set<number>;
}

type ExpectedHand = Hand | "both";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const WHITE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

function isBlackKey(midi: number): boolean {
  return !WHITE_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

function noteLabel(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

interface KeyLayout {
  midi: number;
  isBlack: boolean;
  left: number; // percentage
  width: number; // percentage
}

function buildLayout(rangeMin: number, rangeMax: number): KeyLayout[] {
  const whiteMidis: number[] = [];
  for (let m = rangeMin; m <= rangeMax; m++) {
    if (!isBlackKey(m)) whiteMidis.push(m);
  }
  const whiteCount = whiteMidis.length || 1;
  const whiteWidth = 100 / whiteCount;
  const whiteIndexByMidi = new Map<number, number>();
  whiteMidis.forEach((m, i) => whiteIndexByMidi.set(m, i));

  const keys: KeyLayout[] = [];
  for (let m = rangeMin; m <= rangeMax; m++) {
    if (!isBlackKey(m)) {
      keys.push({
        midi: m,
        isBlack: false,
        left: whiteIndexByMidi.get(m)! * whiteWidth,
        width: whiteWidth,
      });
    }
  }
  const blackWidth = whiteWidth * 0.62;
  for (let m = rangeMin; m <= rangeMax; m++) {
    if (isBlackKey(m)) {
      const precedingWhiteIndex = whiteIndexByMidi.get(m - 1) ?? 0;
      const left = (precedingWhiteIndex + 1) * whiteWidth - blackWidth / 2;
      keys.push({ midi: m, isBlack: true, left, width: blackWidth });
    }
  }
  return keys;
}

function keyClassNames(
  isBlack: boolean,
  expectedHand: ExpectedHand | null,
  isPressed: boolean,
  isMarkedCorrect: boolean,
): string {
  const classes = [
    "piano-key",
    isBlack ? "piano-key--black" : "piano-key--white",
  ];
  if (isPressed && (expectedHand || isMarkedCorrect))
    classes.push("piano-key--correct");
  else if (isPressed) classes.push("piano-key--wrong");
  else if (expectedHand) classes.push(`piano-key--expected-${expectedHand}`);
  return classes.join(" ");
}

export default function PianoKeyboard({
  rangeMin,
  rangeMax,
  expectedNotes,
  pressedNotes,
  correctNotes,
}: PianoKeyboardProps) {
  const expectedHandByMidi = useMemo(() => {
    const map = new Map<number, ExpectedHand>();
    for (const { midi, hand } of expectedNotes) {
      const existing = map.get(midi);
      map.set(midi, existing && existing !== hand ? "both" : hand);
    }
    return map;
  }, [expectedNotes]);
  const keys = useMemo(
    () => buildLayout(rangeMin, rangeMax),
    [rangeMin, rangeMax],
  );

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  return (
    <div className="piano-keyboard">
      <div className="piano-keyboard__strip">
        {whiteKeys.map((key) => (
          <div
            key={key.midi}
            className={keyClassNames(
              false,
              expectedHandByMidi.get(key.midi) ?? null,
              pressedNotes.has(key.midi),
              correctNotes?.has(key.midi) ?? false,
            )}
            style={{ left: `${key.left}%`, width: `${key.width}%` }}
            title={noteLabel(key.midi)}
          />
        ))}
        {blackKeys.map((key) => (
          <div
            key={key.midi}
            className={keyClassNames(
              true,
              expectedHandByMidi.get(key.midi) ?? null,
              pressedNotes.has(key.midi),
              correctNotes?.has(key.midi) ?? false,
            )}
            style={{ left: `${key.left}%`, width: `${key.width}%` }}
            title={noteLabel(key.midi)}
          />
        ))}
      </div>
    </div>
  );
}
