import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TabName } from '@/types';

export const DEFAULT_TAB_ORDER: TabName[] = [
  'today', 'planning', 'inbox', 'habits', 'finance', 'workout', 'music', 'food',
];

interface LocalConfigContextValue {
  appTitle: string;
  setAppTitle: (v: string) => void;
  currencySymbol: string;
  setCurrencySymbol: (v: string) => void;
  tabOrder: TabName[];
  setTabOrder: (order: TabName[]) => void;
  hiddenTabs: TabName[];
  toggleHiddenTab: (id: TabName) => void;
}

const LocalConfigContext = createContext<LocalConfigContextValue | null>(null);

export function LocalConfigProvider({ children }: { children: ReactNode }) {
  const [appTitle, _setAppTitle] = useState(
    () => localStorage.getItem('appTitle') ?? 'MonoVault'
  );
  const [currencySymbol, _setCurrencySymbol] = useState(
    () => localStorage.getItem('currencySymbol') ?? ''
  );
  const [tabOrder, _setTabOrder] = useState<TabName[]>(() => {
    try {
      const saved = localStorage.getItem('tabOrder');
      if (saved) {
        const parsed = JSON.parse(saved) as TabName[];
        const missing = DEFAULT_TAB_ORDER.filter(t => !parsed.includes(t));
        return [...parsed, ...missing];
      }
    } catch { /* ignore */ }
    return DEFAULT_TAB_ORDER;
  });
  const [hiddenTabs, _setHiddenTabs] = useState<TabName[]>(() => {
    try {
      const saved = localStorage.getItem('hiddenTabs');
      if (saved) return JSON.parse(saved) as TabName[];
    } catch { /* ignore */ }
    return [];
  });

  const setAppTitle = useCallback((v: string) => {
    localStorage.setItem('appTitle', v);
    _setAppTitle(v);
  }, []);

  const setCurrencySymbol = useCallback((v: string) => {
    localStorage.setItem('currencySymbol', v);
    _setCurrencySymbol(v);
  }, []);

  const setTabOrder = useCallback((order: TabName[]) => {
    localStorage.setItem('tabOrder', JSON.stringify(order));
    _setTabOrder(order);
  }, []);

  const toggleHiddenTab = useCallback((id: TabName) => {
    _setHiddenTabs(prev => {
      const next = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id];
      localStorage.setItem('hiddenTabs', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <LocalConfigContext.Provider value={{
      appTitle, setAppTitle,
      currencySymbol, setCurrencySymbol,
      tabOrder, setTabOrder,
      hiddenTabs, toggleHiddenTab,
    }}>
      {children}
    </LocalConfigContext.Provider>
  );
}

export function useLocalConfig() {
  const ctx = useContext(LocalConfigContext);
  if (!ctx) throw new Error('useLocalConfig must be used within LocalConfigProvider');
  return ctx;
}
