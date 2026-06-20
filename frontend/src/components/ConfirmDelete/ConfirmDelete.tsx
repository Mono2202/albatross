import { useState } from 'react';

interface Props {
  onConfirm: () => void;
  className?: string;
}

export function ConfirmDelete({ onConfirm, className }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="confirm-delete-row">
        <button
          className="confirm-delete-cancel"
          onClick={e => { e.stopPropagation(); setConfirming(false); }}
        >✕</button>
        <button
          className="confirm-delete-ok"
          onClick={e => { e.stopPropagation(); onConfirm(); setConfirming(false); }}
        >Delete</button>
      </div>
    );
  }

  return (
    <button
      className={className}
      onClick={e => { e.stopPropagation(); setConfirming(true); }}
      title="Remove"
    >×</button>
  );
}
