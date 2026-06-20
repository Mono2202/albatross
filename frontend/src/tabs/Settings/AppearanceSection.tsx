import { useState } from 'react';
import { useTheme, Theme } from '@/context/ThemeContext';
import { useLocalConfig } from '@/context/LocalConfigContext';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'catppuccin', label: 'Catppuccin' },
  { id: 'dark',       label: 'Dark' },
  { id: 'light',      label: 'Light' },
];

export function AppearanceSection() {
  const { theme, setTheme, logoGlow, toggleLogoGlow } = useTheme();
  const { appTitle, setAppTitle, currencySymbol, setCurrencySymbol } = useLocalConfig();

  const [titleInput, setTitleInput] = useState(appTitle);
  const [currencyInput, setCurrencyInput] = useState(currencySymbol);
  const [titleFeedback, setTitleFeedback] = useState('');
  const [currencyFeedback, setCurrencyFeedback] = useState('');

  function saveTitle() {
    setAppTitle(titleInput.trim() || 'MonoVault');
    setTitleInput(titleInput.trim() || 'MonoVault');
    setTitleFeedback('Saved');
    setTimeout(() => setTitleFeedback(''), 2000);
  }

  function saveCurrency() {
    setCurrencySymbol(currencyInput);
    setCurrencyFeedback('Saved');
    setTimeout(() => setCurrencyFeedback(''), 2000);
  }

  return (
    <div className="settings-section">
      <div className="settings-field">
        <span className="settings-label">Theme</span>
        <div className="settings-theme-row">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`settings-theme-btn${theme === t.id ? ' active' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <span className="settings-label">Logo glow</span>
        <div className="settings-toggle-row">
          <label className="settings-switch">
            <input type="checkbox" checked={logoGlow} onChange={toggleLogoGlow} />
            <span className="settings-switch-track" />
          </label>
          <span className="settings-toggle-label">{logoGlow ? 'On' : 'Off'}</span>
        </div>
      </div>

      <div className="settings-field">
        <span className="settings-label">App title</span>
        <div className="form-row" style={{ alignItems: 'center' }}>
          <input
            type="text"
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            placeholder="MonoVault"
            onKeyDown={e => e.key === 'Enter' && saveTitle()}
          />
          <button type="submit" onClick={saveTitle}>Save</button>
        </div>
        {titleFeedback && <span className="settings-feedback ok">{titleFeedback}</span>}
      </div>

      <div className="settings-field">
        <span className="settings-label">Currency symbol</span>
        <div className="form-row" style={{ alignItems: 'center' }}>
          <input
            type="text"
            value={currencyInput}
            onChange={e => setCurrencyInput(e.target.value)}
            placeholder="$"
            style={{ maxWidth: 80 }}
            onKeyDown={e => e.key === 'Enter' && saveCurrency()}
          />
          <button type="submit" onClick={saveCurrency}>Save</button>
        </div>
        {currencyFeedback && <span className="settings-feedback ok">{currencyFeedback}</span>}
      </div>
    </div>
  );
}
