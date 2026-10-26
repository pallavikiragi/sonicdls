import { useState, useEffect, useRef } from 'react';

export function AssignModal({
  token,
  onClose,
  onAssign
}: {
  token: string,
  onClose: () => void,
  onAssign: (elementName: string) => void
}) {
  const [elementName, setElementName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAssign = () => {
    if (elementName.trim()) {
      onAssign(elementName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in">
      <div className="bg-app-surface border border-app-border rounded-lg shadow-2xl p-6 w-[400px] animate-in zoom-in-95">
        <h3 className="text-sm font-semibold text-app-text mb-4">Assign to Element</h3>
        <p className="text-xs text-app-text-muted mb-4">
          Assign <span className="font-mono text-app-accent">{token}</span> to a design element.
        </p>

        <input
          ref={inputRef}
          type="text"
          placeholder="e.g. Confirm Button"
          value={elementName}
          onChange={e => setElementName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAssign();
            if (e.key === 'Escape') onClose();
          }}
          className="w-full bg-app-bg border border-app-border p-3 text-sm rounded text-app-text outline-none focus:border-app-accent mb-6"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-app-text-muted hover:text-app-text"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!elementName.trim()}
            className="px-4 py-2 bg-app-accent text-white rounded-md text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
