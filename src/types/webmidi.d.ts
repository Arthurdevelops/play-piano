export {};

// Minimal Web MIDI API typings (not included in lib.dom.d.ts).
declare global {
  interface MIDIMessageEvent extends Event {
    data: Uint8Array;
  }

  interface MIDIPort extends EventTarget {
    id: string;
    name?: string | null;
    manufacturer?: string | null;
    state: "connected" | "disconnected";
    connection: "open" | "closed" | "pending";
  }

  interface MIDIInput extends MIDIPort {
    onmidimessage: ((event: MIDIMessageEvent) => void) | null;
  }

  interface MIDIOutput extends MIDIPort {
    send(data: number[] | Uint8Array, timestamp?: number): void;
  }

  interface MIDIInputMap {
    forEach(callback: (input: MIDIInput, key: string) => void): void;
    get(id: string): MIDIInput | undefined;
  }

  interface MIDIOutputMap {
    forEach(callback: (output: MIDIOutput, key: string) => void): void;
    get(id: string): MIDIOutput | undefined;
  }

  interface MIDIAccess extends EventTarget {
    inputs: MIDIInputMap;
    outputs: MIDIOutputMap;
    onstatechange: ((event: Event) => void) | null;
  }

  interface MIDIOptions {
    sysex?: boolean;
    software?: boolean;
  }

  interface Navigator {
    requestMIDIAccess?(options?: MIDIOptions): Promise<MIDIAccess>;
  }
}
