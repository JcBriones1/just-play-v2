import React, { useEffect, useRef } from 'react';
import { LyricLine } from '../types/music';

interface LiveLyricsProps {
  lyrics: LyricLine[];
  currentTime: number;
  onSeekToLyric: (time: number) => void;
  accentColor: string;
  isLoading?: boolean;
}

export const LiveLyrics: React.FC<LiveLyricsProps> = ({
  lyrics,
  currentTime,
  onSeekToLyric,
  accentColor,
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Determine current active lyric index
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Auto-scroll active lyric into center
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (isLoading && (!lyrics || lyrics.length === 0)) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm space-y-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span className="font-medium text-purple-300">Finding accurate lyrics...</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Syncing with LRCLIB database</span>
      </div>
    );
  }

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm space-y-1">
        <span>No synchronized lyrics available for this track</span>
        <span className="text-xs text-slate-600">Enjoy the music!</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-h-[340px] overflow-y-auto no-scrollbar py-12 px-4 space-y-6 text-center select-none"
    >
      {lyrics.map((line, idx) => {
        const isActive = idx === activeIndex;
        const isPast = idx < activeIndex;

        return (
          <div
            key={idx}
            ref={isActive ? activeLineRef : null}
            onClick={() => onSeekToLyric(line.time)}
            className={`cursor-pointer transition-all duration-300 transform ${
              isActive
                ? 'scale-105 text-white font-bold text-lg sm:text-xl drop-shadow-md'
                : isPast
                ? 'text-slate-400 font-medium text-sm sm:text-base opacity-75 hover:opacity-100'
                : 'text-slate-500 font-medium text-sm sm:text-base opacity-40 hover:opacity-80'
            }`}
            style={{
              color: isActive ? '#ffffff' : undefined,
              textShadow: isActive ? `0 0 20px ${accentColor || '#8b5cf6'}` : undefined,
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};
