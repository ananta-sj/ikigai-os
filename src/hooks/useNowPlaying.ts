import { useEffect, useState } from 'react';
import type { NowPlayingRuntime } from '../types';
import { getNowPlayingRuntime, refreshNowPlaying, subscribeNowPlaying } from '../lib/nowPlaying';

let pollingUsers = 0;
let pollTimer: number | null = null;
let visibilityBound = false;

function onVisibilityChange() {
  if (document.visibilityState === 'visible') void refreshNowPlaying();
}

function retainPolling() {
  pollingUsers += 1;
  if (pollingUsers === 1 && typeof window !== 'undefined') {
    void refreshNowPlaying();
    pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshNowPlaying();
    }, 15_000);
    if (!visibilityBound) {
      document.addEventListener('visibilitychange', onVisibilityChange);
      visibilityBound = true;
    }
  }
  return () => {
    pollingUsers = Math.max(0, pollingUsers - 1);
    if (pollingUsers === 0 && pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (pollingUsers === 0 && visibilityBound) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      visibilityBound = false;
    }
  };
}

export function useNowPlaying(): NowPlayingRuntime {
  const [state, setState] = useState<NowPlayingRuntime>(() => getNowPlayingRuntime());
  useEffect(() => {
    const unsubscribe = subscribeNowPlaying(setState);
    const releasePolling = retainPolling();
    return () => { unsubscribe(); releasePolling(); };
  }, []);
  return state;
}
