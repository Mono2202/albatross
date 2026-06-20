import { useState, useEffect, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RestartButton } from './RestartButton';

type Config = Record<string, string>;

export function IntegrationsSection() {
  const { data: config } = useQuery<Config>({
    queryKey: ['server-config'],
    queryFn: () => fetch('/config').then(r => r.json()),
    staleTime: Infinity,
  });

  const [form, setForm] = useState({
    spotify_client_id:     '',
    spotify_client_secret: '',
    spotify_redirect_uri:  '',
    reviews_path:          '',
    assets_path:           '',
    food_path:             '',
    food_assets_path:      '',
    finance_path:          '',
    subscriptions_path:    '',
  });
  const [initialized, setInitialized] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (config && !initialized) {
      setForm({
        spotify_client_id:     config.spotify_client_id ?? '',
        spotify_client_secret: config.spotify_client_secret ?? '',
        spotify_redirect_uri:  config.spotify_redirect_uri ?? '',
        reviews_path:          config.reviews_path ?? '',
        assets_path:           config.assets_path ?? '',
        food_path:             config.food_path ?? '',
        food_assets_path:      config.food_assets_path ?? '',
        finance_path:          config.finance_path ?? '',
        subscriptions_path:    config.subscriptions_path ?? '',
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

  function field(key: keyof typeof form, label: string, opts?: { type?: string; placeholder?: string }) {
    return (
      <div key={key} className="settings-field">
        <label className="settings-label">{label}</label>
        <input
          type={opts?.type ?? 'text'}
          value={form[key]}
          onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    );
  }

  const secretType = showSecrets ? 'text' : 'password';

  return (
    <form className="settings-section" onSubmit={handleSubmit}>
      <div className="settings-h3">Spotify</div>

      {field('spotify_client_id',     'Client ID',     { type: secretType })}
      {field('spotify_client_secret', 'Client Secret', { type: secretType })}
      {field('spotify_redirect_uri',  'Redirect URI')}

      <div className="settings-toggle-row">
        <label className="settings-switch">
          <input type="checkbox" checked={showSecrets} onChange={e => setShowSecrets(e.target.checked)} />
          <span className="settings-switch-track" />
        </label>
        <span className="settings-toggle-label">Show credentials</span>
      </div>

      <div className="settings-field">
        <label className="settings-label">Music Reviews Path</label>
        <input
          type="text"
          value={form.reviews_path}
          onChange={e => setForm(prev => ({ ...prev, reviews_path: e.target.value }))}
          placeholder="Vault-relative folder"
          spellCheck={false}
        />
      </div>

      <div className="settings-field">
        <label className="settings-label">Music Assets Path</label>
        <input
          type="text"
          value={form.assets_path}
          onChange={e => setForm(prev => ({ ...prev, assets_path: e.target.value }))}
          placeholder="Vault-relative folder"
          spellCheck={false}
        />
      </div>

      <hr className="settings-divider" />
      <div className="settings-h3">Food</div>

      <div className="settings-field">
        <label className="settings-label">Food Reviews Path</label>
        <input
          type="text"
          value={form.food_path}
          onChange={e => setForm(prev => ({ ...prev, food_path: e.target.value }))}
          placeholder="Vault-relative folder"
          spellCheck={false}
        />
      </div>

      <div className="settings-field">
        <label className="settings-label">Food Assets Path</label>
        <input
          type="text"
          value={form.food_assets_path}
          onChange={e => setForm(prev => ({ ...prev, food_assets_path: e.target.value }))}
          placeholder="Vault-relative folder"
          spellCheck={false}
        />
      </div>

      <hr className="settings-divider" />
      <div className="settings-h3">Finance</div>

      <div className="settings-field">
        <label className="settings-label">Finance Folder</label>
        <input
          type="text"
          value={form.finance_path}
          onChange={e => setForm(prev => ({ ...prev, finance_path: e.target.value }))}
          placeholder="Vault-relative folder"
          spellCheck={false}
        />
      </div>

      <div className="settings-field">
        <label className="settings-label">Subscriptions File</label>
        <input
          type="text"
          value={form.subscriptions_path}
          onChange={e => setForm(prev => ({ ...prev, subscriptions_path: e.target.value }))}
          placeholder="Vault-relative path"
          spellCheck={false}
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
