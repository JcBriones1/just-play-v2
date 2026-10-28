/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayerModal } from './components/FullPlayerModal';
import { QueueDrawer } from './components/QueueDrawer';
import { PlaylistModal } from './components/PlaylistModal';
import { SyncModal } from './components/SyncModal';
import { EqualizerModal } from './components/EqualizerModal';
import { SleepTimerModal } from './components/SleepTimerModal';
import { YouTubePlayerBridge, YouTubePlayerBridgeRef } from './components/YouTubePlayerBridge';

import { HomeView } from './views/HomeView';
import { ExploreView } from './views/ExploreView';
import { LibraryView } from './views/LibraryView';
import { SettingsView } from './views/SettingsView';

import { Track, Playlist, RepeatMode, EqualizerPreset, SyncPayload } from './types/music';
import { MUSIC_CATALOG, INITIAL_PLAYLISTS } from './data/musicCatalog';
import { audioEngine } from './services/audioEngine';
import { syncBackgroundPlayback } from './services/backgroundPlayback';
import { offlineStorage } from './services/offlineStorage';
import { syncService } from './services/syncService';
import { useOnlineStatus } from './hooks/useOnlineStatus';

const STORAGE_PLAYLISTS_KEY = 'aura_playlists_v5';
const STORAGE_LIKED_KEY = 'aura_liked_v5';
const STORAGE_HISTORY_KEY = 'aura_history_v5';
const STORAGE_TRACKS_KEY = 'aura_known_tracks_v5';
const STORAGE_SETTINGS_KEY = 'aura_settings_v5';

async function downloadTrackForOffline(
  track: Track,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  if (!track.youtubeId) {
    return offlineStorage.downloadTrack(track, onProgress);
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (capacitor?.isNativePlatform?.() && !apiBaseUrl) {
    throw new Error('The download server URL is not configured for this app.');
  }

  const response = await fetch(`${apiBaseUrl}/api/youtube/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(track.youtubeId)}`,
      title: track.title,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error || 'The audio could not be downloaded.');
  }

  const saved = await offlineStorage.saveAudioBlob(track, await response.blob());
  if (!saved) {
    throw new Error('The download service did not return a playable audio file.');
  }
  onProgress?.(100);
  return true;
}

