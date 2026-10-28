import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Play,
  Heart,
  Download,
  Check,
  Sparkles,
  Loader2,
  TrendingUp,
  Youtube,
  Radio,
  Zap,
  FolderPlus,
} from 'lucide-react';
import { Track } from '../types/music';
import { loadSuggestedTracks, searchYouTubeTracks } from '../services/youtubeSearch';

interface ExploreViewProps {
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  offlineTrackIds: string[];
  onPlayTrack: (track: Track, queueList?: Track[]) => void;
  onToggleLike: (trackOrId: Track | string) => void;
  onDownloadTrack: (track: Track) => void;
  onRegisterTracks?: (tracks: Track[]) => void;
  onOpenAddToPlaylist?: (track: Track) => void;
}

const QUICK_TRENDING_CHIPS = [
  'Lofi Hip Hop',
  'Taylor Swift',
  'The Weeknd',
  'Coldplay',
  'Ed Sheeran',
  'Synthwave 80s',
  'Deep House Chill',
  'Acoustic Pop',
  'Anime Chill',
  'Sleep Ambient',
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  allTracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  offlineTrackIds,
  onPlayTrack,
  onToggleLike,
  onDownloadTrack,
  onRegisterTracks,
  onOpenAddToPlaylist,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onlineResults, setOnlineResults] = useState<Track[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<'youtube' | 'catalog'>('youtube');

  // Load initial trending YouTube music on mount
  useEffect(() => {
    let isCancelled = false;

    async function loadTrending() {
      setIsLoading(true);
      try {
        const results = await loadSuggestedTracks();
        if (!isCancelled && results.length > 0) {
          onRegisterTracks?.(results);
          setOnlineResults(results);
        }
      } catch (err) {
        console.warn('Could not fetch Suggested tracks:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTrending();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Perform search on YouTube
  const executeSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const results = await searchYouTubeTracks(query.trim());
      if (results.length > 0) {
        onRegisterTracks?.(results);
      }
      setOnlineResults(results);
    } catch (err) {
      console.warn('YouTube search request failed:', err);
      setOnlineResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search when typing
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const timer = setTimeout(() => {
      executeSearch(searchQuery);
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery, executeSearch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  // Filter local catalog tracks if in catalog mode
  const catalogResults = allTracks.filter((track) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.genre.toLowerCase().includes(q)
    );
  });

  const displayTracks = searchMode === 'youtube' ? onlineResults : catalogResults;

  return (
    <div className="space-y-6 pb-4 overflow-x-hidden">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Explore & Stream
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Search millions of songs on YouTube & stream them free
            </p>
          </div>

          {/* Search Source Selector */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSearchMode('youtube')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                searchMode === 'youtube'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Youtube className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </button>
            <button
              onClick={() => setSearchMode('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                searchMode === 'catalog'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Library</span>
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleFormSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchMode === 'youtube'
                ? 'Search any song or artist...'
                : 'Search catalog tracks...'
            }
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-20 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition shadow-inner"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setHasSearched(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition active:scale-95 shadow"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Quick Search Chips */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 pb-1">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
            Suggested:
          </span>
          {QUICK_TRENDING_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setSearchMode('youtube');
                setSearchQuery(chip);
                executeSearch(chip);
              }}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            {isLoading ? (
              <span className="flex items-center gap-2 text-rose-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </span>
            ) : searchQuery ? (
              `Results for "${searchQuery}" (${displayTracks.length})`
            ) : (
              `Suggested Songs (${displayTracks.length})`
            )}
          </h2>
          {searchMode === 'youtube' && (
            <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Suggested
            </span>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoading && displayTracks.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-16 rounded-2xl bg-white/5 animate-pulse flex items-center p-3 gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-white/10" />
                  <div className="h-2.5 w-1/4 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results List */}
        {!isLoading && displayTracks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 rounded-2xl bg-white/5 border border-white/5 p-6">
            <Youtube className="w-10 h-10 text-rose-500/50 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No tracks found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try searching for an artist or song name above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTracks.map((track, idx) => {
              const isCurrent =
                (track.youtubeId && currentTrack?.youtubeId === track.youtubeId) ||
                currentTrack?.id === track.id;
              const isLiked = likedTrackIds.includes(track.id);
              const isDownloaded = offlineTrackIds.includes(track.id);

              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => onPlayTrack(track, displayTracks)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all group ${
                    isCurrent
                      ? 'bg-rose-950/40 border border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : 'bg-white/5 border border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md bg-slate-800">
                      <img
                        src={track.artworkUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to youtube placeholder if image fails
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                        }}
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
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="truncate">{track.artist}</span>
                        {track.source === 'youtube' && (
                          <span className="flex-shrink-0 px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                            YT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
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

                    <span className="text-[11px] text-slate-500 font-mono hidden xs:inline w-12 text-right">
                      {Math.floor(track.duration / 60)}:
                      {(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
