import { useState, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header/Header';
import { Task, TabName, TaskEditState, NextActionState, ItemSource, UnifiedItem } from '@/types';
import { TaskModal } from '@/components/TaskModal/TaskModal';
import { NextActionModal } from '@/components/NextActionModal/NextActionModal';
import { cleanTaskText } from '@/utils/taskUtils';
import { useLocalConfig } from '@/context/LocalConfigContext';

function taskToUnified(task: Task): UnifiedItem {
  return {
    id: task.raw_line,
    raw_line: task.raw_line,
    rel_path: task.rel_path,
    description: cleanTaskText(task.task),
    due: task.due,
    scheduled: task.scheduled,
    start: task.start,
    time: task.time,
    recur: task.recur,
    tags: task.tags ?? [],
  };
}

const Today    = lazy(() => import('./tabs/Today/Today').then(m => ({ default: m.Today })));
const Planning = lazy(() => import('./tabs/Planning/Planning').then(m => ({ default: m.Planning })));
const Inbox    = lazy(() => import('./tabs/Inbox/Inbox').then(m => ({ default: m.Inbox })));
const Habits   = lazy(() => import('./tabs/Habits/Habits').then(m => ({ default: m.Habits })));
const Music    = lazy(() => import('./tabs/Music/Music').then(m => ({ default: m.Music })));
const Workout  = lazy(() => import('./tabs/Workout/Workout').then(m => ({ default: m.Workout })));
const Food     = lazy(() => import('./tabs/Food/Food').then(m => ({ default: m.Food })));
const Finance  = lazy(() => import('./tabs/Finance/Finance').then(m => ({ default: m.Finance })));
const Settings = lazy(() => import('./tabs/Settings/Settings').then(m => ({ default: m.Settings })));

const ALL_TABS: { id: TabName; icon: string; alt: string }[] = [
  { id: 'today',    icon: '/assets/today.svg',    alt: 'Today' },
  { id: 'planning', icon: '/assets/planning.svg', alt: 'Planning' },
  { id: 'inbox',    icon: '/assets/inbox.svg',    alt: 'Inbox' },
  { id: 'habits',   icon: '/assets/habits.svg',   alt: 'Habits' },
  { id: 'finance',  icon: '/assets/finance.svg',  alt: 'Finance' },
  { id: 'workout',  icon: '/assets/workout.svg',  alt: 'Workout' },
  { id: 'music',    icon: '/assets/music.svg',    alt: 'Music' },
  { id: 'food',     icon: '/assets/food.svg',     alt: 'Food' },
];


type AnyTab = TabName | 'settings';

function TabFallback() {
  return <div className="empty-state"><span className="spinner" /> Loading…</div>;
}

export function App() {
  const { tabOrder, hiddenTabs } = useLocalConfig();

  const [activeTab, setActiveTab] = useState<AnyTab>(() => {
    return (localStorage.getItem('activeTab') as AnyTab) ?? 'today';
  });
  const qc = useQueryClient();

  const { data: todayData } = useQuery<{ tasks: Record<string, unknown> }>({
    queryKey: ['today-tasks'],
    queryFn: () => fetch('/today-tasks').then(r => r.json()),
    refetchOnWindowFocus: false,
  });
  const { data: inboxData } = useQuery<{ items: unknown[] }>({
    queryKey: ['inbox-items'],
    queryFn: () => fetch('/inbox-items').then(r => r.json()),
    refetchOnWindowFocus: false,
  });

  const todayBadge = Object.keys(todayData?.tasks ?? {}).length;
  const inboxBadge = inboxData?.items.length ?? 0;
  const [taskEdit,   setTaskEdit]   = useState<TaskEditState | null>(null);
  const [nextAction, setNextAction] = useState<NextActionState | null>(null);

  const [visited, setVisited] = useState<Set<AnyTab>>(() => new Set([activeTab]));

  function switchTab(tab: AnyTab) {
    setActiveTab(tab);
    setVisited(prev => new Set([...prev, tab]));
    localStorage.setItem('activeTab', tab);
    if (tab === 'today') qc.invalidateQueries({ queryKey: ['today-tasks'] });
    if (tab === 'inbox') qc.invalidateQueries({ queryKey: ['inbox-items'] });
  }

  function openTaskEdit(task: Task, source: ItemSource) {
    setTaskEdit({ item: taskToUnified(task), source });
  }

  // Ordered visible tabs (respects user ordering and visibility)
  const navTabs = tabOrder
    .filter(id => !hiddenTabs.includes(id))
    .map(id => ALL_TABS.find(t => t.id === id)!)
    .filter(Boolean);

  return (
    <>
      <Header
        onOpenSettings={() => switchTab('settings')}
        settingsActive={activeTab === 'settings'}
      />
      <div className="main">
        <div className="tabs">
          {navTabs.map(({ id, icon, alt }) => (
            <button
              key={id}
              className={`tab-btn${activeTab === id ? ' active' : ''}`}
              onClick={() => switchTab(id)}
              style={{ position: 'relative' }}
            >
              <img src={icon} alt={alt} />
              {id === 'today' && todayBadge > 0 && (
                <span className="inbox-tab-badge">{todayBadge}</span>
              )}
              {id === 'inbox' && inboxBadge > 0 && (
                <span className="inbox-tab-badge">{inboxBadge}</span>
              )}
            </button>
          ))}
        </div>

        <Suspense fallback={<TabFallback />}>
          <div style={{ display: activeTab === 'today' ? 'contents' : 'none' }}>
            <Today onEditTask={task => openTaskEdit(task, 'today')} />
          </div>
        </Suspense>

        {visited.has('planning') && (
          <Suspense fallback={<TabFallback />}>
            <div style={{ display: activeTab === 'planning' ? 'contents' : 'none' }}>
              <Planning
                onEditTask={(task, source) => openTaskEdit(task, source)}
                onNextAction={(relPath, file) => setNextAction({ relPath, file })}
              />
            </div>
          </Suspense>
        )}

        {visited.has('inbox') && (
          <Suspense fallback={<TabFallback />}>
            <div style={{ display: activeTab === 'inbox' ? 'contents' : 'none' }}>
              <Inbox />
            </div>
          </Suspense>
        )}

        {visited.has('habits') && (
          <Suspense fallback={<TabFallback />}>
            <div style={{ display: activeTab === 'habits' ? 'contents' : 'none' }}>
              <Habits />
            </div>
          </Suspense>
        )}

        {visited.has('finance') && (
          <Suspense fallback={<TabFallback />}>
            <div style={{ display: activeTab === 'finance' ? 'contents' : 'none' }}>
              <Finance />
            </div>
          </Suspense>
        )}

        {visited.has('workout') && (
          <Suspense fallback={<TabFallback />}>
            <div style={{ display: activeTab === 'workout' ? 'contents' : 'none' }}>
              <Workout />
            </div>
          </Suspense>
        )}

        {visited.has('music') && (
          <Suspense fallback={<TabFallback />}>
            <div style={{ display: activeTab === 'music' ? 'contents' : 'none' }}>
              <Music />
            </div>
          </Suspense>
        )}

        {visited.has('food') && (
          <Suspense fallback={<TabFallback />}>
            <div style={{ display: activeTab === 'food' ? 'contents' : 'none' }}>
              <Food />
            </div>
          </Suspense>
        )}

        {visited.has('settings') && (
          <Suspense fallback={<TabFallback />}>
            <div style={{ display: activeTab === 'settings' ? 'contents' : 'none' }}>
              <Settings />
            </div>
          </Suspense>
        )}
      </div>

      {taskEdit && (
        <TaskModal
          item={taskEdit.item}
          source={taskEdit.source}
          onClose={() => setTaskEdit(null)}
        />
      )}

      {nextAction && (
        <NextActionModal
          relPath={nextAction.relPath}
          file={nextAction.file}
          onClose={() => setNextAction(null)}
        />
      )}
    </>
  );
}
