import { useCallback, useEffect, useRef, useState } from "react";
import NoteStaff from "./NoteStaff";
import PianoKeyboard from "./PianoKeyboard";
import MidiDeviceBar from "./MidiDeviceBar";
import { useMidiInput } from "../hooks/useMidiInput";
import {
  midiRange,
  noteName,
  randomNote,
  type ClefMode,
  type Difficulty,
  type RandomNote,
} from "../lib/noteGenerator";
import {
  playErrorSound,
  playSuccessSound,
  unlockAudio,
} from "../lib/feedbackSounds";
import "./NoteTrainer.css";

const CLEF_OPTIONS: { value: ClefMode; label: string }[] = [
  { value: "treble", label: "Clé de sol" },
  { value: "bass", label: "Clé de fa" },
  { value: "both", label: "Les deux" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Facile" },
  { value: "medium", label: "Intermédiaire" },
  { value: "hard", label: "Difficile" },
];

const BEST_SCORES_KEY = "play-piano:note-trainer:best-scores";
const NO_EXPECTED_NOTES: never[] = [];

type BestScores = Record<string, number>;

function loadBestScores(): BestScores {
  try {
    const raw = localStorage.getItem(BEST_SCORES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as BestScores) : {};
  } catch {
    return {};
  }
}

function saveBestScores(scores: BestScores): void {
  try {
    localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(scores));
  } catch {
    // Storage may be unavailable (private mode, quota): the record just won't persist.
  }
}

/** Widens a MIDI range to whole octaves (C..B) so the keyboard looks natural. */
function keyboardRange(min: number, max: number): { min: number; max: number } {
  return {
    min: Math.max(21, min - (((min % 12) + 12) % 12)),
    max: Math.min(108, max + (11 - (((max % 12) + 12) % 12))),
  };
}

type Feedback = { kind: "success" | "error"; id: number; message: string };

export default function NoteTrainer() {
  const [clefMode, setClefMode] = useState<ClefMode>("treble");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [note, setNote] = useState<RandomNote>(() =>
    randomNote("treble", "easy"),
  );
  const [score, setScore] = useState(0);
  const [bestScores, setBestScores] = useState<BestScores>(loadBestScores);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [correctNotes, setCorrectNotes] = useState<Set<number>>(new Set());

  const noteRef = useRef(note);
  const settingsRef = useRef({ clefMode, difficulty });
  const feedbackIdRef = useRef(0);
  const scoreRef = useRef(score);
  const bestScoresRef = useRef(bestScores);

  const bestKey = `${clefMode}-${difficulty}`;
  const best = bestScores[bestKey] ?? 0;

  const nextNote = useCallback(() => {
    const { clefMode: mode, difficulty: level } = settingsRef.current;
    const next = randomNote(mode, level, noteRef.current);
    noteRef.current = next;
    setNote(next);
  }, []);

  const restart = useCallback(
    (mode: ClefMode, level: Difficulty) => {
      settingsRef.current = { clefMode: mode, difficulty: level };
      scoreRef.current = 0;
      setScore(0);
      setFeedback(null);
      nextNote();
    },
    [nextNote],
  );

  const handleNoteOn = useCallback(
    (played: number) => {
      const expected = noteRef.current;
      const id = ++feedbackIdRef.current;
      if (played === expected.midi) {
        playSuccessSound();
        setCorrectNotes((prev) => new Set(prev).add(played));
        const nextScore = scoreRef.current + 1;
        scoreRef.current = nextScore;
        setScore(nextScore);
        const key = `${settingsRef.current.clefMode}-${settingsRef.current.difficulty}`;
        if ((bestScoresRef.current[key] ?? 0) < nextScore) {
          const updated = { ...bestScoresRef.current, [key]: nextScore };
          bestScoresRef.current = updated;
          saveBestScores(updated);
          setBestScores(updated);
        }
        setFeedback({
          kind: "success",
          id,
          message: `Bravo ! ${noteName(expected)}`,
        });
      } else {
        playErrorSound();
        scoreRef.current = 0;
        setScore(0);
        setFeedback({
          kind: "error",
          id,
          message: `Raté : c'était ${noteName(expected)}`,
        });
      }
      nextNote();
    },
    [nextNote],
  );

  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    activeNotes,
    error: midiError,
    supported,
  } = useMidiInput({
    onNoteOn: ({ note: played }) => handleNoteOn(played),
    onNoteOff: ({ note: released }) => {
      setCorrectNotes((prev) => {
        if (!prev.has(released)) return prev;
        const next = new Set(prev);
        next.delete(released);
        return next;
      });
    },
  });

  // Fade the feedback message out after a moment.
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 1500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const range = midiRange(clefMode, difficulty);
  const keys = keyboardRange(range.min, range.max);

  return (
    <div className="note-trainer" onPointerDown={unlockAudio}>
      <div className="note-trainer__controls">
        <div className="note-trainer__group" role="group" aria-label="Clé">
          {CLEF_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`note-trainer__option${clefMode === opt.value ? " note-trainer__option--active" : ""}`}
              aria-pressed={clefMode === opt.value}
              onClick={() => {
                setClefMode(opt.value);
                restart(opt.value, difficulty);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="note-trainer__group" role="group" aria-label="Niveau">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`note-trainer__option${difficulty === opt.value ? " note-trainer__option--active" : ""}`}
              aria-pressed={difficulty === opt.value}
              onClick={() => {
                setDifficulty(opt.value);
                restart(clefMode, opt.value);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <MidiDeviceBar
        supported={supported}
        error={midiError}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
      />

      <div className="note-trainer__scores">
        <div className="note-trainer__score">
          <span className="note-trainer__score-label">Score</span>
          <span
            key={feedback?.kind === "success" ? feedback.id : "score"}
            className={`note-trainer__score-value${feedback?.kind === "success" ? " note-trainer__score-value--bump" : ""}`}
          >
            {score}
          </span>
        </div>
        <div className="note-trainer__score note-trainer__score--best">
          <span className="note-trainer__score-label">Record</span>
          <span className="note-trainer__score-value">{best}</span>
        </div>
      </div>

      <div className="note-trainer__staff">
        <NoteStaff note={note} />
        {feedback && (
          <div
            key={feedback.id}
            className={`note-trainer__flash note-trainer__flash--${feedback.kind}`}
          />
        )}
      </div>

      <p
        className={`note-trainer__feedback${feedback ? ` note-trainer__feedback--${feedback.kind}` : ""}`}
        aria-live="polite"
      >
        {feedback?.message ?? "Joue la note affichée sur ton clavier."}
      </p>

      <PianoKeyboard
        rangeMin={keys.min}
        rangeMax={keys.max}
        expectedNotes={NO_EXPECTED_NOTES}
        pressedNotes={activeNotes}
        correctNotes={correctNotes}
      />
    </div>
  );
}
