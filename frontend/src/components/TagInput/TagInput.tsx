import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useVaultTags } from '@/hooks/useVaultTags';
import { tagBadgeClass } from '@/utils/taskUtils';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  inputId?: string;
}

export function TagInput({ tags, onChange, inputId }: Props) {
  const { data: allTags = [] } = useVaultTags();
  const [inputVal, setInputVal] = useState('');
  const [matches, setMatches] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  function filterTags(val: string) {
    const q = val.replace(/^#+/, '').toLowerCase();
    if (!q) { setDropdownOpen(false); return; }
    const m = allTags.filter(t => t.slice(1).toLowerCase().includes(q)).slice(0, 10);
    setMatches(m);
    setActiveIdx(-1);
    setDropdownOpen(m.length > 0);
  }

  function addTag(tag: string) {
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setInputVal('');
    setDropdownOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }

  function removeTag(i: number) {
    onChange(tags.filter((_, idx) => idx !== i));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (dropdownOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, matches.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); addTag(matches[activeIdx]); return; }
      if (e.key === 'Escape') { e.stopPropagation(); setDropdownOpen(false); return; }
    }
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inputVal.trim().replace(/^#+/, '');
      if (val) addTag('#' + val);
    }
  }

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!inputRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 160) });
  }, [dropdownOpen, inputVal]);

  return (
    <>
      <div className="inbox-tags-container">
        {tags.map((tag, i) => (
          <span key={i} className={`badge ${tagBadgeClass(tag)} inbox-tag-chip`}>
            {tag}
            <button className="inbox-tag-remove" type="button" onClick={() => removeTag(i)}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="inbox-tag-input"
          placeholder="Add tag and press Enter…"
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); filterTags(e.target.value); }}
          onKeyDown={onKeyDown}
        />
      </div>
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="vault-files-dropdown"
          style={{ ...dropdownStyle, position: 'fixed', zIndex: 2001 }}
          onTouchStart={e => e.stopPropagation()}
        >
          {matches.map((t, i) => (
            <div
              key={t}
              className={`vault-file-option${i === activeIdx ? ' active' : ''}`}
              onMouseDown={() => addTag(t)}
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
