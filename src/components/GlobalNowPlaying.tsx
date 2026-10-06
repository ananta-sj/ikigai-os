import { Music2, Pause, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useNowPlaying } from '../hooks/useNowPlaying';
import { sendNowPlayingPlaybackAction } from '../lib/nowPlaying';
import '../now-playing-v030.css';

export function GlobalNowPlaying() {
  const location = useLocation();
  const runtime = useNowPlaying();
  const item = runtime.item;
  if (!runtime.connected || !item || location.pathname === '/now-playing') return null;

  const action = item.isPlaying ? 'pause' : 'play';
  const actionAllowed = item.canControl && (
    item.provider !== 'system'
      || item.controlCapabilities?.[action] === true
  );

  return (
    <aside className="now030-global" aria-label={`Now playing: ${item.title}${item.context ? ` by ${item.context}` : ''}`}>
      <Link to="/now-playing" className="now030-global-main">
        <Music2 size={15} aria-hidden="true" />
        <span>
          <small>{item.isPlaying ? 'NOW PLAYING' : 'PAUSED'}</small>
          <strong>{item.title}</strong>
          {item.context ? <em>{item.context}</em> : null}
        </span>
      </Link>
      {actionAllowed ? (
        <button
          type="button"
          className="now030-global-toggle"
          onClick={() => void sendNowPlayingPlaybackAction(action)}
          aria-label={item.isPlaying ? 'Pause playback' : 'Resume playback'}
        >
          {item.isPlaying ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        </button>
      ) : null}
    </aside>
  );
}
