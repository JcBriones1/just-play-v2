import { Playlist, SyncPayload } from '../types/music';

const SYNC_STORAGE_KEY = 'aura_stream_sync_key';

export class SyncService {
  /**
   * Generates a readable 6-character sync code like 'AURA-8392'
   */
  generateSyncCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'AURA-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  getSavedSyncCode(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SYNC_STORAGE_KEY);
  }

  saveSyncCode(code: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SYNC_STORAGE_KEY, code.toUpperCase().trim());
  }

  clearSyncCode(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SYNC_STORAGE_KEY);
  }

  /**
   * Push current library state to server
   */
  async pushLibrary(payload: SyncPayload): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/sync/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync push failed with status ${response.status}`);
      }

      const res = await response.json();
      return { success: true, message: res.message || 'Library successfully synchronized!' };
    } catch (err: unknown) {
      console.warn('Backend sync failed, storing locally for offline sync:', err);
      // Fallback for offline or local preview: store in localStorage
      localStorage.setItem(`aura_cloud_${payload.syncCode}`, JSON.stringify(payload));
      return { success: true, message: 'Saved to local sync registry' };
    }
  }

  /**
   * Pull latest library state from server
   */
  async pullLibrary(syncCode: string): Promise<SyncPayload | null> {
    const formattedCode = syncCode.toUpperCase().trim();
    try {
      const response = await fetch(`/api/sync/${encodeURIComponent(formattedCode)}`);
      if (response.ok) {
        const data = await response.json();
        return data.payload;
      }
    } catch (err) {
      console.warn('Network sync fetch failed, checking local backup:', err);
    }

    // Check localStorage fallback
    const local = localStorage.getItem(`aura_cloud_${formattedCode}`);
    if (local) {
      try {
        return JSON.parse(local) as SyncPayload;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Merges incoming remote library with local library without duplicates
   */
  mergeLibraries(
    localPlaylists: Playlist[],
    localLiked: string[],
    localHistory: string[],
    remotePayload: SyncPayload
  ): { mergedPlaylists: Playlist[]; mergedLiked: string[]; mergedHistory: string[] } {
    // Merge liked tracks
    const mergedLikedSet = new Set([...localLiked, ...remotePayload.likedTrackIds]);
    const mergedLiked = Array.from(mergedLikedSet);

    // Merge history (keep newest first, limit to 10)
    const remoteHistory = remotePayload.history || [];
    const mergedHistorySet = new Set([...localHistory, ...remoteHistory]);
    const mergedHistory = Array.from(mergedHistorySet).slice(0, 10);

    // Merge playlists by ID
    const playlistMap = new Map<string, Playlist>();
    localPlaylists.forEach((p) => playlistMap.set(p.id, p));

    remotePayload.playlists.forEach((remoteP) => {
      if (!playlistMap.has(remoteP.id)) {
        playlistMap.set(remoteP.id, remoteP);
      } else {
        // Merge track lists of existing playlist
        const existing = playlistMap.get(remoteP.id)!;
        const tracks = Array.from(new Set([...existing.trackIds, ...remoteP.trackIds]));
        playlistMap.set(remoteP.id, {
          ...existing,
          title: remoteP.title || existing.title,
          description: remoteP.description || existing.description,
          trackIds: tracks,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    return {
      mergedPlaylists: Array.from(playlistMap.values()),
      mergedLiked,
      mergedHistory,
    };
  }

  /**
   * Export library to JSON string for downloading as backup file
   */
  exportToFile(payload: SyncPayload): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aurastream-library-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

export const syncService = new SyncService();
