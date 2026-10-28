import { Track, EqualizerPreset } from '../types/music';
import { offlineStorage } from './offlineStorage';

type PlaybackEventCallback = (data: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isBuffering: boolean;
}) => void;

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private listeners: Set<PlaybackEventCallback> = new Set();
  private onTrackEndedCallback: (() => void) | null = null;
  private currentTrack: Track | null = null;
  private isBuffering: boolean = false;
  private isContextInitialized: boolean = false;
  private pendingPlayPromise: Promise<void> | null = null;
  private playRequestId: number = 0;
  private activeBlobUrl: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.audio.addEventListener('timeupdate', () => {
      this.notifyListeners();
    });

    this.audio.addEventListener('play', () => {
      this.notifyListeners();
      this.updateMediaSessionPlaybackState('playing');
    });

    this.audio.addEventListener('pause', () => {
      this.notifyListeners();
      this.updateMediaSessionPlaybackState('paused');
    });

    this.audio.addEventListener('waiting', () => {
      this.isBuffering = true;
      this.notifyListeners();
    });

    this.audio.addEventListener('playing', () => {
      this.isBuffering = false;
      this.notifyListeners();
    });

    this.audio.addEventListener('ended', () => {
      if (this.onTrackEndedCallback) {
        this.onTrackEndedCallback();
      }
    });

    this.audio.addEventListener('error', () => {
      this.isBuffering = false;
      this.notifyListeners();
    });
  }

  public initAudioContext() {
    if (this.isContextInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      
      this.bassFilter = this.audioContext.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 250;

      this.midFilter = this.audioContext.createBiquadFilter();
      this.midFilter.type = 'peaking';
      this.midFilter.frequency.value = 1200;
      this.midFilter.Q.value = 1.0;

      this.trebleFilter = this.audioContext.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 4000;

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();

      try {
        this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
        this.sourceNode
          .connect(this.bassFilter)
          .connect(this.midFilter)
          .connect(this.trebleFilter)
          .connect(this.gainNode)
          .connect(this.analyserNode)
          .connect(this.audioContext.destination);
      } catch (nodeErr) {
        console.warn('Media element source already connected or blocked:', nodeErr);
      }

      this.isContextInitialized = true;
    } catch (e) {
      console.warn('Could not initialize Web Audio context graph:', e);
    }
  }

  public async playTrack(track: Track, srcOverride?: string | null): Promise<boolean> {
    const requestId = ++this.playRequestId;
    this.currentTrack = track;
    this.initAudioContext();

    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('Context resume failed:', err);
      }
    }

    let audioSrc = srcOverride || track.audioUrl;
    if (!srcOverride) {
      try {
        const offlineUrl = await offlineStorage.getOfflineAudioUrl(track.id);
        if (offlineUrl) {
          audioSrc = offlineUrl;
        }
      } catch {
        // Use the track URL when no offline copy is available.
      }
    }

    if (requestId !== this.playRequestId) {
      return false;
    }

    // Safely wait for any pending play promise to settle before loading new track
    if (this.pendingPlayPromise) {
      try {
        await this.pendingPlayPromise;
      } catch {
        // Ignored
      }
    }

    if (requestId !== this.playRequestId) {
      return false;
    }

    if (audioSrc.startsWith('blob:') || audioSrc.startsWith('data:')) {
      this.audio.removeAttribute('crossorigin');
    } else {
      this.audio.crossOrigin = 'anonymous';
    }

    if (this.activeBlobUrl && this.activeBlobUrl !== audioSrc) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }
    if (audioSrc.startsWith('blob:')) {
      this.activeBlobUrl = audioSrc;
    }

    if (this.audio.src !== audioSrc) {
      this.audio.src = audioSrc;
      this.audio.load();
    }

    try {
      this.pendingPlayPromise = this.audio.play();
      await this.pendingPlayPromise;
      this.updateMediaSession(track);
      return !this.audio.error;
    } catch (playErr: unknown) {
      const err = playErr as { name?: string };
      if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        console.warn('Playback initiation warning:', playErr);
      }
      return false;
    } finally {
      this.pendingPlayPromise = null;
    }
  }

  public async pause(): Promise<void> {
    if (this.pendingPlayPromise) {
      try {
        await this.pendingPlayPromise;
      } catch {
        // Ignored
      }
    }
    this.audio.pause();
  }

  public async resume(): Promise<void> {
    this.initAudioContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('Context resume failed:', err);
      }
    }
    try {
      this.pendingPlayPromise = this.audio.play();
      await this.pendingPlayPromise;
    } catch (err: unknown) {
      const playErr = err as { name?: string };
      if (playErr?.name !== 'AbortError' && playErr?.name !== 'NotAllowedError') {
        console.warn('Resume error:', err);
      }
    } finally {
      this.pendingPlayPromise = null;
    }
  }

  public seek(seconds: number): void {
    if (Number.isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 9999));
    }
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.audio.volume = clamped;
  }

  public setPlaybackRate(rate: number): void {
    this.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setEqualizer(preset: EqualizerPreset): void {
    if (!this.bassFilter || !this.midFilter || !this.trebleFilter) return;

    switch (preset) {
      case 'bass-boost':
        this.bassFilter.gain.value = 8;
        this.midFilter.gain.value = -1;
        this.trebleFilter.gain.value = 2;
        break;
      case 'vocal':
        this.bassFilter.gain.value = -3;
        this.midFilter.gain.value = 6;
        this.trebleFilter.gain.value = 3;
        break;
      case 'electronic':
        this.bassFilter.gain.value = 7;
        this.midFilter.gain.value = 2;
        this.trebleFilter.gain.value = 6;
        break;
      case 'acoustic':
        this.bassFilter.gain.value = 2;
        this.midFilter.gain.value = 4;
        this.trebleFilter.gain.value = 2;
        break;
      case 'treble':
        this.bassFilter.gain.value = -4;
        this.midFilter.gain.value = 1;
        this.trebleFilter.gain.value = 8;
        break;
      case 'flat':
      default:
        this.bassFilter.gain.value = 0;
        this.midFilter.gain.value = 0;
        this.trebleFilter.gain.value = 0;
        break;
    }
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyserNode && !this.audio.paused) {
      this.analyserNode.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>);
    } else {
      // Simulate soft idle pulse if analyser unavailable
      for (let i = 0; i < array.length; i++) {
        array[i] = 0;
      }
    }
  }

  public onEnded(callback: () => void): void {
    this.onTrackEndedCallback = callback;
  }

  public subscribe(cb: PlaybackEventCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notifyListeners(): void {
    const data = {
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || this.currentTrack?.duration || 0,
      isPlaying: !this.audio.paused && !this.audio.ended,
      isBuffering: this.isBuffering,
    };
    this.listeners.forEach((cb) => cb(data));
  }

  // Mobile Native MediaSession integration for lock screen and status bar
  private updateMediaSession(track: Track): void {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
          { src: track.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    }
  }

  private updateMediaSessionPlaybackState(state: 'playing' | 'paused'): void {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  public bindMediaSessionActions(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (seconds: number) => void;
  }): void {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', handlers.onPlay);
      navigator.mediaSession.setActionHandler('pause', handlers.onPause);
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          handlers.onSeek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(this.audio.currentTime - offset);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(this.audio.currentTime + offset);
      });
    } catch (e) {
      console.warn('Failed binding MediaSession actions:', e);
    }
  }
}

export const audioEngine = new AudioEngine();
