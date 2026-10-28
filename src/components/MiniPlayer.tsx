import React from 'react';
import { Play, Pause, SkipForward, Heart, ChevronUp, WifiOff } from 'lucide-react';
import { Track } from '../types/music';

interface MiniPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLiked: boolean;
  isDownloaded: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onToggleLike: (e: React.MouseEvent) => void;
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  isLiked,
  isDownloaded,
  onTogglePlay,
  onNext,
  onToggleLike,
  onExpand,
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={track ? onExpand : undefined}
      className={`relative w-full transition-all duration-200 group select-none ${track ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80 p-2 sm:p-2.5 flex items-center justify-between">
        {/* Ambient glow accent matching current track color */}
        <div
          className="absolute -inset-4 opacity-25 blur-xl pointer-events-none transition-colors duration-700"
          style={{ backgroundColor: track?.accentColor || '#334155' }}
        />

        {/* Top Slim Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-150"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {/* Track Thumbnail & Title */}
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="relative flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden shadow-md bg-slate-800 flex items-center justify-center">
            {track ? (
              <img
                src={track.artworkUrl}
                alt={track.title}
                className={`w-full h-full object-cover transition-transform duration-500 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                </div>
              </div>
            )}
            {track && isDownloaded && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-tl-sm flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">✓</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-purple-300 transition-colors">
                {track ? track.title : 'No Song Playing'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 truncate">
              {track ? track.artist : 'Select a track to play'}
            </span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Like Heart */}
          <button
            onClick={onToggleLike}
            className="p-2 text-slate-400 hover:text-white transition-colors active:scale-90"
            title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isLiked ? 'fill-pink-500 text-pink-500' : 'text-slate-400 hover:text-white'
              }`}
            />
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-slate-950" />
            ) : (
              <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            className="p-2 text-slate-400 hover:text-white transition-colors active:scale-90"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Swipe/Expand Indicator */}
          <button
            onClick={onExpand}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors hidden xs:block"
            title="Expand Full Player"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
