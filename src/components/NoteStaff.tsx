import { useEffect, useRef, useState } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { RandomNote } from "../lib/noteGenerator";

interface NoteStaffProps {
  note: RandomNote | null;
  zoom?: number;
}

function buildMusicXml(note: RandomNote): string {
  const clef =
    note.clef === "treble"
      ? "<sign>G</sign><line>2</line>"
      : "<sign>F</sign><line>4</line>";
  const accidental =
    note.alter === 1
      ? "<accidental>sharp</accidental>"
      : note.alter === -1
        ? "<accidental>flat</accidental>"
        : "";
  const alter = note.alter !== 0 ? `<alter>${note.alter}</alter>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name></part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time print-object="no"><beats>4</beats><beat-type>4</beat-type></time>
        <clef>${clef}</clef>
      </attributes>
      <note>
        <pitch><step>${note.step}</step>${alter}<octave>${note.octave}</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
        ${accidental}
      </note>
    </measure>
  </part>
</score-partwise>`;
}

/** Renders a single whole note on a one-measure staff with the requested clef. */
export default function NoteStaff({ note, zoom = 2 }: NoteStaffProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const osmd = new OpenSheetMusicDisplay(container, {
      autoResize: false,
      backend: "svg",
      drawTitle: false,
      drawSubtitle: false,
      drawComposer: false,
      drawCredits: false,
      drawPartNames: false,
      drawMeasureNumbers: false,
      drawTimeSignatures: false,
      drawMetronomeMarks: false,
      stretchLastSystemLine: true,
    });
    osmd.zoom = zoom;
    osmdRef.current = osmd;
    return () => {
      osmdRef.current = null;
      container.innerHTML = "";
    };
  }, [zoom]);

  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !note) return;
    let cancelled = false;
    setError(false);
    osmd
      .load(buildMusicXml(note))
      .then(() => {
        if (cancelled || osmdRef.current !== osmd) return;
        osmd.zoom = zoom;
        osmd.render();
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [note, zoom]);

  return (
    <div className="note-staff">
      {error && (
        <div className="note-staff__error">Impossible d'afficher la note.</div>
      )}
      <div ref={containerRef} className="note-staff__container" />
    </div>
  );
}
