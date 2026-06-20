import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Habit } from '@/types';
import { playCompletionFeedback, playUndoFeedback } from '@/utils/audioUtils';
import { todayIso } from '@/utils/dateUtils';

// ── Heatmap helpers ───────────────────────────────────────────────────────────

function heatmapWeeks(): string[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setMonth(start.getMonth() - 6);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const weeks: string[][] = [];
  const cur = new Date(start);
  while (cur <= today) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().slice(0, 10);
      if (cur <= today) week.push(iso);
      cur.setDate(cur.getDate() + 1);
    }
    if (week.length) weeks.push(week);
  }
  return weeks;
}

function HeatmapSvg({ weeks, cellColor }: {
  weeks: string[][];
  cellColor: (iso: string) => { fill: string; opacity: string; title: string };
}) {
  const cs = 11, gap = 2, step = cs + gap;
  const padT = 16;
  const W = weeks.length * step, H = padT + 7 * step;
  const parts: React.ReactNode[] = [];

  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const d = new Date(week[0] + 'T12:00:00');
    const m = d.getMonth();
    if (m !== lastMonth) {
      parts.push(
        <text key={`m${wi}`} x={wi * step} y={11} fontSize={9} fill="var(--text-muted)" fontFamily="inherit">
          {d.toLocaleDateString(undefined, { month: 'short' })}
        </text>
      );
      lastMonth = m;
    }
  });

  weeks.forEach((week, wi) => {
    week.forEach((iso, di) => {
      const { fill, opacity, title } = cellColor(iso);
      parts.push(
        <rect key={iso} x={wi * step} y={padT + di * step} width={cs} height={cs} rx={2} fill={fill} opacity={opacity}>
          <title>{title}</title>
        </rect>
      );
    });
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      {parts}
    </svg>
  );
}

// ── Overall heatmap ───────────────────────────────────────────────────────────

function OverallHeatmap({ habits }: { habits: Habit[] }) {
  const total = habits.length;
  if (!total) return <div className="empty-state">No habits.</div>;

  const counts: Record<string, number> = {};
  habits.forEach(h => (h.entries ?? []).forEach(d => { counts[d] = (counts[d] ?? 0) + 1; }));

  const weeks = heatmapWeeks();
  return (
    <div className="habit-heatmap-scroll">
      <HeatmapSvg weeks={weeks} cellColor={iso => {
        const count = counts[iso] ?? 0;
        const ratio = count / total;
        return {
          fill: count === 0 ? 'var(--border)' : '#22c55e',
          opacity: count === 0 ? '0.3' : (0.2 + ratio * 0.8).toFixed(2),
          title: `${iso}: ${count}/${total}`,
        };
      }} />
    </div>
  );
}

// ── Per-habit heatmap ─────────────────────────────────────────────────────────

function HabitHeatmap({ entries }: { entries: string[] }) {
  const done = new Set(entries);
  const todayStr = todayIso();
  const weeks = heatmapWeeks();

  return (
    <div className="habit-heatmap-wrap">
      <div className="habit-heatmap-scroll">
        <HeatmapSvg weeks={weeks} cellColor={iso => ({
          fill: done.has(iso) ? '#22c55e' : 'var(--border)',
          opacity: done.has(iso) ? '0.9' : (iso > todayStr ? '0.15' : '0.35'),
          title: iso,
        })} />
      </div>
    </div>
  );
}

// ── Habit row ─────────────────────────────────────────────────────────────────

function HabitRow({ habit, onUpdate }: { habit: Habit; onUpdate: (name: string, doneToday: boolean, streak: number, entries: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [localDone, setLocalDone] = useState(habit.done_today);
  const [localStreak, setLocalStreak] = useState(habit.streak);
  const [localEntries, setLocalEntries] = useState<string[]>(habit.entries ?? []);
  const [loading, setLoading] = useState(false);

  async function toggle(checked: boolean) {
    setLoading(true);
    const url = checked
      ? `/complete-habit/${encodeURIComponent(habit.name)}`
      : `/uncomplete-habit/${encodeURIComponent(habit.name)}`;
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) {
      if (checked) playCompletionFeedback(); else playUndoFeedback();
      const d = await res.json();
      const today = todayIso();
      const newEntries = checked
        ? [...localEntries.filter(e => e !== today), today]
        : localEntries.filter(e => e !== today);
      setLocalDone(checked);
      setLocalStreak(d.streak ?? 0);
      setLocalEntries(newEntries);
      onUpdate(habit.name, checked, d.streak ?? 0, newEntries);
    } else {
      const d = await res.json();
      alert(d.error ?? 'Failed.');
    }
    setLoading(false);
  }

  return (
    <div className="habit-wrap">
      <div className={`habit-item${localDone ? ' done' : ''}${loading ? ' completing' : ''}`}>
        <input type="checkbox" className="task-checkbox" checked={localDone} onChange={e => toggle(e.target.checked)} />
        <div className="habit-body" onClick={() => setOpen(p => !p)}>
          <span className={`habit-name${localDone ? ' done' : ''}`}>{habit.title}</span>
          {habit.description && <span className="habit-desc">{habit.description}</span>}
        </div>
        {localStreak > 0 && <span className="habit-streak">{localStreak} 🔥</span>}
      </div>
      {open && <HabitHeatmap entries={localEntries} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Habits() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<{ habits: Habit[] }>({
    queryKey: ['habits'],
    queryFn: () => fetch('/habits').then(r => r.json()),
    refetchOnWindowFocus: false,
  });

  const habits = data?.habits ?? [];

  function handleUpdate(name: string, doneToday: boolean, streak: number, entries: string[]) {
    qc.setQueryData<{ habits: Habit[] }>(['habits'], old => {
      if (!old) return old;
      return {
        habits: old.habits.map(h => h.name === name ? { ...h, done_today: doneToday, streak, entries } : h),
      };
    });
  }

  return (
    <div className="tab-panel active" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <h2>Overall</h2>
        {isLoading && <div className="empty-state"><span className="spinner" /> Loading…</div>}
        {isError   && <div className="empty-state" style={{ color: 'var(--danger)' }}>Failed to load.</div>}
        {!isLoading && !isError && <OverallHeatmap habits={habits} />}
      </div>
      <div className="card">
        <div className="tasks-header"><h2>Habits</h2></div>
        {isLoading && <div className="empty-state"><span className="spinner" /> Loading…</div>}
        {isError   && <div className="empty-state" style={{ color: 'var(--danger)' }}>Failed to load habits.</div>}
        {!isLoading && !isError && (
          habits.length === 0
            ? <div className="empty-state">No habits found.</div>
            : habits.map(h => <HabitRow key={h.name} habit={h} onUpdate={handleUpdate} />)
        )}
      </div>
    </div>
  );
}
