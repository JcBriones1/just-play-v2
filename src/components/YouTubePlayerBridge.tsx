import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Track } from '../types/music';

// Extend window for YouTube IFrame API
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
  }
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVideoData?: () => { video_id?: string };
  loadVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
  destroy: () => void;
}

export interface YouTubePlayerBridgeRef {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  loadVideoById: (videoId: string) => void;
  loadAndPlay: (videoId: string) => void;
  playVideo: () => void;
}


interface YouTubePlayerBridgeProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onStateChange: (isPlaying: boolean) => void;
  onEnded: () => void;
  volume: number;
  isMuted: boolean;
  isVideoMode?: boolean;
}

export const YouTubePlayerBridge = forwardRef<YouTubePlayerBridgeRef, YouTubePlayerBridgeProps>(
  (
    {
      currentTrack,
      isPlaying,
      onTimeUpdate,
      onStateChange,
      onEnded,
      volume,
      isMuted,
      isVideoMode = false,
    },
    ref
  ) => {
    const playerRef = useRef<YTPlayerInstance | null>(null);
    const [isApiReady, setIsApiReady] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const lastTrackIdRef = useRef<string | null>(null);
    const timeIntervalRef = useRef<number | null>(null);
    const hiddenReplayCountRef = useRef(0);
    const ignoreEndedUntilRef = useRef(0);
    const wantPlayRef = useRef(isPlaying);
    const currentTrackRef = useRef(currentTrack);
    const onStateChangeRef = useRef(onStateChange);
    const onEndedRef = useRef(onEnded);
    currentTrackRef.current = currentTrack;
    onStateChangeRef.current = onStateChange;
    onEndedRef.current = onEnded;

    // Load YouTube IFrame API script
    useEffect(() => {
      if (typeof window === 'undefined') return;

      if (window.YT && window.YT.Player) {
        setIsApiReady(true);
        return;
      }

      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        setIsApiReady(true);
      };
    }, []);

    // Initialize player once API is ready
    useEffect(() => {
      if (!isApiReady || playerRef.current) return;

      try {
        const player = new window.YT!.Player('yt-music-player-container', {
          height: '100%',
          width: '100%',
          // Use a silent short video for initialization to ensure the player is "Ready"
          // This specific ID is a 1-second silent video
          videoId: currentTrack?.youtubeId || 'y6120QOlsfU',
          playerVars: {
            autoplay: 0,
            controls: isVideoMode ? 1 : 0,
            disablekb: 1,
            fs: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              playerRef.current = event.target;
              setIsPlayerReady(true);
              event.target.setVolume(isMuted ? 0 : Math.round(volume * 100));

              // If a track was already selected while we were initializing, load it now
              const pending = currentTrackRef.current;
              if (pending?.youtubeId && wantPlayRef.current) {
                lastTrackIdRef.current = pending.youtubeId;
                event.target.loadVideoById(pending.youtubeId);
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              const state = event.data;
              if (state === 1) {
                hiddenReplayCountRef.current = 0;
                return;
              }
              if (state === 2) {
                // Home hides the page. Resume only when the user still wants playback.
                if (
                  wantPlayRef.current &&
                  document.visibilityState === 'hidden' &&
                  hiddenReplayCountRef.current < 6
                ) {
                  hiddenReplayCountRef.current += 1;
                  try {
                    event.target.playVideo();
                  } catch {
                    // Ignore resume failures while backgrounded.
                  }
                }
                return;
              }
              if (state === 0) {
                if (Date.now() < ignoreEndedUntilRef.current) return;
                const wanted = currentTrackRef.current?.youtubeId;
                if (!wanted) return;
                let endedId = '';
                try {
                  endedId = event.target.getVideoData?.().video_id || '';
                } catch {
                  endedId = '';
                }
                if (endedId && endedId !== wanted) return;
                onEndedRef.current();
              }
            },
            onError: (err) => {
              console.warn('YouTube Player error code:', err.data);
            },
          },
        });
      } catch (err) {
        console.warn('Could not initialize YouTube Player:', err);
      }

      return () => {
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {
            // Ignore destroy errors on unmount
          }
          playerRef.current = null;
        }
      };
    }, [isApiReady]);

    // Handle track changes
    useEffect(() => {
      if (!isPlayerReady || !playerRef.current || !currentTrack?.youtubeId) return;

      // If this is the same video that's already loaded, just ensure it's playing if needed
      if (lastTrackIdRef.current === currentTrack.youtubeId) {
        if (isPlaying) {
          try {
            const state = playerRef.current.getPlayerState();
            if (state !== 1 && state !== 3) playerRef.current.playVideo();
          } catch (e) {}
        }
        return;
      }

      lastTrackIdRef.current = currentTrack.youtubeId;
      try {
        // Use loadVideoById which is more reliable for track switching
        playerRef.current.loadVideoById(currentTrack.youtubeId);
        if (isPlaying) {
          playerRef.current.playVideo();
        }
      } catch (e) {
        console.warn('Failed loading track into YouTube player:', e);
      }
    }, [currentTrack?.youtubeId, isPlayerReady, isPlaying]);

    // Handle separate play/pause state synchronization (back-up for simple toggles)
    useEffect(() => {
      if (!isPlayerReady || !playerRef.current || !currentTrack?.youtubeId) return;

      try {
        const state = playerRef.current.getPlayerState();
        if (isPlaying && state !== 1 && state !== 3) {
          wantPlayRef.current = true;
          playerRef.current.playVideo();
        } else if (!isPlaying && state === 1) {
          wantPlayRef.current = false;
          playerRef.current.pauseVideo();
        }
      } catch (e) {
        // Ignored
      }
    }, [isPlaying, isPlayerReady, currentTrack?.youtubeId]);

    // Handle volume/mute updates
    useEffect(() => {
      if (!isPlayerReady || !playerRef.current) return;
      try {
        playerRef.current.setVolume(isMuted ? 0 : Math.round(volume * 100));
      } catch {
        // Ignored
      }
    }, [volume, isMuted, isPlayerReady]);

    // Timer to track currentTime and duration
    useEffect(() => {
      if (!isPlayerReady || !playerRef.current) return;

      const updateProgress = () => {
        if (!playerRef.current) return;
        try {
          const curr = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (Number.isFinite(curr)) {
            onTimeUpdate(curr, Number.isFinite(dur) && dur > 0 ? dur : currentTrack?.duration || 0);
          }
        } catch {
          // Ignored
        }
      };

      timeIntervalRef.current = window.setInterval(updateProgress, 350);

      return () => {
        if (timeIntervalRef.current) {
          clearInterval(timeIntervalRef.current);
        }
      };
    }, [isPlayerReady, onTimeUpdate, currentTrack?.duration]);

    // Expose ref commands to App
    useImperativeHandle(ref, () => ({
      play: () => {
        wantPlayRef.current = true;
        if (playerRef.current) {
          try {
            playerRef.current.playVideo();
          } catch (e) {
            console.warn(e);
          }
        }
      },
      pause: () => {
        wantPlayRef.current = false;
        hiddenReplayCountRef.current = 0;
        if (playerRef.current) {
          try {
            playerRef.current.pauseVideo();
          } catch (e) {
            console.warn(e);
          }
        }
      },
      seek: (seconds: number) => {
        if (playerRef.current) {
          try {
            playerRef.current.seekTo(seconds, true);
          } catch (e) {
            console.warn(e);
          }
        }
      },
      setVolume: (vol: number) => {
        if (playerRef.current) {
          try {
            playerRef.current.setVolume(Math.round(vol * 100));
          } catch (e) {
            console.warn(e);
          }
        }
      },
      loadVideoById: (videoId: string) => {
        lastTrackIdRef.current = videoId;
        if (playerRef.current) {
          try {
            playerRef.current.loadVideoById(videoId);
          } catch (e) {
            console.warn(e);
          }
        }
      },
      loadAndPlay: (videoId: string) => {
        wantPlayRef.current = true;
        lastTrackIdRef.current = videoId;
        hiddenReplayCountRef.current = 0;
        ignoreEndedUntilRef.current = Date.now() + 1200;
        if (playerRef.current) {
          try {
            playerRef.current.loadVideoById(videoId);
            playerRef.current.playVideo();
          } catch (e) {
            console.warn(e);
          }
        }
      },
      playVideo: () => {
        if (playerRef.current) {
          try {
            playerRef.current.playVideo();
          } catch (e) {
            console.warn(e);
          }
        }
      },
    }));

    return (
      <div
        className={
          isVideoMode
            ? 'w-full h-full rounded-2xl overflow-hidden shadow-2xl relative bg-black'
            : 'fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none overflow-hidden'
        }
      >
        <div id="yt-music-player-container" className="w-full h-full" />
      </div>
    );
  }
);
