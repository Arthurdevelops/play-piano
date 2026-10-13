import { useCallback, useEffect, useRef, useState } from "react";

export interface MidiDeviceInfo {
  id: string;
  name: string;
}

export interface MidiNoteEvent {
  note: number;
  velocity: number;
}

interface UseMidiInputOptions {
  onNoteOn?: (event: MidiNoteEvent) => void;
  onNoteOff?: (event: MidiNoteEvent) => void;
}

export interface UseMidiInputResult {
  supported: boolean;
  devices: MidiDeviceInfo[];
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  activeNotes: Set<number>;
  error: string | null;
}

/** Wraps the Web MIDI API: lists input devices and tracks currently held notes. */
export function useMidiInput({
  onNoteOn,
  onNoteOff,
}: UseMidiInputOptions = {}): UseMidiInputResult {
  const [supported, setSupported] = useState(true);
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const currentInputRef = useRef<MIDIInput | null>(null);
  const callbacksRef = useRef({ onNoteOn, onNoteOff });
  callbacksRef.current = { onNoteOn, onNoteOff };

  const handleMessage = useCallback((event: MIDIMessageEvent) => {
    const data = event.data;
    if (!data || data.length < 2) return;
    const statusByte = data[0];
    const note = data[1];
    const velocity = data.length > 2 ? data[2] : 0;
    const command = statusByte & 0xf0;

    if (command === 0x90 && velocity > 0) {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.add(note);
        return next;
      });
      callbacksRef.current.onNoteOn?.({ note, velocity });
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      callbacksRef.current.onNoteOff?.({ note, velocity });
    }
  }, []);

  const attachInput = useCallback(
    (input: MIDIInput | null) => {
      if (currentInputRef.current) {
        currentInputRef.current.onmidimessage = null;
      }
      currentInputRef.current = input;
      if (input) {
        input.onmidimessage = handleMessage;
      }
    },
    [handleMessage],
  );

  const refreshDevices = useCallback(() => {
    const access = midiAccessRef.current;
    if (!access) return;
    const list: MidiDeviceInfo[] = [];
    access.inputs.forEach((input) => {
      list.push({
        id: input.id,
        name: input.name ?? `Entrée MIDI ${input.id}`,
      });
    });
    setDevices(list);
    setSelectedDeviceId((prevId) => {
      if (prevId && list.some((d) => d.id === prevId)) return prevId;
      return list[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setSupported(false);
      setError(
        "Web MIDI n'est pas supporté par ce navigateur. Essaie Chrome, Edge ou Opera.",
      );
      return;
    }
    let cancelled = false;
    navigator
      .requestMIDIAccess()
      .then((access) => {
        if (cancelled) return;
        midiAccessRef.current = access;
        refreshDevices();
        access.onstatechange = () => refreshDevices();
      })
      .catch(() => {
        setError(
          "Accès MIDI refusé. Autorise l'accès MIDI pour ce site dans ton navigateur.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [refreshDevices]);

  useEffect(() => {
    const access = midiAccessRef.current;
    if (!access || !selectedDeviceId) {
      attachInput(null);
      return;
    }
    const input = access.inputs.get(selectedDeviceId) ?? null;
    attachInput(input);
    return () => attachInput(null);
  }, [selectedDeviceId, attachInput]);

  return {
    supported,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    activeNotes,
    error,
  };
}
