import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Task, TaskSource } from '@/types';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { cleanTaskText, extractTags, buildTaskLine } from '@/utils/taskUtils';
import { obsidianFileHref } from '@/utils/textUtils';
import { playCompletionFeedback } from '@/utils/audioUtils';
import { TagInput } from '@/components/TagInput/TagInput';
import { VaultFileInput } from '@/components/VaultFileInput/VaultFileInput';

const RECUR_OPTIONS = ['', 'every 2 days', 'every week', 'every 2 weeks', 'every 3 weeks', 'every month'];

interface Props {
  task: Task;
  source: TaskSource;
  onClose: () => void;
}

export function TaskEditModal({ task, source, onClose }: Props) {
  useBodyScrollLock(true);
  const qc = useQueryClient();

  const [description, setDescription] = useState(cleanTaskText(task.task));
  const [due, setDue] = useState(task.due ?? '');
  const [scheduled, setScheduled] = useState(task.scheduled ?? '');
  const [start, setStart] = useState(task.start ?? '');
  const [time, setTime] = useState(task.time ?? '');
  const [recur, setRecur] = useState(task.recur ?? '');
  const [target, setTarget] = useState(task.rel_path ?? '');
  const [tags, setTags] = useState<string[]>(() => extractTags(task.task));
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = descRef.current.scrollHeight + 'px';
      descRef.current.focus();
    }
  }, []);

  function buildLine() {
    return buildTaskLine({ description, tags, due, scheduled, start, time, recur });
  }

  function refreshSource() {
    if (source === 'today')    qc.invalidateQueries({ queryKey: ['today-tasks'] });
    if (source === 'next')     qc.invalidateQueries({ queryKey: ['next-tasks'] });
    if (source === 'upcoming') qc.invalidateQueries({ queryKey: ['upcoming-tasks'] });
    onClose();
  }

  async function onSave() {
    const res = await fetch('/task/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rel_path: task.rel_path, raw_line: task.raw_line, new_line: buildLine() }),
    });
    if (res.ok) refreshSource();
    else { const d = await res.json(); alert(d.error ?? 'Failed.'); }
  }

  async function onDone() {
    const res = await fetch('/task/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rel_path: task.rel_path, raw_line: task.raw_line }),
    });
    if (res.ok) { playCompletionFeedback(); refreshSource(); }
    else { const d = await res.json(); alert(d.error ?? 'Failed.'); }
  }

  async function onMove() {
    const res = await fetch('/task/move-to-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rel_path: task.rel_path, raw_line: task.raw_line, new_line: buildLine(), target_path: target }),
    });
    if (res.ok) { playCompletionFeedback(); refreshSource(); }
    else { const d = await res.json(); alert(d.error ?? 'Failed.'); }
  }

  async function onDelete() {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    const res = await fetch('/task/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rel_path: task.rel_path, raw_line: task.raw_line }),
    });
    if (res.ok) refreshSource();
    else { const d = await res.json(); alert(d.error ?? 'Failed.'); }
  }

  function onOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter') {
      const id = (e.target as HTMLElement).id;
      if (id === 'tep-tag-input' || id === 'tep-target') return;
      if (id === 'tep-description' && e.shiftKey) return;
      if (id === 'tep-description') return;
      e.preventDefault();
      onSave();
    }
  }

  return (
    <div className="inbox-modal-overlay" onClick={onOverlayClick} onKeyDown={onKeyDown}>
      <div className="inbox-modal-card" onClick={e => e.stopPropagation()}>
        <div className="inbox-modal-header">
          <span className="inbox-modal-title">Edit Task</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {task.rel_path && (
              <button
                className="refresh-btn inbox-obsidian-btn"
                title="Open in Obsidian"
                onClick={() => { window.location.href = obsidianFileHref(task.rel_path); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>
            )}
            <button className="inbox-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="inbox-field">
          <label className="inbox-label">Task</label>
          <textarea
            ref={descRef}
            id="tep-description"
            className="inbox-textarea"
            rows={2}
            placeholder="Task description…"
            dir="auto"
            value={description}
            onChange={e => {
              setDescription(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
        </div>

        <div className="inbox-fields-row">
          {[
            { id: 'tep-due', label: '📅 Due', value: due, set: setDue },
            { id: 'tep-scheduled', label: '⏳ Scheduled', value: scheduled, set: setScheduled },
            { id: 'tep-start', label: '🛫 Start', value: start, set: setStart },
          ].map(({ id, label, value, set }) => (
            <div key={id} className="inbox-field">
              <label className="inbox-label">{label}</label>
              <input id={id} type="date" className="inbox-date-input" value={value} onChange={e => set(e.target.value)} />
            </div>
          ))}
        </div>

        <div className="inbox-fields-row">
          <div className="inbox-field">
            <label className="inbox-label">@ Time</label>
            <input id="tep-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="inbox-field" style={{ flex: 2 }}>
            <label className="inbox-label">🔁 Recurrence</label>
            <select id="tep-recur" value={recur} onChange={e => setRecur(e.target.value)}>
              {RECUR_OPTIONS.map(o => <option key={o} value={o}>{o || 'None'}</option>)}
            </select>
          </div>
        </div>

        <div className="inbox-field">
          <label className="inbox-label">Tags</label>
          <TagInput tags={tags} onChange={setTags} inputId="tep-tag-input" />
        </div>

        <div className="inbox-field" style={{ position: 'relative' }}>
          <label className="inbox-label">
            Move to page <span className="inbox-label-hint">(leave empty → Imploding Tasks)</span>
          </label>
          <VaultFileInput id="tep-target" value={target} onChange={setTarget} placeholder="Start typing a page name…" />
        </div>

        <div className="inbox-modal-actions">
          <button className="inbox-btn-danger" onClick={onDelete} title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="inbox-btn-secondary" onClick={onSave} title="Save">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            </button>
            <button className="inbox-btn-secondary" onClick={onDone} title="Complete task">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button className="inbox-btn-primary" onClick={onMove} title="Move to page">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