export default function App() {
  const isOnline = useOnlineStatus();

  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Music Catalog & Persistent Track Registry State
  const [allTracks, setAllTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TRACKS_KEY);
      const cachedTracks: Track[] = saved ? JSON.parse(saved) : [];
      const trackMap = new Map<string, Track>();
      MUSIC_CATALOG.forEach((t) => trackMap.set(t.id, t));
      cachedTracks.forEach((t) => {
        if (t && t.id) trackMap.set(t.id, t);
      });
      return Array.from(trackMap.values());
    } catch {
      return MUSIC_CATALOG;
    }
  });

  const registerTracks = useCallback((newTracks: Track[]) => {
    if (!newTracks || newTracks.length === 0) return;
    setAllTracks((prev) => {
      let hasNew = false;
      const trackMap = new Map<string, Track>();
      prev.forEach((t) => trackMap.set(t.id, t));

      newTracks.forEach((t) => {
        if (!t || !t.id) return;
        if (!trackMap.has(t.id)) {
          trackMap.set(t.id, t);
          hasNew = true;
        } else {
          const existing = trackMap.get(t.id)!;
          if (t.artworkUrl && (!existing.artworkUrl || existing.artworkUrl.includes('unsplash'))) {
            trackMap.set(t.id, { ...existing, ...t });
            hasNew = true;
          }
        }
      });

      if (!hasNew) return prev;
      const updated = Array.from(trackMap.values());
      try {
        localStorage.setItem(STORAGE_TRACKS_KEY, JSON.stringify(updated.slice(-200)));
      } catch {}
      return updated;
    });
  }, []);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_PLAYLISTS;
    } catch {
      return INITIAL_PLAYLISTS;
    }
  });

  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LIKED_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [historyTrackIds, setHistoryTrackIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [offlineTrackIds, setOfflineTrackIds] = useState<string[]>([]);
  const [offlineStorageStats, setOfflineStorageStats] = useState<{ count: number; formattedSize: string }>({
    count: 0,
    formattedSize: '0 MB',
  });
  const [downloadProgressMap, setDownloadProgressMap] = useState<Record<string, number>>({});

  // Cross-Device Sync State
  const [syncCode, setSyncCode] = useState<string | null>(() => syncService.getSavedSyncCode());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [equalizerPreset, setEqualizerPreset] = useState<EqualizerPreset>('flat');
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);

  // Sleep Timer
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [sleepTimerStopAtEnd, setSleepTimerStopAtEnd] = useState<boolean>(false);

  // Modals
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);

  // Virtual keyboard open detection (hides bottom nav & miniplayer when searching/typing on mobile)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setIsKeyboardOpen(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setIsKeyboardOpen(false);
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Video mode coordination - stops background audio when watching video
  const handleVideoModeChange = useCallback((active: boolean) => {
    if (active) {
      ytPlayerRef.current?.pause();
      audioEngine.pause();
    } else {
      if (isPlaying) {
        if (currentTrack?.youtubeId) {
          ytPlayerRef.current?.play();
        } else if (currentTrack) {
          audioEngine.resume();
        }
      }
    }
  }, [isPlaying, currentTrack]);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  // Save Playlists & Likes to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LIKED_KEY, JSON.stringify(likedTrackIds));
  }, [likedTrackIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(historyTrackIds));
  }, [historyTrackIds]);

  // Load Offline Cache stats and sync with allTracks registry
  const refreshOfflineStats = useCallback(async () => {
    const ids = await offlineStorage.getDownloadedTrackIds();
    setOfflineTrackIds(ids);
    const downloadedTracks = await offlineStorage.getAllDownloadedTracks();
    if (downloadedTracks.length > 0) {
      registerTracks(downloadedTracks);
    }
    const stats = await offlineStorage.getStorageStats();
    setOfflineStorageStats({
      count: stats.count,
      formattedSize: stats.formattedSize,
    });
  }, [registerTracks]);

  useEffect(() => {
    refreshOfflineStats();
  }, [refreshOfflineStats]);

  // Handle URL Sync Param (?sync=AURA-XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSync = params.get('sync');
    if (urlSync && urlSync !== syncCode) {
      handleConnectSyncCode(urlSync);
    }
  }, []);

  // Sleep Timer countdown interval
  useEffect(() => {
    if (sleepTimerRemaining === null) return;
    if (sleepTimerRemaining <= 0) {
      audioEngine.pause();
      setIsPlaying(false);
      setSleepTimerRemaining(null);
      showToast('Sleep timer reached. Music paused.');
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemaining]);

  const ytPlayerRef = useRef<YouTubePlayerBridgeRef | null>(null);
  const localAudioRef = useRef(false);
  const playGenRef = useRef(0);
  const offlineIdsRef = useRef<string[]>(offlineTrackIds);
  offlineIdsRef.current = offlineTrackIds;

  const trackUsesLocalAudio = (track: Track) =>
    !track.youtubeId || offlineIdsRef.current.includes(track.id);

  const beginTrackPlayback = (track: Track) => {
    const local = trackUsesLocalAudio(track);
    localAudioRef.current = local;
    if (local) {
      const playGen = ++playGenRef.current;
      ytPlayerRef.current?.pause();
      void audioEngine.playTrack(track).then((started) => {
        if (playGen !== playGenRef.current) return;
        if (started) return;
        if (track.youtubeId && navigator.onLine) {
          localAudioRef.current = false;
          ytPlayerRef.current?.loadAndPlay(track.youtubeId);
          return;
        }
        setIsPlaying(false);
        showToast(`"${track.title}" is saved, but the audio file cannot play on this phone.`);
      });
      return;
    }

    void audioEngine.pause();
    if (track.youtubeId) {
      ytPlayerRef.current?.loadAndPlay(track.youtubeId);
    }
  };
  const playbackCommandRef = useRef({
    toggle: () => {},
    ensure: () => {},
    next: () => {},
    prev: () => {},
    playing: false,
  });

  useEffect(() => {
    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<string>).detail;
      const api = playbackCommandRef.current;
      if (command === 'next') {
        api.next();
        return;
      }
      if (command === 'prev') {
        api.prev();
        return;
      }
      if (command === 'play') {
        if (!api.playing) api.toggle();
        return;
      }
      if (command === 'pause') {
        if (api.playing) api.toggle();
        return;
      }
      if (command === 'ensure-playing') {
        if (api.playing) api.ensure();
        return;
      }
      if (command === 'toggle') {
        api.toggle();
      }
    };
    window.addEventListener('justplay-command', onCommand);
    return () => window.removeEventListener('justplay-command', onCommand);
  }, []);

  // Audio Engine Event Subscription
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((data) => {
      if (!localAudioRef.current) return;
      setCurrentTime(data.currentTime);
      if (data.duration > 0) {
        setDuration(data.duration);
      }
      setIsPlaying(data.isPlaying);
    });

    return () => unsubscribe();
  }, []);

  // Handle Seek
  const handleSeek = (secs: number) => {
    setCurrentTime(secs);
    if (localAudioRef.current || !currentTrack?.youtubeId) {
      audioEngine.seek(secs);
    } else if (currentTrack?.youtubeId) {
      ytPlayerRef.current?.seek(secs);
    }
  };

  // Setup Next Track callback
  const handleNextTrack = useCallback(() => {
    if (sleepTimerStopAtEnd) {
      audioEngine.pause();
      ytPlayerRef.current?.pause();
      setIsPlaying(false);
      setSleepTimerStopAtEnd(false);
      setSleepTimerRemaining(null);
      showToast('End of track reached. Music paused.');
      return;
    }

    if (repeatMode === 'one' && currentTrack) {
      if (trackUsesLocalAudio(currentTrack)) {
        localAudioRef.current = true;
        audioEngine.seek(0);
        void audioEngine.resume();
      } else {
        handleSeek(0);
        ytPlayerRef.current?.play();
      }
      return;
    }

    if (queue.length === 0) return;

    let nextIdx = queueIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        ytPlayerRef.current?.pause();
        audioEngine.pause();
        setIsPlaying(false);
        return;
      }
    }

    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      setQueueIndex(nextIdx);
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
      beginTrackPlayback(nextTrack);
    }
  }, [queue, queueIndex, isShuffle, repeatMode, currentTrack, sleepTimerStopAtEnd]);

  const handlePrevTrack = useCallback(() => {
    if (currentTime > 3) {
      handleSeek(0);
      return;
    }

    if (queue.length === 0) return;
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === 'all' ? queue.length - 1 : 0;
    }

    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      setQueueIndex(prevIdx);
      setCurrentTrack(prevTrack);
      setIsPlaying(true);
      beginTrackPlayback(prevTrack);
    }
  }, [currentTime, queue, queueIndex, repeatMode]);

  useEffect(() => {
    audioEngine.onEnded(() => {
      if (localAudioRef.current) {
        handleNextTrack();
      }
    });
  }, [handleNextTrack, currentTrack?.youtubeId]);

  useEffect(() => {
    syncBackgroundPlayback(isPlaying, currentTrack?.title ?? '', currentTrack?.artist ?? '');
  }, [isPlaying, currentTrack?.title, currentTrack?.artist]);

  // Bind MediaSession actions
  useEffect(() => {
    audioEngine.bindMediaSessionActions({
      onPlay: () => {
        if (currentTrack) {
          if (localAudioRef.current || !currentTrack.youtubeId) {
            void audioEngine.resume();
          } else {
            ytPlayerRef.current?.play();
          }
          setIsPlaying(true);
        }
      },
      onPause: () => {
        if (localAudioRef.current || !currentTrack?.youtubeId) {
          void audioEngine.pause();
        } else {
          ytPlayerRef.current?.pause();
        }
        setIsPlaying(false);
      },
      onNext: handleNextTrack,
      onPrev: handlePrevTrack,
      onSeek: (secs) => handleSeek(secs),
    });
  }, [currentTrack, handleNextTrack, handlePrevTrack]);

  // Controls Handlers
  const handleTogglePlay = () => {
    if (!currentTrack) {
      if (allTracks.length > 0) {
        handlePlayTrack(allTracks[0], allTracks);
      }
      return;
    }

    if (isPlaying) {
      if (localAudioRef.current || !currentTrack.youtubeId) {
        void audioEngine.pause();
      } else {
        ytPlayerRef.current?.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (localAudioRef.current) {
      void audioEngine.resume();
    } else {
      beginTrackPlayback(currentTrack);
    }
    setIsPlaying(true);
  };

  playbackCommandRef.current = {
    toggle: handleTogglePlay,
    ensure: () => {
      if (!currentTrack) return;
      if (localAudioRef.current || !currentTrack.youtubeId) {
        void audioEngine.resume();
      } else {
        ytPlayerRef.current?.play();
      }
    },
    next: handleNextTrack,
    prev: handlePrevTrack,
    playing: isPlaying,
  };

  const handlePlayTrack = (track: Track, newQueue?: Track[]) => {
    registerTracks([track, ...(newQueue || [])]);
    const activeQueue = newQueue && newQueue.length > 0 ? newQueue : allTracks;
    setQueue(activeQueue);
    const idx = activeQueue.findIndex(
      (t) => t.id === track.id || (t.youtubeId && track.youtubeId && t.youtubeId === track.youtubeId)
    );
    setQueueIndex(idx >= 0 ? idx : 0);
    
    // Set state and let the Bridge's useEffect handle the actual loading/playing
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);

    // Update History (Max 10, Newest first)
    setHistoryTrackIds((prev) => {
      const filtered = prev.filter(id => id !== track.id);
      const next = [track.id, ...filtered];
      return next.slice(0, 10);
    });

    beginTrackPlayback(track);
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    const tracks = allTracks.filter((t) => playlist.trackIds.includes(t.id));
    if (tracks.length > 0) {
      handlePlayTrack(tracks[0], tracks);
      showToast(`Playing playlist "${playlist.title}"`);
    } else {
      showToast('Playlist is empty');
    }
  };

  const handleSetVolume = (vol: number) => {
    setVolume(vol);
    setIsMuted(false);
    audioEngine.setVolume(vol);
    ytPlayerRef.current?.setVolume(vol);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const handleToggleRepeat = () => {
    const next: RepeatMode =
      repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(next);
    showToast(`Repeat mode: ${next.toUpperCase()}`);
  };

  const handleToggleShuffle = () => {
    setIsShuffle(!isShuffle);
    showToast(isShuffle ? 'Shuffle turned off' : 'Shuffle turned on');
  };

  const handleToggleLike = (trackOrId: Track | string) => {
    const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId.id;
    if (typeof trackOrId !== 'string') {
      registerTracks([trackOrId]);
    } else {
      const found = allTracks.find((t) => t.id === trackId || t.youtubeId === trackId);
      if (found) registerTracks([found]);
    }
    setLikedTrackIds((prev) => {
      let next: string[];
      if (prev.includes(trackId)) {
        next = prev.filter((id) => id !== trackId);
        showToast('Removed from Liked Songs');
      } else {
        next = [...prev, trackId];
        showToast('Saved to Liked Songs');
      }
      return next;
    });
  };

  const handleDownloadTrack = async (track: Track) => {
    registerTracks([track]);
    const isAlreadyDownloaded = offlineTrackIds.includes(track.id);

    if (isAlreadyDownloaded) {
      await offlineStorage.removeTrack(track.id);
      await refreshOfflineStats();
      showToast(`Removed "${track.title}" from offline cache`);
      return;
    }

    if (track.source === 'offline') {
      showToast(`The source file for "${track.title}" is unavailable`);
      return;
    }

    setDownloadProgressMap((prev) => ({ ...prev, [track.id]: 10 }));
    showToast(`Downloading "${track.title}" for offline listening...`);

    let success = false;
    let failureMessage = '';
    try {
      success = await downloadTrackForOffline(track, (percent) => {
        setDownloadProgressMap((prev) => ({ ...prev, [track.id]: percent }));
      });
    } catch (error) {
      failureMessage = error instanceof Error ? error.message : `Could not download "${track.title}"`;
    }

    setDownloadProgressMap((prev) => {
      const copy = { ...prev };
      delete copy[track.id];
      return copy;
    });

    if (success) {
      await refreshOfflineStats();
      showToast(`✓ "${track.title}" cached offline in IndexedDB!`);
    } else {
      showToast(failureMessage || `Could not download "${track.title}"`);
    }
  };

  const handleDownloadAllLiked = async () => {
    const likedTracksToDownload = allTracks.filter(
      (t) => likedTrackIds.includes(t.id) && !offlineTrackIds.includes(t.id)
    );

    if (likedTracksToDownload.length === 0) {
      showToast('All liked songs are already cached offline!');
      return;
    }

    showToast(`Downloading ${likedTracksToDownload.length} songs for offline listening...`);

    let downloadedCount = 0;
    for (const track of likedTracksToDownload) {
      try {
        if (await downloadTrackForOffline(track)) downloadedCount++;
      } catch (error) {
        console.error(`Failed to download "${track.title}" for offline playback:`, error);
      }
    }
    await refreshOfflineStats();
    const failedCount = likedTracksToDownload.length - downloadedCount;
    showToast(
      failedCount === 0
        ? `✓ All ${downloadedCount} liked songs cached offline!`
        : `Downloaded ${downloadedCount} liked songs; ${failedCount} could not be downloaded.`
    );
  };

  const handleClearOfflineCache = async () => {
    await offlineStorage.clearAllDownloads();
    await refreshOfflineStats();
    showToast('Offline audio cache cleared');
  };

  // Cross-Device Sync Operations
  const handleGenerateSyncCode = () => {
    const newCode = syncService.generateSyncCode();
    setSyncCode(newCode);
    syncService.saveSyncCode(newCode);
    handleManualSync(newCode);
  };

  const handleManualSync = async (codeToUse?: string) => {
    const code = codeToUse || syncCode;
    if (!code) {
      setIsSyncModalOpen(true);
      return;
    }

    setIsSyncing(true);
    const payload: SyncPayload = {
      syncCode: code,
      playlists,
      likedTrackIds,
      history: historyTrackIds,
      updatedAt: new Date().toISOString(),
    };

    const pushResult = await syncService.pushLibrary(payload);
    const remoteData = await syncService.pullLibrary(code);

    if (remoteData) {
      const merged = syncService.mergeLibraries(playlists, likedTrackIds, historyTrackIds, remoteData);
      setPlaylists(merged.mergedPlaylists);
      setLikedTrackIds(merged.mergedLiked);
      setHistoryTrackIds(merged.mergedHistory);
    }

    setIsSyncing(false);
    setLastSyncedAt(new Date().toISOString());
    showToast(pushResult.message || 'Library synchronized across devices!');
  };

  const handleConnectSyncCode = async (code: string): Promise<boolean> => {
    setIsSyncing(true);
    const remoteData = await syncService.pullLibrary(code);

    if (remoteData) {
      const merged = syncService.mergeLibraries(playlists, likedTrackIds, historyTrackIds, remoteData);
      setPlaylists(merged.mergedPlaylists);
      setLikedTrackIds(merged.mergedLiked);
      setHistoryTrackIds(merged.mergedHistory);
      setSyncCode(code.toUpperCase().trim());
      syncService.saveSyncCode(code.toUpperCase().trim());
      setLastSyncedAt(new Date().toISOString());
      setIsSyncing(false);
      showToast(`Connected to sync key ${code.toUpperCase()}!`);
      return true;
    } else {
      // Create fresh room on cloud
      const newPayload: SyncPayload = {
        syncCode: code.toUpperCase().trim(),
        playlists,
        likedTrackIds,
        history: historyTrackIds,
        updatedAt: new Date().toISOString(),
      };
      await syncService.pushLibrary(newPayload);
      setSyncCode(code.toUpperCase().trim());
      syncService.saveSyncCode(code.toUpperCase().trim());
      setLastSyncedAt(new Date().toISOString());
      setIsSyncing(false);
      showToast(`Linked new sync key ${code.toUpperCase()}!`);
      return true;
    }
  };

  // Playlist Management
  const handleCreatePlaylist = (title: string, description: string, gradient: string) => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      title,
      description,
      coverGradient: gradient,
      trackIds: trackToAddToPlaylist ? [trackToAddToPlaylist.id] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (trackToAddToPlaylist) {
      registerTracks([trackToAddToPlaylist]);
    }

    setPlaylists((prev) => [newPlaylist, ...prev]);
    showToast(
      trackToAddToPlaylist
        ? `Created folder "${title}" and added song!`
        : `Created folder "${title}"`
    );
    setTrackToAddToPlaylist(null);
    setIsPlaylistModalOpen(false);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    showToast('Folder deleted');
  };

  const handleToggleTrackInPlaylist = (playlistId: string, trackOrId: Track | string) => {
    const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId.id;
    if (typeof trackOrId !== 'string') {
      registerTracks([trackOrId]);
    } else {
      const found = allTracks.find((t) => t.id === trackId || t.youtubeId === trackId);
      if (found) registerTracks([found]);
    }
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const exists = pl.trackIds.includes(trackId);
        const nextIds = exists
          ? pl.trackIds.filter((id) => id !== trackId)
          : [...pl.trackIds, trackId];
        showToast(exists ? `Removed from "${pl.title}"` : `Saved to "${pl.title}"`);
        return {
          ...pl,
          trackIds: nextIds,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Sleep Timer Handler
  const handleSetSleepTimer = (val: number | 'end_of_track' | null) => {
    if (val === null) {
      setSleepTimerRemaining(null);
      setSleepTimerStopAtEnd(false);
      showToast('Sleep timer turned off');
    } else if (val === 'end_of_track') {
      setSleepTimerStopAtEnd(true);
      setSleepTimerRemaining(null);
      showToast('Playback will stop at end of track');
    } else {
      setSleepTimerStopAtEnd(false);
      setSleepTimerRemaining(val * 60);
      showToast(`Sleep timer set for ${val} minutes`);
    }
  };

  // Equalizer Preset
  const handleSelectEqualizer = (preset: EqualizerPreset) => {
    setEqualizerPreset(preset);
    audioEngine.setEqualizer(preset);
    showToast(`Equalizer: ${preset.toUpperCase()}`);
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    audioEngine.setPlaybackRate(rate);
    showToast(`Speed: ${rate}x`);
  };

  // Active playlist title for player modal
  const activePlaylistTitle = selectedPlaylistId
    ? playlists.find((p) => p.id === selectedPlaylistId)?.title
    : undefined;

  return (
    <div className="min-h-screen w-full bg-[#040508] flex items-center justify-center sm:p-2 md:p-3 overflow-hidden select-none">
      {/* Smartphone Mobile App Frame (Full-bleed on mobile, authentic smartphone shell on desktop) */}
      <div className="relative w-full max-w-[430px] h-[100dvh] sm:h-[880px] sm:max-h-[92vh] bg-[#090a0f] text-slate-100 sm:rounded-[48px] sm:border-[8px] sm:border-slate-800/90 sm:shadow-[0_25px_80px_rgba(0,0,0,0.95)] sm:ring-1 sm:ring-white/10 flex flex-col overflow-hidden overflow-x-hidden font-sans">
        
        {/* Smartphone top status bar (simulated on desktop frame) */}
        <div className="hidden sm:flex items-center justify-between px-7 pt-3 pb-1 z-40 bg-[#090a0f] select-none text-[12px] font-semibold text-slate-300 flex-shrink-0">
          <span>9:41</span>
          <div className="w-24 h-5 rounded-full bg-black/90 border border-white/10 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 mr-2" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/80 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[10px] font-mono">5G</span>
            <div className="w-5 h-2.5 rounded-sm border border-slate-400 p-0.5 flex items-center">
              <div className="w-full h-full bg-emerald-400 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Top Header */}
        <Header
          onOpenSync={() => setIsSyncModalOpen(true)}
          syncCode={syncCode}
          isSyncing={isSyncing}
          onQuickSync={() => handleManualSync()}
          onOpenSettings={() => setCurrentTab('settings')}
        />

        {/* Main Scrolling Content Area (with hidden scrollbar) */}
        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar px-3 pt-2 pb-44">
          {currentTab === 'home' && (
          <HomeView
            playlists={playlists}
            allTracks={allTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            offlineTrackIds={offlineTrackIds}
            onPlayTrack={handlePlayTrack}
            onPlayPlaylist={handlePlayPlaylist}
            onToggleLike={handleToggleLike}
            onDownloadTrack={handleDownloadTrack}
            onSelectPlaylist={(p) => {
              setSelectedPlaylistId(p.id);
              setCurrentTab('library');
            }}
            onNavigateToExplore={() => setCurrentTab('explore')}
            onRegisterTracks={registerTracks}
            onOpenAddToPlaylist={(track) => {
              setTrackToAddToPlaylist(track);
              setIsPlaylistModalOpen(true);
            }}
          />
        )}

        {currentTab === 'explore' && (
          <ExploreView
            allTracks={allTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            offlineTrackIds={offlineTrackIds}
            onPlayTrack={handlePlayTrack}
            onToggleLike={handleToggleLike}
            onDownloadTrack={handleDownloadTrack}
            onRegisterTracks={registerTracks}
            onOpenAddToPlaylist={(track) => {
              setTrackToAddToPlaylist(track);
              setIsPlaylistModalOpen(true);
            }}
          />
        )}

        {currentTab === 'library' && (
          <LibraryView
            playlists={playlists}
            allTracks={allTracks}
            likedTrackIds={likedTrackIds}
            offlineTrackIds={offlineTrackIds}
            historyTrackIds={historyTrackIds}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            offlineStorageStats={offlineStorageStats}
            onPlayTrack={handlePlayTrack}
            onPlayPlaylist={handlePlayPlaylist}
            onToggleLike={handleToggleLike}
            onDownloadTrack={handleDownloadTrack}
            onOpenCreatePlaylist={() => {
              setTrackToAddToPlaylist(null);
              setIsPlaylistModalOpen(true);
            }}
            onDeletePlaylist={handleDeletePlaylist}
            onRemoveTrackFromPlaylist={(playlistId, trackId) => handleToggleTrackInPlaylist(playlistId, trackId)}
            onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylistId={setSelectedPlaylistId}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            syncCode={syncCode}
            lastSyncedAt={lastSyncedAt}
            isSyncing={isSyncing}
            offlineStorageStats={offlineStorageStats}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onManualSync={() => handleManualSync()}
            onClearOfflineCache={handleClearOfflineCache}
            onDownloadAllLiked={handleDownloadAllLiked}
          />
        )}
      </main>

      {/* Background YouTube Audio Player Engine */}
      <YouTubePlayerBridge
        ref={ytPlayerRef}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        onTimeUpdate={(curr, dur) => {
          if (currentTrack?.youtubeId && !localAudioRef.current) {
            setCurrentTime(curr);
            if (dur > 0) setDuration(dur);
          }
        }}
        onStateChange={() => {
          // Play and pause stay under the app buttons. YouTube's own
          // pause events were flipping the button the other way.
        }}
        onEnded={() => {
          if (!localAudioRef.current) {
            handleNextTrack();
          }
        }}
      />

      {/* Full-Screen Immersive Mobile Player Modal */}
      <FullPlayerModal
        isOpen={isFullPlayerOpen}
        onClose={() => setIsFullPlayerOpen(false)}
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        repeatMode={repeatMode}
        isShuffle={isShuffle}
        playbackRate={playbackRate}
        equalizerPreset={equalizerPreset}
        sleepTimerRemaining={sleepTimerRemaining}
        isLiked={currentTrack ? likedTrackIds.includes(currentTrack.id) : false}
        isDownloaded={currentTrack ? offlineTrackIds.includes(currentTrack.id) : false}
        downloadProgress={currentTrack ? downloadProgressMap[currentTrack.id] : null}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={() => currentTrack && handleToggleLike(currentTrack.id)}
        onDownload={() => currentTrack && handleDownloadTrack(currentTrack)}
        onOpenQueue={() => setIsQueueOpen(true)}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenAddToPlaylist={() => {
          setTrackToAddToPlaylist(currentTrack);
          setIsPlaylistModalOpen(true);
        }}
        onSetVolume={handleSetVolume}
        onToggleMute={handleToggleMute}
        onVideoModeChange={handleVideoModeChange}
        activePlaylistTitle={activePlaylistTitle}
      />

      {/* Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        queueIndex={queueIndex}
        currentTrack={currentTrack}
        onSelectTrack={(t, idx) => {
          setQueueIndex(idx);
          setCurrentTrack(t);
          audioEngine.playTrack(t);
        }}
        onRemoveTrack={(idx) => {
          setQueue((q) => q.filter((_, i) => i !== idx));
        }}
        onClearQueue={() => {
          if (currentTrack) {
            setQueue([currentTrack]);
            setQueueIndex(0);
          } else {
            setQueue([]);
          }
        }}
      />

      {/* Equalizer & Speed Modal */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        currentPreset={equalizerPreset}
        onSelectPreset={handleSelectEqualizer}
        playbackRate={playbackRate}
        onChangeRate={handleChangePlaybackRate}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
        remainingSeconds={sleepTimerRemaining}
        onSetTimer={handleSetSleepTimer}
      />

      {/* Playlist Creation / Add Song Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setTrackToAddToPlaylist(null);
        }}
        playlists={playlists}
        trackToAddTo={trackToAddToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
        onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
      />

      {/* Cross-Device Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncCode={syncCode}
        onGenerateCode={handleGenerateSyncCode}
        onConnectCode={handleConnectSyncCode}
        onManualSync={() => handleManualSync()}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        playlistsCount={playlists.length}
        likedCount={likedTrackIds.length}
        onExport={() => {
          syncService.exportToFile({
            syncCode: syncCode || 'AURA-LOCAL',
            playlists,
            likedTrackIds,
            history: historyTrackIds,
            updatedAt: new Date().toISOString(),
          });
          showToast('Library exported to JSON!');
        }}
        onImport={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = JSON.parse(e.target?.result as string);
              if (data && data.playlists) {
                const merged = syncService.mergeLibraries(playlists, likedTrackIds, historyTrackIds, data);
                setPlaylists(merged.mergedPlaylists);
                setLikedTrackIds(merged.mergedLiked);
                setHistoryTrackIds(merged.mergedHistory);
                showToast('Imported and merged backup file!');
                setIsSyncModalOpen(false);
              }
            } catch {
              showToast('Invalid JSON backup file');
            }
          };
          reader.readAsText(file);
        }}
      />

      {/* Bottom Floating Player & Navigation Bar Dock (smoothly slides down when keyboard is open) */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col pointer-events-none transition-all duration-300 ease-out ${
          isKeyboardOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Floating Mini Player (visible when full player isn't open) */}
        {!isFullPlayerOpen && (
          <div className="pointer-events-auto px-2.5 pb-2">
            <MiniPlayer
              track={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              isLiked={currentTrack ? likedTrackIds.includes(currentTrack.id) : false}
              isDownloaded={currentTrack ? offlineTrackIds.includes(currentTrack.id) : false}
              onTogglePlay={handleTogglePlay}
              onNext={handleNextTrack}
              onToggleLike={(e) => {
                e.stopPropagation();
                if (currentTrack) handleToggleLike(currentTrack.id);
              }}
              onExpand={() => {
                if (currentTrack) setIsFullPlayerOpen(true);
              }}
            />
          </div>
        )}

        {/* Bottom Mobile Navigation */}
        <div className="pointer-events-auto">
          <BottomNav
            currentTab={currentTab}
            onSelectTab={(tab) => {
              setSelectedPlaylistId(null);
              setCurrentTab(tab);
            }}
            syncCode={syncCode}
          />
        </div>
      </div>

      {/* Bottom Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-purple-500/30 text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce flex items-center gap-2 max-w-[85%] text-center">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping flex-shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Simulated Home Bar indicator on desktop frame */}
      <div className="hidden sm:block absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full pointer-events-none z-40" />
      </div>
    </div>
  );
}
