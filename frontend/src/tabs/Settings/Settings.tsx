import { useState } from 'react';
import { AppearanceSection } from './AppearanceSection';
import { TabsSection }       from './TabsSection';
import { VaultPathsSection } from './VaultPathsSection';
import { NotificationsSection } from './NotificationsSection';
import { IntegrationsSection }  from './IntegrationsSection';

type Section = 'appearance' | 'tabs' | 'vault-paths' | 'notifications' | 'integrations';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'appearance',    label: 'Appearance' },
  { id: 'tabs',          label: 'Tabs' },
  { id: 'vault-paths',   label: 'Vault Paths' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations',  label: 'Integrations' },
];

export function Settings() {
  const [active, setActive] = useState<Section>('appearance');

  return (
    <div className="settings-layout">
      <nav className="settings-sidebar">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`settings-nav-item${active === s.id ? ' active' : ''}`}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="settings-content">
        {active === 'appearance'    && <AppearanceSection />}
        {active === 'tabs'          && <TabsSection />}
        {active === 'vault-paths'   && <VaultPathsSection />}
        {active === 'notifications' && <NotificationsSection />}
        {active === 'integrations'  && <IntegrationsSection />}
      </div>
    </div>
  );
}
