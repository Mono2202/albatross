import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useVaultFiles } from '@/hooks/useVaultFiles';

interface Props {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function VaultFileInput({ id, value, onChange, placeholder }: Props) {
  const { data: files = [] } = useVaultFiles();
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function filter(val: string) {
    if (!val.trim()) { setOpen(false); return; }
    const q = val.toLowerCase();
    const m = files.filter(f => f.toLowerCase().includes(q)).slice(0, 12);
    setMatches(m);
    setActiveIdx(-1);
    setOpen(true);
  }

  function select(path: string) {
    onChange(path);
    setOpen(false);
    setActiveIdx(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(matches[activeIdx]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  // Position dropdown below input
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [open, value]);

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); filter(e.target.value); }}
        onFocus={e => filter(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div
          ref={dropdownRef}
          className="vault-files-dropdown"
          style={{ ...dropdownStyle, position: 'fixed' }}
          onTouchStart={e => e.stopPropagation()}
        >
          {matches.length > 0
            ? matches.map((f, i) => (
                <div
                  key={f}
                  className={`vault-file-option${i === activeIdx ? ' active' : ''}`}
                  onMouseDown={() => select(f)}
                >
                  {f}
                </div>
              ))
            : (
              <div
                className="vault-file-option vault-file-create"
                onMouseDown={() => select(value.trim())}
              >
                ✨ Create: {value}
              </div>
            )
          }
        </div>
      )}
    </>
  );
}
