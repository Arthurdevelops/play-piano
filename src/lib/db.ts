import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SongRecord } from "../types/song";

interface PlayPianoDB extends DBSchema {
  songs: {
    key: string;
    value: SongRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<PlayPianoDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PlayPianoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PlayPianoDB>("play-piano", 1, {
      upgrade(db) {
        db.createObjectStore("songs", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function listSongs(): Promise<SongRecord[]> {
  const db = await getDb();
  const songs = await db.getAll("songs");
  return songs.sort((a, b) => b.addedAt - a.addedAt);
}

export async function addSong(song: SongRecord): Promise<void> {
  const db = await getDb();
  await db.put("songs", song);
}

export async function deleteSong(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("songs", id);
}
