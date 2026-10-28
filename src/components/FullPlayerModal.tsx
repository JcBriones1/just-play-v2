import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  MoreVertical,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  ListMusic,
  Sliders,
  Moon,
  FolderPlus,
  Download,
  Check,
  RotateCcw,
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Track, RepeatMode, EqualizerPreset, LyricLine } from '../types/music';
import { AudioVisualizer } from './AudioVisualizer';
import { LiveLyrics } from './LiveLyrics';

interface FullPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  playbackRate: number;
  equalizerPreset: EqualizerPreset;
  sleepTimerRemaining: number | null;
  isLiked: boolean;
  isDownloaded: boolean;
  downloadProgress?: number | null;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onDownload: () => void;
  onOpenQueue: () => void;
  onOpenEqualizer: () => void;
  onOpenSleepTimer: () => void;
  onOpenAddToPlaylist: () => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  onVideoModeChange?: (isVideoMode: boolean) => void;
  activePlaylistTitle?: string;
}

type PlayerView = 'artwork' | 'video' | 'lyrics' | 'visualizer';

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  repeatMode,
  isShuffle,
  sleepTimerRemaining,
  isLiked,
  isDownloaded,
  downloadProgress,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onDownload,
  onOpenQueue,
  onOpenEqualizer,
  onOpenSleepTimer,
  onOpenAddToPlaylist,
  onSetVolume,
  onToggleMute,
  onVideoModeChange,
  activePlaylistTitle,
}) => {
  const [activeView, setActiveView] = useState<PlayerView>('artwork');
  const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  // Synchronize video mode so background audio bridge is paused while video iframe plays
  useEffect(() => {
    if (!isOpen) {
      onVideoModeChange?.(false);
      return;
    }
    if (activeView === 'video') {
      onVideoModeChange?.(true);
    } else {
      onVideoModeChange?.(false);
    }
  }, [activeView, isOpen, onVideoModeChange]);

  // Fetch real synchronized lyrics for current playing track
  useEffect(() => {
    if (!track) {
      setLyricsData([]);
      return;
    }

    let isMounted = true;
    setIsLoadingLyrics(true);

    // Initial lyrics if already on track
    if (track.lyrics && track.lyrics.length > 2) {
      setLyricsData(track.lyrics);
    }

    async function fetchLyrics() {
      if (!track) return;
      try {
        const queryParams = new URLSearchParams({
          title: track.title,
          artist: track.artist,
          duration: String(track.duration || 0),
        });
        const res = await fetch(`/api/lyrics?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.lyrics && Array.isArray(data.lyrics) && data.lyrics.length > 0) {
            setLyricsData(data.lyrics);
          }
        }
      } catch (err) {
        console.warn('Could not fetch lyrics:', err);
      } finally {
        if (isMounted) {
          setIsLoadingLyrics(false);
        }
      }
    }

    fetchLyrics();

    return () => {
      isMounted = false;
    };
  }, [track?.id, track?.title, track?.artist]);

  // Clean up video mode on unmount
  useEffect(() => {
    return () => {
      onVideoModeChange?.(false);
    };
  }, [onVideoModeChange]);

  if (!isOpen || !track) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="absolute inset-0 z-40 bg-[#090a0f] flex flex-col justify-between overflow-y-auto no-scrollbar pt-safe pb-safe select-none transition-all duration-300">
      {/* Dynamic Aura Ambient Background Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[60%] rounded-full opacity-25 blur-[120px] pointer-events-none transition-all duration-1000 -z-10"
        style={{ backgroundColor: track.accentColor || '#8b5cf6' }}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition active:scale-95"
          title="Minimize Player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center max-w-[200px]">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            Playing From
          </span>
          <span className="text-xs font-bold text-white truncate max-w-full">
            {activePlaylistTitle || 'JustPlay Catalog'}
          </span>
        </div>

        <button
          onClick={onOpenAddToPlaylist}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition active:scale-95"
          title="Add to Playlist"
        >
          <FolderPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Middle View Selector Tabs (Artwork & Video only) */}
      <div className="flex items-center justify-center gap-1.5 my-2 flex-shrink-0">
        <div className="flex bg-black/40 border border-white/10 p-1 rounded-full text-xs font-medium">
          <button
            onClick={() => setActiveView('artwork')}
            className={`px-4 py-1 rounded-full transition-all ${
              activeView === 'artwork'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Artwork
          </button>
          {track.youtubeId && (
            <button
              onClick={() => setActiveView('video')}
              className={`px-4 py-1 rounded-full transition-all ${
                activeView === 'video'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Video
            </button>
          )}
        </div>
      </div>

      {/* Center Dynamic Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-[280px]">
        {activeView === 'artwork' && (
          <div className="relative w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10 group bg-slate-900">
            <img
              src={track.artworkUrl}
              alt={track.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-105' : 'scale-100'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {activeView === 'video' && track.youtubeId && (
          <div className="relative w-full max-w-[340px] aspect-video rounded-2xl overflow-hidden shadow-2xl border border-rose-500/30 bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${track.youtubeId}?autoplay=${isPlaying ? 1 : 0}&start=${Math.floor(currentTime)}&playsinline=1&rel=0&modestbranding=1`}
              title={track.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Track Details & Action Badges */}
      <div className="px-6 flex-shrink-0 mt-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {track.title}
            </h2>
            <p className="text-sm text-slate-400 font-medium truncate mt-0.5">
              {track.artist} • <span className="text-slate-500">{track.album}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Download Button */}
            <button
              onClick={onDownload}
              disabled={downloadProgress !== null && downloadProgress !== undefined}
              className={`p-2.5 rounded-full border transition active:scale-95 ${
                isDownloaded
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
              title={isDownloaded ? 'Downloaded for Offline Play' : 'Download for Offline Play'}
            >
              {downloadProgress !== null && downloadProgress !== undefined ? (
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-purple-400 font-mono">
                    {downloadProgress}%
                  </span>
                </div>
              ) : isDownloaded ? (
                <Check className="w-5 h-5" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>

            {/* Favorite / Liked */}
            <button
              onClick={onToggleLike}
              className={`p-2.5 rounded-full border transition active:scale-95 ${
                isLiked
                  ? 'bg-pink-500/20 border-pink-500/40 text-pink-500'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrub Bar & Timestamps */}
        <div className="mt-5">
          <div className="relative w-full flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/15 cursor-pointer accent-purple-500"
              style={{
                background: `linear-gradient(to right, #a855f7 ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%)`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-between my-4">
          {/* Shuffle */}
          <button
            onClick={onToggleShuffle}
            className={`p-2 transition ${
              isShuffle ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Skip -10s */}
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="p-2 text-slate-400 hover:text-white transition"
            title="Rewind 10s"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrev}
            className="p-2 text-slate-300 hover:text-white transition active:scale-95"
            title="Previous Track"
          >
            <SkipBack className="w-7 h-7 fill-slate-300" />
          </button>

          {/* Big Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-purple-900/50 hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-white" />
            ) : (
              <Play className="w-7 h-7 fill-white ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNext}
            className="p-2 text-slate-300 hover:text-white transition active:scale-95"
            title="Next Track"
          >
            <SkipForward className="w-7 h-7 fill-slate-300" />
          </button>

          {/* Skip +10s */}
          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 10))}
            className="p-2 text-slate-400 hover:text-white transition"
            title="Forward 10s"
          >
            <RotateCw className="w-5 h-5" />
          </button>

          {/* Repeat Mode */}
          <button
            onClick={onToggleRepeat}
            className={`p-2 transition ${
              repeatMode !== 'off' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume & Bottom Tools Row */}
        <div className="flex items-center justify-between pt-2 pb-3 border-t border-white/5 text-slate-400 text-xs">
          {/* Quick Volume Slider */}
          <div className="flex items-center gap-2 flex-1 max-w-[140px]">
            <button onClick={onToggleMute} className="text-slate-400 hover:text-white">
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onSetVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg accent-purple-400"
            />
          </div>

          {/* Sound Tools */}
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenEqualizer}
              className="flex items-center gap-1 hover:text-white transition"
              title="Sound Equalizer"
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span className="hidden xs:inline">EQ</span>
            </button>

            <button
              onClick={onOpenSleepTimer}
              className={`flex items-center gap-1 hover:text-white transition ${
                sleepTimerRemaining !== null ? 'text-indigo-400 font-semibold' : ''
              }`}
              title="Sleep Timer"
            >
              <Moon className="w-4 h-4" />
              {sleepTimerRemaining !== null && (
                <span className="text-[10px] font-mono">
                  {Math.floor(sleepTimerRemaining / 60)}m
                </span>
              )}
            </button>

            <button
              onClick={onOpenQueue}
              className="flex items-center gap-1 hover:text-white transition"
              title="Up Next Queue"
            >
              <ListMusic className="w-4 h-4 text-slate-300" />
              <span className="hidden xs:inline">Queue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
