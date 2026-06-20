import { useState, useEffect, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RestartButton } from './RestartButton';

type Config = Record<string, string>;

const FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'vault_path',           label: 'Vault Root',           hint: 'Absolute path to your vault' },
  { key: 'inbox_path',           label: 'Inbox File',           hint: 'Vault-relative path to inbox.md' },
  { key: 'imploding_tasks_path', label: 'Imploding Tasks File', hint: 'Vault-relative path' },
  { key: 'daily_path',           label: 'Daily Journal Folder', hint: 'Vault-relative folder' },
  { key: 'habits_path',          label: 'Habits Folder',        hint: 'Vault-relative folder' },
  { key: 'archive_path',         label: 'Archive Folder',       hint: 'Vault-relative folder (excluded from autocomplete)' },
];

function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

export function VaultPathsSection() {
  const { data: config } = useQuery<Config>({
    queryKey: ['server-config'],
    queryFn: () => fetch('/config').then(r => r.json()),
    staleTime: Infinity,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [browseError, setBrowseError] = useState('');

  useEffect(() => {
    if (config && !initialized) {
      const initial: Record<string, string> = {};
      FIELDS.forEach(({ key }) => { initial[key] = config[key] ?? ''; });
      setForm(initial);
      setInitialized(true);
    }
  }, [config, initialized]);

  async function browseVaultRoot() {
    setBrowsing(true);
    setBrowseError('');
    try {
      const res = await fetch('/config/pick-folder', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setForm(prev => ({ ...prev, vault_path: data.path }));
      } else if (data.error !== 'cancelled') {
        setBrowseError(data.error ?? 'Failed to open picker');
      }
    } catch {
      setBrowseError('Could not reach server');
    } finally {
      setBrowsing(false);
    }
  }

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

  return (
    <form className="settings-section" onSubmit={handleSubmit}>
      {FIELDS.map(({ key, label, hint }) => (
        <div key={key} className="settings-field">
          <label className="settings-label">{label}</label>
          {key === 'vault_path' ? (
            <>
              <div className="settings-browse-row">
                <input
                  type="text"
                  value={form[key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={hint}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="settings-browse-btn"
                  onClick={browseVaultRoot}
                  disabled={browsing}
                  title="Open Finder to select folder"
                >
                  {browsing ? <span className="spinner" style={{ margin: 0 }} /> : <FolderIcon />}
                </button>
              </div>
              {browseError && <span className="settings-feedback err">{browseError}</span>}
            </>
          ) : (
            <input
              type="text"
              value={form[key] ?? ''}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={hint}
              spellCheck={false}
            />
          )}
        </div>
      ))}
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
