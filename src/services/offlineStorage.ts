import { Track } from '../types/music';

const DB_NAME = 'AuraMusicOfflineDB';
const DB_VERSION = 1;
const TRACKS_STORE = 'downloaded_tracks';

export interface StoredAudioTrack {
  id: string;
  trackData: Track;
  audioBlob: Blob;
  sizeBytes: number;
  downloadedAt: string;
}

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Downloads a track and saves its audio blob into IndexedDB with download progress
   */
  async downloadTrack(
    track: Track,
    onProgress?: (percent: number) => void
  ): Promise<boolean> {
    try {
      if (onProgress) onProgress(10);

      let blob: Blob;

      try {
        const response = await fetch(track.audioUrl, {
          mode: 'cors',
          cache: 'no-cache',
        });

        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status}`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        const mime = (response.headers.get('content-type') || 'audio/mpeg').split(';')[0].trim();
        if (response.body && total > 0 && onProgress) {
          const reader = response.body.getReader();
          let received = 0;
          const chunks: Uint8Array[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              const percent = Math.min(95, Math.round((received / total) * 100));
              onProgress(percent);
            }
          }

          blob = new Blob(chunks as BlobPart[], { type: mime });
        } else {
          blob = await response.blob();
          if (mime.startsWith('audio/') && blob.type !== mime) {
            blob = new Blob([blob], { type: mime });
          }
        }

        if (!(await blobLooksLikeAudio(blob))) {
          throw new Error('Downloaded file is not audio');
        }
      } catch (fetchErr) {
        console.warn('Could not download a playable audio file:', fetchErr);
        return false;
      }

      if (onProgress) onProgress(98);

      const db = await this.getDB();
      const storedItem: StoredAudioTrack = {
        id: track.id,
        trackData: track,
        audioBlob: blob,
        sizeBytes: blob.size,
        downloadedAt: new Date().toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TRACKS_STORE, 'readwrite');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.put(storedItem);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      if (onProgress) onProgress(100);
      return true;
    } catch (err) {
      console.error('Failed to download track offline:', err);
      return false;
    }
  }

  async saveAudioBlob(track: Track, audioBlob: Blob): Promise<boolean> {
    try {
      const normalizedBlob = audioBlob.type
        ? audioBlob
        : new Blob([audioBlob], { type: 'audio/mpeg' });
      if (!normalizedBlob.type.startsWith('audio/') || !(await blobLooksLikeAudio(normalizedBlob))) {
        return false;
      }

      const db = await this.getDB();
      const storedItem: StoredAudioTrack = {
        id: track.id,
        trackData: track,
        audioBlob: normalizedBlob,
        sizeBytes: normalizedBlob.size,
        downloadedAt: new Date().toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TRACKS_STORE, 'readwrite');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.put(storedItem);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      return true;
    } catch (err) {
      console.error('Failed to save audio track offline:', err);
      return false;
    }
  }

  /**
   * Retrieves the Blob URL for offline playback
   */
  async getOfflineAudioUrl(trackId: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TRACKS_STORE, 'readonly');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.get(trackId);

        req.onsuccess = () => {
          const res: StoredAudioTrack | undefined = req.result;
          const audioBlob = normalizeAudioBlob(res?.audioBlob);
          if (!audioBlob) {
            resolve(null);
            return;
          }
          blobLooksLikeAudio(audioBlob)
            .then((ok) => {
              if (!ok) {
                resolve(null);
                return;
              }
              resolve(URL.createObjectURL(audioBlob));
            })
            .catch(() => resolve(null));
        };

        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Check if a specific track is cached offline
   */
  async isTrackDownloaded(trackId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TRACKS_STORE, 'readonly');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.count(trackId);

        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Get all downloaded track IDs
   */
  async getDownloadedTrackIds(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TRACKS_STORE, 'readonly');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.getAllKeys();

        req.onsuccess = () => {
          resolve((req.result as string[]) || []);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Get all downloaded tracks full data
   */
  async getAllDownloadedTracks(): Promise<Track[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TRACKS_STORE, 'readonly');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
          const items: StoredAudioTrack[] = req.result || [];
          resolve(items.map((item) => item.trackData).filter(Boolean));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Remove a track from offline storage
   */
  async removeTrack(trackId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TRACKS_STORE, 'readwrite');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.delete(trackId);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Get total offline storage size formatted
   */
  async getStorageStats(): Promise<{ count: number; totalBytes: number; formattedSize: string }> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TRACKS_STORE, 'readonly');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
          const items: StoredAudioTrack[] = req.result || [];
          let totalBytes = 0;
          items.forEach((item) => {
            totalBytes += item.sizeBytes || item.audioBlob?.size || 0;
          });

          let formatted = '0 MB';
          if (totalBytes < 1024 * 1024) {
            formatted = `${(totalBytes / 1024).toFixed(1)} KB`;
          } else {
            formatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
          }

          resolve({
            count: items.length,
            totalBytes,
            formattedSize: formatted,
          });
        };

        req.onerror = () => resolve({ count: 0, totalBytes: 0, formattedSize: '0 MB' });
      });
    } catch {
      return { count: 0, totalBytes: 0, formattedSize: '0 MB' };
    }
  }

  /**
   * Clear all offline cached tracks
   */
  async clearAllDownloads(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(TRACKS_STORE, 'readwrite');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error(e);
    }
  }
}

function normalizeAudioBlob(value: unknown): Blob | null {
  if (!value) return null;
  if (value instanceof Blob) return value.size > 0 ? value : null;
  if (value instanceof ArrayBuffer) {
    return value.byteLength > 0 ? new Blob([value], { type: 'audio/mpeg' }) : null;
  }
  return null;
}

async function blobLooksLikeAudio(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 1000) return false;
  try {
    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const marker = String.fromCharCode(...head.slice(0, 4));
    if (marker.startsWith('<') || marker.startsWith('{') || marker.startsWith('<!')) return false;
    return true;
  } catch {
    return blob.type.startsWith('audio/');
  }
}

export const offlineStorage = new OfflineStorageService();
