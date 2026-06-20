import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MusicTrack } from '@/types';
import { playCompletionFeedback } from '@/utils/audioUtils';

// ── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <span
          key={n}
          className={`star${n <= value ? ' filled' : ''}${n <= hover ? ' hover' : ''}`}
          onClick={() => onChange(value === n ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
        >★</span>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Music() {
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [albumMode, setAlbumMode] = useState(() => localStorage.getItem('musicAlbumMode') !== 'false');
  const [customAlbumName, setCustomAlbumName] = useState('');
  const [status, setStatus] = useState('');
  const [statusOk, setStatusOk] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: albums = [] } = useQuery<string[]>({
    queryKey: ['music-albums'],
    queryFn: async () => {
      const res = await fetch('/music/albums');
      const d = await res.json();
      return d.albums ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  async function pollTrack() {
    try {
      const res = await fetch('/music/current-track');
      if (res.status === 401) { setAuthNeeded(true); setTrack(null); return; }
      if (res.status === 503) { setNotConfigured(true); setTrack(null); return; }
      setAuthNeeded(false);
      const d = await res.json();
      if (!d.track) { setTrack(null); return; }
      const newTrack: MusicTrack = d.track;
      setTrack(prev => {
        if (!prev || prev.track_id !== newTrack.track_id) {
          loadReview(newTrack);
          return newTrack;
        }
        return prev;
      });
    } catch (_) {}
  }

  async function loadReview(t: MusicTrack) {
    setRating(0);
    setNotes('');
    try {
      const params = new URLSearchParams({
        track_id: t.track_id,
        track_name: t.track_name,
        track_number: String(t.track_number),
        artist: t.artist,
        album_name: t.album_name,
        album_id: t.album_id,
        cover_url: t.cover_url,
        release_year: t.release_year,
        album_mode: String(albumMode),
        custom_album_name: customAlbumName,
      });
      const res = await fetch(`/music/get-review?${params}`);
      if (res.ok) {
        const d = await res.json();
        if (d.review) { setRating(d.review.rating); setNotes(d.review.notes ?? ''); }
      }
    } catch (_) {}
  }

  useEffect(() => {
    pollTrack();
    const id = setInterval(pollTrack, 5000);
    return () => clearInterval(id);
  }, []);

  // Reload review when albumMode or customAlbumName changes
  useEffect(() => {
    if (track) loadReview(track);
  }, [albumMode, customAlbumName]);

  async function submitReview() {
    if (!track) return;
    if (!rating) { setStatusOk(false); setStatus('Please select a rating.'); return; }
    setSubmitting(true);
    setStatus('Saving…');
    setStatusOk(true);
    try {
      const res = await fetch('/music/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, rating, notes, album_mode: albumMode, custom_album_name: customAlbumName }),
      });
      const d = await res.json();
      if (res.ok) { playCompletionFeedback(); setStatusOk(true); setStatus('Review saved!'); }
      else { setStatusOk(false); setStatus(d.error ?? 'Failed to save.'); }
    } catch (_) {
      setStatusOk(false); setStatus('Request failed.');
    }
    setSubmitting(false);
  }

  return (
    <div className="tab-panel active" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="music-container">
        <div className="card music-card">
          <div className="music-cover-wrap">
            {track?.cover_url
              ? <img className="music-cover" src={track.cover_url} alt="Album cover" />
              : <div className="music-cover-placeholder" />
            }
          </div>

          <div className="music-track-title">{track?.track_name ?? (authNeeded ? '' : notConfigured ? 'Spotify not configured.' : 'Nothing playing')}</div>
          <div className="music-track-meta">{track ? `${track.artist} · ${track.album_name} (${track.release_year})` : ''}</div>

          {track && (
            <div className="music-waveform">
              {Array.from({ length: 7 }).map((_, i) => <span key={i} />)}
            </div>
          )}

          <div className="music-mode-row">
            <span className="music-label">Mode</span>
            <label className="music-mode-toggle">
              <input type="checkbox" checked={albumMode} onChange={e => {
                const v = e.target.checked;
                setAlbumMode(v);
                localStorage.setItem('musicAlbumMode', String(v));
              }} />
              <span className="music-mode-track" />
            </label>
            <span className="music-mode-label">{albumMode ? 'Album page' : 'Song page'}</span>
          </div>

          {albumMode && (
            <div className="music-mode-row">
              <span className="music-label">Album</span>
              <input
                type="text"
                className="music-album-name-input"
                placeholder="Custom name (optional)"
                list="music-album-datalist"
                autoComplete="off"
                value={customAlbumName}
                onChange={e => setCustomAlbumName(e.target.value)}
              />
              <datalist id="music-album-datalist">
                {albums.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
          )}

          <div className="music-rating-row">
            <span className="music-label">Rating</span>
            <StarRating value={rating} onChange={setRating} />
            <span className="music-rating-text">{rating > 0 ? `${rating}/10` : '-/10'}</span>
          </div>

          <div style={{ width: '100%' }}>
            <div className="music-label" style={{ marginBottom: 6 }}>Notes</div>
            <textarea className="music-notes" rows={5} placeholder="Your notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <button className="music-submit-btn" onClick={submitReview} disabled={submitting || !track} title="Submit Review">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>

          <div className={`music-status${status ? (statusOk ? ' ok' : ' err') : ''}`}>{status}</div>

          {authNeeded && (
            <div className="music-auth-prompt">
              <p>Connect your Spotify account to start reviewing tracks.</p>
              <a href="/music/auth" className="music-auth-btn">Authorize Spotify</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
