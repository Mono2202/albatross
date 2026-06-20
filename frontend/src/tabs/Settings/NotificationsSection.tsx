import { useState, useEffect, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RestartButton } from './RestartButton';

type Config = Record<string, string>;

export function NotificationsSection() {
  const { data: config } = useQuery<Config>({
    queryKey: ['server-config'],
    queryFn: () => fetch('/config').then(r => r.json()),
    staleTime: Infinity,
  });

  const [form, setForm] = useState({
    pushover_api_token: '',
    pushover_user_key: '',
    daily_summary_time: '',
    daily_habits_time: '',
  });
  const [initialized, setInitialized] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (config && !initialized) {
      setForm({
        pushover_api_token: config.pushover_api_token ?? '',
        pushover_user_key:  config.pushover_user_key ?? '',
        daily_summary_time: config.daily_summary_time ?? '',
        daily_habits_time:  config.daily_habits_time ?? '',
      });
      setInitialized(true);
    }
  }, [config, initialized]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      const res = await fetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setFeedback(res.ok ? 'restart-required' : 'error');
    } catch {
      setFeedback('error');
    } finally {
      setSaving(false);
    }
  }

  const tokenType = showTokens ? 'text' : 'password';

  return (
    <form className="settings-section" onSubmit={handleSubmit}>
      <div className="settings-h3">Pushover</div>

      <div className="settings-field">
        <label className="settings-label">API Token</label>
        <input
          type={tokenType}
          value={form.pushover_api_token}
          onChange={e => setForm(prev => ({ ...prev, pushover_api_token: e.target.value }))}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="settings-field">
        <label className="settings-label">User Key</label>
        <input
          type={tokenType}
          value={form.pushover_user_key}
          onChange={e => setForm(prev => ({ ...prev, pushover_user_key: e.target.value }))}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="settings-toggle-row">
        <label className="settings-switch">
          <input type="checkbox" checked={showTokens} onChange={e => setShowTokens(e.target.checked)} />
          <span className="settings-switch-track" />
        </label>
        <span className="settings-toggle-label">Show credentials</span>
      </div>

      <hr className="settings-divider" />
      <div className="settings-h3">Reminder Times</div>

      <div className="settings-field">
        <label className="settings-label">Daily Summary</label>
        <input
          type="time"
          value={form.daily_summary_time}
          onChange={e => setForm(prev => ({ ...prev, daily_summary_time: e.target.value }))}
        />
      </div>

      <div className="settings-field">
        <label className="settings-label">Habits Reminder</label>
        <input
          type="time"
          value={form.daily_habits_time}
          onChange={e => setForm(prev => ({ ...prev, daily_habits_time: e.target.value }))}
        />
      </div>

      <div className="settings-save-row">
        <button type="submit" disabled={saving || !initialized}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {feedback === 'restart-required' && <RestartButton />}
        {feedback === 'error' && (
          <span className="settings-feedback err">Failed to save</span>
        )}
      </div>
    </form>
  );
}
