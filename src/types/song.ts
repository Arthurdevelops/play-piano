export interface SongRecord {
  id: string;
  title: string;
  composer: string;
  fileName: string;
  mimeType: string;
  data: Blob;
  addedAt: number;
}
