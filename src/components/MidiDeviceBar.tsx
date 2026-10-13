import type { MidiDeviceInfo } from "../hooks/useMidiInput";
import "./MidiDeviceBar.css";

interface MidiDeviceBarProps {
  supported: boolean;
  error: string | null;
  devices: MidiDeviceInfo[];
  selectedDeviceId: string | null;
  onSelectDevice: (id: string | null) => void;
}

/** MIDI device selector, or a warning when Web MIDI or a keyboard is unavailable. */
export default function MidiDeviceBar({
  supported,
  error,
  devices,
  selectedDeviceId,
  onSelectDevice,
}: MidiDeviceBarProps) {
  return (
    <div className="midi-bar">
      {!supported || error ? (
        <span className="midi-bar__warning">
          {error ?? "Web MIDI indisponible."}
        </span>
      ) : devices.length === 0 ? (
        <span className="midi-bar__warning">
          Aucun clavier MIDI détecté. Branche-le puis recharge la page.
        </span>
      ) : (
        <label className="midi-bar__select">
          Clavier MIDI :
          <select
            value={selectedDeviceId ?? ""}
            onChange={(e) => onSelectDevice(e.target.value || null)}
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
