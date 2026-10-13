import { useRef, useState } from "react";
import type { SongRecord } from "../types/song";
import { useSongLibrary } from "../hooks/useSongLibrary";
import "./Library.css";

interface LibraryProps {
  onSelectSong: (song: SongRecord) => void;
}

const ACCEPTED_EXTENSIONS = [".xml", ".musicxml", ".mxl"];

export default function Library({ onSelectSong }: LibraryProps) {
  const { songs, loading, importFile, removeSong } = useSongLibrary();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setImportError(null);
    const files = Array.from(fileList);
    const invalid = files.filter(
      (f) =>
        !ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    if (invalid.length > 0) {
      setImportError(
        `Format non supporté pour : ${invalid.map((f) => f.name).join(", ")}. Exporte le morceau depuis MuseScore au format MusicXML (.musicxml) ou .mxl.`,
      );
    }
    setImporting(true);
    try {
      for (const file of files) {
        if (
          !ACCEPTED_EXTENSIONS.some((ext) =>
            file.name.toLowerCase().endsWith(ext),
          )
        )
          continue;
        await importFile(file);
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="library">
      <div className="library__intro">
        <h2>Ma bibliothèque de morceaux</h2>
        <p>
          Exporte un morceau depuis MuseScore (menu{" "}
          <strong>Fichier → Exporter</strong>) au format{" "}
          <strong>MusicXML</strong> (.musicxml) ou <strong>.mxl</strong>, puis
          importe le fichier ici.
        </p>
      </div>

      <label
        className="library__dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.musicxml,.mxl"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          hidden
        />
        <span>
          {importing
            ? "Import en cours…"
            : "Glisse un fichier ici ou clique pour choisir"}
        </span>
      </label>

      {importError && <p className="library__error">{importError}</p>}

      {loading ? (
        <p className="library__empty">Chargement…</p>
      ) : songs.length === 0 ? (
        <p className="library__empty">Aucun morceau importé pour le moment.</p>
      ) : (
        <ul className="library__list">
          {songs.map((song) => (
            <li key={song.id} className="library__item">
              <button
                className="library__item-main"
                onClick={() => onSelectSong(song)}
              >
                <span className="library__item-title">{song.title}</span>
                {song.composer && (
                  <span className="library__item-composer">
                    {song.composer}
                  </span>
                )}
              </button>
              <button
                className="library__item-delete"
                title="Supprimer"
                onClick={() => removeSong(song.id)}
                aria-label={`Supprimer ${song.title}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
