import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { InboxItem } from '@/types';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { buildTaskLine } from '@/utils/taskUtils';
import { playCompletionFeedback } from '@/utils/audioUtils';
import { TagInput } from '@/components/TagInput/TagInput';
import { VaultFileInput } from '@/components/VaultFileInput/VaultFileInput';

const RECUR_OPTIONS = ['', 'every 2 days', 'every week', 'every 2 weeks', 'every 3 weeks', 'every month'];

interface Props {
  item: InboxItem;
  allItems: InboxItem[];
  inboxRelPath: string;
  processingMode: boolean;
  processingTitle?: string;
  getNextId: (id: string) => string | null;
  onNavigate: (id: string) => void;
  onClose: () => void;
  onAction: (nextId: string | null) => void;
}

export function InboxModal({ item, allItems, inboxRelPath, processingMode, processingTitle, getNextId, onNavigate, onClose, onAction }: Props) {
  useBodyScrollLock(true);

  const [description, setDescription] = useState(item.description ?? '');
  const [due, setDue] = useState(item.due ?? '');
  const [scheduled, setScheduled] = useState(item.scheduled ?? '');
  const [start, setStart] = useState(item.start ?? '');
  const [time, setTime] = useState(item.time ?? '');
  const [recur, setRecur] = useState(item.recur ?? '');
  const [target, setTarget] = useState(() => {
    const isInbox = !item.rel_path || item.rel_path === inboxRelPath;
    return isInbox ? '' : (item.rel_path ?? '');
  });
  const [tags, setTags] = useState<string[]>([...item.tags]);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Re-sync when item changes (navigation)
  useEffect(() => {
    setDescription(item.description ?? '');
    setDue(item.due ?? '');
    setScheduled(item.scheduled ?? '');
    setStart(item.start ?? '');
    setTime(item.time ?? '');
    setRecur(item.recur ?? '');
    setTarget(() => {
      const isInbox = !item.rel_path || item.rel_path === inboxRelPath;
      return isInbox ? '' : (item.rel_path ?? '');
    });
    setTags([...item.tags]);
    setTimeout(() => {
      if (descRef.current) {
        descRef.current.style.height = 'auto';
        descRef.current.style.height = descRef.current.scrollHeight + 'px';
        descRef.current.focus();
      }
    }, 0);
  }, [item.id]);

  function buildLine() {
    return buildTaskLine({ description, tags, due, scheduled, start, time, recur });
  }

  async function onSave() {
    const res = await fetch('/inbox/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_line: item.raw_line, new_line: buildLine() }),
    });
    if (res.ok) { onAction(null); onClose(); }
    else { const d = await res.json(); alert(d.error ?? 'Failed.'); }
  }

  async function onDone() {
    const newLine = buildLine();
    const nextId = getNextId(item.id);
    const res = await fetch('/inbox/done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_line: item.raw_line, new_line: newLine, target_path: target }),
    });
    if (res.ok) { playCompletionFeedback(); onAction(nextId); if (!processingMode || !nextId) onClose(); }
    else { const d = await res.json(); alert(d.error ?? 'Failed.'); }
  }

  async function onMove() {
    const newLine = buildLine();
    const nextId = getNextId(item.id);
    const res = await fetch('/inbox/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_line: item.raw_line, new_line: newLine, target_path: target }),
    });
    if (res.ok) { playCompletionFeedback(); onAction(nextId); if (!processingMode || !nextId) onClose(); }
    else { const d = await res.json(); alert(d.error ?? 'Failed.'); }
  }

  async function onDelete() {
    if (!confirm('Delete this inbox item? This cannot be undone.')) return;
    const nextId = getNextId(item.id);
    const res = await fetch('/inbox/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_line: item.raw_line }),
    });
    if (res.ok) { onAction(nextId); if (!processingMode || !nextId) onClose(); }
    else { const d = await res.json(); alert(d.error ?? 'Failed.'); }
  }

  // Determine nav possibilities
  const currentIdx = allItems.findIndex(i => i.id === item.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < allItems.length - 1;

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (e.key === 'ArrowRight' && tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
      e.preventDefault();
      if (hasNext) onNavigate(allItems[currentIdx + 1].id);
      return;
    }
    if (e.key === 'ArrowLeft' && tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
      e.preventDefault();
      if (hasPrev) onNavigate(allItems[currentIdx - 1].id);
      return;
    }
    if (e.key === 'Enter') {
      const id = (e.target as HTMLElement).id;
      if (id === 'im-tag-input' || id === 'im-target') return;
      if (id === 'im-description' && e.shiftKey) return;
      if (id === 'im-description') return;
      e.preventDefault();
      onSave();
    }
  }

  return (
    <div className="inbox-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={onKeyDown}>
      <div className="inbox-modal-card" onClick={e => e.stopPropagation()}>
        <div className="inbox-modal-header">
          <span className="inbox-modal-title">{processingTitle ?? 'Edit Item'}</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="inbox-close-btn" onClick={() => hasPrev && onNavigate(allItems[currentIdx - 1].id)} disabled={!hasPrev} title="Previous">←</button>
            <button className="inbox-close-btn" onClick={() => hasNext && onNavigate(allItems[currentIdx + 1].id)} disabled={!hasNext} title="Next">→</button>
            <button className="inbox-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="inbox-field">
          <label className="inbox-label">Task</label>
          <textarea
            ref={descRef}
            id="im-description"
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
            { label: '📅 Due', value: due, set: setDue },
            { label: '⏳ Scheduled', value: scheduled, set: setScheduled },
            { label: '🛫 Start', value: start, set: setStart },
          ].map(({ label, value, set }) => (
            <div key={label} className="inbox-field">
              <label className="inbox-label">{label}</label>
              <input type="date" className="inbox-date-input" value={value} onChange={e => set(e.target.value)} />
            </div>
          ))}
        </div>

        <div className="inbox-fields-row">
          <div className="inbox-field">
            <label className="inbox-label">@ Time</label>
            <input id="im-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="inbox-field" style={{ flex: 2 }}>
            <label className="inbox-label">🔁 Recurrence</label>
            <select value={recur} onChange={e => setRecur(e.target.value)}>
              {RECUR_OPTIONS.map(o => <option key={o} value={o}>{o || 'None'}</option>)}
            </select>
          </div>
        </div>

        <div className="inbox-field">
          <label className="inbox-label">Tags</label>
          <TagInput tags={tags} onChange={setTags} inputId="im-tag-input" />
        </div>

        <div className="inbox-field" style={{ position: 'relative' }}>
          <label className="inbox-label">
            Move to page <span className="inbox-label-hint">(leave empty → Imploding Tasks)</span>
          </label>
          <VaultFileInput id="im-target" value={target} onChange={setTarget} placeholder="Start typing a page name…" />
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
            <button className="inbox-btn-secondary" onClick={onDone} title="Complete and move">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button className="inbox-btn-primary" onClick={onMove} title="Move as active task">
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
