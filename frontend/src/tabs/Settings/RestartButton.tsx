import { useState } from 'react';

type State = 'idle' | 'restarting' | 'timeout';

export function RestartButton() {
  const [state, setState] = useState<State>('idle');

  async function handleRestart() {
    setState('restarting');
    try {
      await fetch('/config/restart', { method: 'POST' });
    } catch { /* server may have already gone down */ }

    // Poll until the server responds again, then reload
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 800));
      try {
        const res = await fetch('/config');
        if (res.ok) { window.location.reload(); return; }
      } catch { /* still restarting */ }
    }
    setState('timeout');
  }

  if (state === 'restarting') {
    return (
      <span className="settings-restarting">
        <span className="spinner" />
        Restarting…
      </span>
    );
  }

  if (state === 'timeout') {
    return <span className="settings-feedback err">Restart timed out — refresh the page manually</span>;
  }

  return (
    <button type="button" className="settings-restart-btn" onClick={handleRestart}>
      ↺ Restart server now
    </button>
  );
}
