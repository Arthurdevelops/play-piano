import { useCallback, useEffect, useState } from "react";
import { addSong, deleteSong, listSongs } from "../lib/db";
import type { SongRecord } from "../types/song";

export function useSongLibrary() {
  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listSongs();
    setSongs(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const importFile = useCallback(
    async (file: File, meta?: { title?: string; composer?: string }) => {
      const title =
        meta?.title?.trim() || file.name.replace(/\.(musicxml|mxl|xml)$/i, "");
      const song: SongRecord = {
        id: crypto.randomUUID(),
        title,
        composer: meta?.composer?.trim() || "",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        data: file,
        addedAt: Date.now(),
      };
      await addSong(song);
      await refresh();
      return song;
    },
    [refresh],
  );

  const removeSong = useCallback(
    async (id: string) => {
      await deleteSong(id);
      await refresh();
    },
    [refresh],
  );

  return { songs, loading, importFile, removeSong, refresh };
}
