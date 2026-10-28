import React, { useState, useEffect } from 'react';
import {
  Play,
  Heart,
  Download,
  Check,
  Radio,
  Zap,
  Search,
  Youtube,
  TrendingUp,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { loadSuggestedTracks } from '../services/youtubeSearch';

interface HomeViewProps {
  playlists: Playlist[];
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  offlineTrackIds: string[];
  onPlayTrack: (track: Track, playlist?: Track[]) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onToggleLike: (trackOrId: Track | string) => void;
  onDownloadTrack: (track: Track) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onNavigateToExplore: (searchQuery?: string) => void;
  onRegisterTracks?: (tracks: Track[]) => void;
  onOpenAddToPlaylist?: (track: Track) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  playlists,
  allTracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  offlineTrackIds,
  onPlayTrack,
  onPlayPlaylist,
  onToggleLike,
  onDownloadTrack,
  onSelectPlaylist,
  onRegisterTracks,
  onOpenAddToPlaylist,
}) => {
  const [youtubeTrending, setYoutubeTrending] = useState<Track[]>(() => {
    // Start with a small set of hand-picked high quality tracks
    return [...allTracks]
      .filter((t) => ['track-1', 'track-2', 'track-3', 'track-5', 'track-6'].includes(t.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  });
  const [loadingTrending, setLoadingTrending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchTrending() {
      if (youtubeTrending.length === 0) setLoadingTrending(true);

      try {
        const results = await loadSuggestedTracks();
        if (!cancelled && results.length >= 5) {
          onRegisterTracks?.(results);
          const shuffledPool = [...results].sort(() => Math.random() - 0.5);
          setYoutubeTrending(shuffledPool.slice(0, 5));
        }
      } catch (err) {
        console.warn('Failed to load Suggested songs:', err);
      } finally {
        if (!cancelled) setLoadingTrending(false);
      }
    }
    fetchTrending();
    return () => {
      cancelled = true;
    };
  }, [onRegisterTracks]);

  const trendingList = youtubeTrending;

  return (
    <div className="space-y-6 pb-4 overflow-x-hidden pt-1">
      {/* Suggested Tracks Stream */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              Suggested Song
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest hits selected for you</p>
          </div>
          {loadingTrending && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
        </div>

        <div className="space-y-2">
          {trendingList.length === 0 && !loadingTrending && (
             <div className="py-10 text-center text-slate-500 text-xs italic">
                Suggested songs will appear here
             </div>
          )}
          
          {trendingList.map((track, idx) => {
            const isCurrent =
              (track.youtubeId && currentTrack?.youtubeId === track.youtubeId) ||
              currentTrack?.id === track.id;
            const isLiked = likedTrackIds.includes(track.id);
            const isDownloaded = offlineTrackIds.includes(track.id);

            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => onPlayTrack(track, trendingList)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all group ${
                  isCurrent
                    ? 'bg-rose-950/40 border border-rose-500/30'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-4 text-center text-xs font-mono text-slate-500 font-semibold hidden sm:inline">
                    {idx + 1}
                  </span>

                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md bg-slate-800">
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div
                      className={`font-semibold text-xs sm:text-sm truncate ${
                        isCurrent ? 'text-rose-300 font-bold' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                      <span>{track.artist}</span>
                      {track.source === 'youtube' && (
                        <span className="px-1 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                          YT
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {onOpenAddToPlaylist && (
                    <button
                      onClick={() => onOpenAddToPlaylist(track)}
                      className="p-1.5 text-slate-400 hover:text-white transition"
                      title="Add to Folder"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onDownloadTrack(track)}
                    className="p-1.5 text-slate-400 hover:text-white transition"
                    title={isDownloaded ? 'Downloaded Offline' : 'Cache Offline'}
                  >
                    {isDownloaded ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => onToggleLike(track)}
                    className="p-1.5 text-slate-400 hover:text-white transition"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isLiked ? 'fill-pink-500 text-pink-500' : ''
                      }`}
                    />
                  </button>

                  <span className="text-[11px] text-slate-500 font-mono hidden xs:inline w-10 text-right">
                    {Math.floor(track.duration / 60)}:
                    {(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Playlists Carousel - Only visible when playlists exist */}
      {playlists.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Curated Playlists</h2>
              <p className="text-xs text-slate-400">Handcrafted selections ready for your library</p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-3 px-3">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist)}
                className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer"
              >
                <div
                  className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${playlist.coverGradient} p-4 flex flex-col justify-between shadow-xl relative overflow-hidden transition-transform duration-300 group-hover:scale-105`}
                >
                  <div className="self-end w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/20">
                    <Radio className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="z-10">
                    <h4 className="font-bold text-white text-sm line-clamp-1">{playlist.title}</h4>
                    <p className="text-[11px] text-slate-200 line-clamp-1 opacity-80">
                      {playlist.trackIds.length} tracks
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
