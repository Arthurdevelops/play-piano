import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import "./ScoreView.css";

export interface NoteRange {
  min: number;
  max: number;
}

export type Hand = "treble" | "bass";

export interface ExpectedNote {
  midi: number;
  /** Which staff the note comes from: the top staff (clé de sol) is "treble", any lower staff (clé de fa) is "bass". */
  hand: Hand;
}

export interface ScoreViewHandle {
  loadSong: (data: Blob) => Promise<void>;
  resetCursor: () => void;
  advanceCursor: () => void;
  /** Notes required at the current cursor position, ignoring rests and tie continuations. */
  getExpectedNotes: () => ExpectedNote[];
  isEnded: () => boolean;
  /** Scans the whole piece once to find the lowest/highest note played, then resets the cursor to the start. */
  getNoteRange: () => NoteRange | null;
}

interface ScoreViewProps {
  zoom?: number;
}

const ScoreView = forwardRef<ScoreViewHandle, ScoreViewProps>(
  function ScoreView({ zoom = 1 }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;
      const osmd = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
        drawPartNames: false,
      });
      osmd.zoom = zoom;
      osmdRef.current = osmd;
      return () => {
        osmdRef.current = null;
        if (containerRef.current) containerRef.current.innerHTML = "";
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        loadSong: async (data: Blob) => {
          const osmd = osmdRef.current;
          if (!osmd) return;
          setLoading(true);
          setErrorMsg(null);
          try {
            await osmd.load(data);
            // Guard against React StrictMode's double-invoked effects recreating the OSMD
            // instance while this load was in flight: skip rendering a stale instance.
            if (osmdRef.current !== osmd) return;
            osmd.render();
            osmd.cursor.show();
            osmd.cursor.reset();
          } catch (err) {
            console.error(err);
            if (osmdRef.current === osmd) {
              setErrorMsg(
                "Impossible de lire ce fichier. Vérifie qu'il s'agit bien d'un fichier MusicXML (.xml, .musicxml ou .mxl) exporté depuis MuseScore.",
              );
            }
            throw err;
          } finally {
            setLoading(false);
          }
        },
        resetCursor: () => {
          const osmd = osmdRef.current;
          if (!osmd) return;
          osmd.cursor.reset();
          osmd.cursor.show();
        },
        advanceCursor: () => {
          osmdRef.current?.cursor.next();
        },
        getExpectedNotes: () => {
          const osmd = osmdRef.current;
          if (!osmd?.cursor || osmd.cursor.Iterator.EndReached) return [];
          const notesByMidi = new Map<number, ExpectedNote>();
          for (const voiceEntry of osmd.cursor.Iterator.CurrentVoiceEntries) {
            for (const note of voiceEntry.Notes) {
              if (note.isRest()) continue;
              // Skip the continuation of a tie: it's the same sustained note, no new key press needed.
              const tie = note.NoteTie;
              if (tie && tie.StartNote !== note) continue;
              const midi = note.halfTone + 12;
              // Staff Id is 1-based: the top staff (1) is the clé de sol; any other staff is clé de fa.
              const hand: Hand =
                (note.ParentStaff?.Id ?? 1) === 1 ? "treble" : "bass";
              const existing = notesByMidi.get(midi);
              if (
                !existing ||
                (existing.hand === "bass" && hand === "treble")
              ) {
                notesByMidi.set(midi, { midi, hand });
              }
            }
          }
          return Array.from(notesByMidi.values());
        },
        isEnded: () => {
          return !!osmdRef.current?.cursor?.Iterator?.EndReached;
        },
        getNoteRange: () => {
          const osmd = osmdRef.current;
          if (!osmd?.cursor) return null;
          const cursor = osmd.cursor;
          cursor.reset();
          let min = Infinity;
          let max = -Infinity;
          const iterator = cursor.Iterator;
          while (!iterator.EndReached) {
            for (const voiceEntry of iterator.CurrentVoiceEntries) {
              for (const note of voiceEntry.Notes) {
                if (note.isRest()) continue;
                const midi = note.halfTone + 12;
                if (midi < min) min = midi;
                if (midi > max) max = midi;
              }
            }
            iterator.moveToNext();
          }
          cursor.reset();
          cursor.show();
          if (min === Infinity) return null;
          return { min, max };
        },
      }),
      [],
    );

    return (
      <div className="score-view">
        {loading && (
          <div className="score-view__status">Chargement de la partition…</div>
        )}
        {errorMsg && <div className="score-view__error">{errorMsg}</div>}
        <div ref={containerRef} className="score-view__container" />
      </div>
    );
  },
);

export default ScoreView;
