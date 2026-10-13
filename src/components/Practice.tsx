import { useCallback, useEffect, useRef, useState } from "react";
import ScoreView, {
  type ExpectedNote,
  type ScoreViewHandle,
} from "./ScoreView";
import PianoKeyboard from "./PianoKeyboard";
import MidiDeviceBar from "./MidiDeviceBar";
import { useMidiInput } from "../hooks/useMidiInput";
import type { SongRecord } from "../types/song";
import "./Practice.css";

interface PracticeProps {
  song: SongRecord;
  onBack: () => void;
}

function expandRange(min: number, max: number): { min: number; max: number } {
  let lo = Math.max(21, min - 2);
  let hi = Math.min(108, max + 2);
  while (lo % 12 !== 0 && lo > 21) lo--;
  while (hi % 12 !== 11 && hi < 108) hi++;
  if (lo >= hi) return { min: 21, max: 108 };
  return { min: lo, max: hi };
}

const DEFAULT_RANGE = { min: 48, max: 72 };

export default function Practice({ song, onBack }: PracticeProps) {
  const scoreRef = useRef<ScoreViewHandle>(null);
  const [keyRange, setKeyRange] = useState(DEFAULT_RANGE);
  const [expected, setExpected] = useState<ExpectedNote[]>([]);
  const [finished, setFinished] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tracks physically-held keys and which of them were freshly struck since the current step
  // started, so a key still held over from the previous step never auto-advances by itself:
  // a repeated note must be re-struck, just like on a real piano.
  const heldNotesRef = useRef<Set<number>>(new Set());
  const pressedSinceStepRef = useRef<Set<number>>(new Set());

  const syncExpectedWithCursor = useCallback(() => {
    const handle = scoreRef.current;
    if (!handle) return;
    pressedSinceStepRef.current = new Set();
    // Skip steps that require no new key press (pure rests / tie continuations).
    for (let i = 0; i < 1000; i++) {
      if (handle.isEnded()) {
        setFinished(true);
        setExpected([]);
        return;
      }
      const notes = handle.getExpectedNotes();
      if (notes.length > 0) {
        setFinished(false);
        setExpected(notes);
        return;
      }
      handle.advanceCursor();
    }
  }, []);

  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    activeNotes,
    error: midiError,
    supported,
  } = useMidiInput({
    onNoteOn: ({ note }) => {
      heldNotesRef.current.add(note);
      pressedSinceStepRef.current.add(note);
      if (!ready || finished || expected.length === 0) return;
      const allSatisfied = expected.every(
        (n) =>
          heldNotesRef.current.has(n.midi) &&
          pressedSinceStepRef.current.has(n.midi),
      );
      if (allSatisfied) {
        scoreRef.current?.advanceCursor();
        syncExpectedWithCursor();
      }
    },
    onNoteOff: ({ note }) => {
      heldNotesRef.current.delete(note);
    },
  });

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(null);
    setFinished(false);
    setExpected([]);
    (async () => {
      const handle = scoreRef.current;
      if (!handle) return;
      try {
        await handle.loadSong(song.data);
        if (cancelled) return;
        const range = handle.getNoteRange();
        setKeyRange(range ? expandRange(range.min, range.max) : DEFAULT_RANGE);
        syncExpectedWithCursor();
        setReady(true);
      } catch {
        if (!cancelled) setLoadError("Échec du chargement de la partition.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [song, syncExpectedWithCursor]);

  function handleRestart() {
    scoreRef.current?.resetCursor();
    setFinished(false);
    syncExpectedWithCursor();
  }

  return (
    <div className="practice">
      <div className="practice__header">
        <button className="practice__back" onClick={onBack}>
          ← Bibliothèque
        </button>
        <div className="practice__title">
          <h2>{song.title}</h2>
          {song.composer && <span>{song.composer}</span>}
        </div>
        <button className="practice__restart" onClick={handleRestart}>
          Recommencer
        </button>
      </div>

      <MidiDeviceBar
        supported={supported}
        error={midiError}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
      />

      {loadError && <p className="practice__error">{loadError}</p>}

      <ScoreView ref={scoreRef} />

      {finished && (
        <div className="practice__finished">
          🎉 Morceau terminé, bravo !
          <button
            className="practice__finished-restart"
            onClick={handleRestart}
          >
            Recommencer
          </button>
        </div>
      )}

      <div className="practice__legend">
        <span className="practice__legend-item">
          <span className="practice__legend-swatch practice__legend-swatch--treble" />{" "}
          Clé de sol
        </span>
        <span className="practice__legend-item">
          <span className="practice__legend-swatch practice__legend-swatch--bass" />{" "}
          Clé de fa
        </span>
      </div>

      <PianoKeyboard
        rangeMin={keyRange.min}
        rangeMax={keyRange.max}
        expectedNotes={expected}
        pressedNotes={activeNotes}
      />
    </div>
  );
}
