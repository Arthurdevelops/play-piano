import { lazy, Suspense, useState } from "react";
import Library from "./components/Library";
import type { SongRecord } from "./types/song";
import "./App.css";

const Practice = lazy(() => import("./components/Practice"));
const NoteTrainer = lazy(() => import("./components/NoteTrainer"));

type Mode = "songs" | "reading";

const MODES: { value: Mode; label: string }[] = [
  { value: "songs", label: "Morceaux" },
  { value: "reading", label: "Lecture de notes" },
];

function App() {
  const [mode, setMode] = useState<Mode>("songs");
  const [selectedSong, setSelectedSong] = useState<SongRecord | null>(null);

  return (
    <div className="app">
      <header className="app__header">
        <h1>🎹 Play Piano</h1>
        <p>
          {mode === "songs"
            ? "Apprends un morceau note par note, à ton rythme, sur ton clavier MIDI."
            : "Lis la note affichée et joue-la sur ton clavier MIDI le plus vite possible."}
        </p>
        <nav className="app__tabs" aria-label="Mode">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={`app__tab${mode === m.value ? " app__tab--active" : ""}`}
              aria-pressed={mode === m.value}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app__main">
        {mode === "reading" ? (
          <Suspense fallback={<p>Chargement…</p>}>
            <NoteTrainer />
          </Suspense>
        ) : selectedSong ? (
          <Suspense fallback={<p>Chargement…</p>}>
            <Practice
              song={selectedSong}
              onBack={() => setSelectedSong(null)}
            />
          </Suspense>
        ) : (
          <Library onSelectSong={setSelectedSong} />
        )}
      </main>
    </div>
  );
}

export default App;
