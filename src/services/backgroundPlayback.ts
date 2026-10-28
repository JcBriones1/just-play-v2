type NativePlayback = {
  setPlaying: (playing: boolean, title: string, artist: string) => void;
};

function nativePlayback(): NativePlayback | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as Window & { JustPlayNative?: NativePlayback }).JustPlayNative;
  if (!bridge || typeof bridge.setPlaying !== 'function') return null;
  return bridge;
}

export function syncBackgroundPlayback(playing: boolean, title: string, artist: string): void {
  try {
    nativePlayback()?.setPlaying(playing, title, artist);
  } catch (err) {
    console.warn('Background playback bridge failed:', err);
  }
}
