export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  audioUrl: string;
  artworkUrl: string;
  genre: string;
  mood: string;
  accentColor: string;
  bitrate?: string;
  bpm?: number;
  lyrics: LyricLine[];
  isDownloaded?: boolean;
  downloadSize?: string;
  youtubeId?: string;
  source?: 'youtube' | 'catalog' | 'offline';
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverGradient: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
  isSystem?: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type EqualizerPreset = 'flat' | 'bass-boost' | 'vocal' | 'electronic' | 'acoustic' | 'treble';

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  playbackRate: number;
  equalizerPreset: EqualizerPreset;
  queue: Track[];
  queueIndex: number;
  sleepTimerRemaining: number | null; // in seconds, null if not active
}

export interface LibraryState {
  playlists: Playlist[];
  likedTrackIds: string[];
  history: string[];
  offlineTrackIds: string[];
  lastSyncedAt: string | null;
  syncCode: string | null;
}

export interface SyncPayload {
  syncCode: string;
  playlists: Playlist[];
  likedTrackIds: string[];
  history: string[];
  updatedAt: string;
}
