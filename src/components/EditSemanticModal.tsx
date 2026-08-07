import { useState } from 'react';
import { SEMANTIC_DEFS } from '../lib/audio';

export function EditSemanticModal({ 
  initialDefs,
  onClose, 
  onSave 
}: { 
  initialDefs: typeof SEMANTIC_DEFS,
  onClose: () => void, 
  onSave: (defs: typeof SEMANTIC_DEFS) => void
}) {
  const [defs, setDefs] = useState(initialDefs);

  const handleUpdate = (key: keyof typeof SEMANTIC_DEFS, field: string, value: any) => {
    setDefs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(defs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in">
      <div className="bg-app-surface border border-app-border rounded-lg shadow-2xl p-6 w-[600px] animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-app-text">Edit Semantic Tokens</h3>
            <p className="text-xs text-app-text-muted mt-1">Modify the base meanings that components inherit from.</p>
          </div>
          <button onClick={onClose} className="text-app-text-muted hover:text-app-text">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {Object.entries(defs).map(([k, v]: [string, any]) => (
            <div key={k} className="bg-app-surface-light border border-app-border rounded p-4">
              <h4 className="text-xs font-mono text-app-text mb-4 uppercase tracking-widest">{k}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-app-text-muted uppercase tracking-widest block">Degrees (Scale Steps)</label>
                  <input 
                    type="text" 
                    value={v.degrees.join(', ')} 
                    onChange={e => {
                      const degs = e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                      handleUpdate(k as any, 'degrees', degs.length ? degs : [0]);
                    }}
                    className="w-full bg-app-bg border border-app-border p-2 text-xs font-mono rounded text-app-text outline-none focus:border-app-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-app-text-muted uppercase tracking-widest block">Dur Mult (xBase)</label>
                  <input 
                    type="number" step="0.1"
                    value={v.durMult} 
                    onChange={e => handleUpdate(k as any, 'durMult', parseFloat(e.target.value))}
                    className="w-full bg-app-bg border border-app-border p-2 text-xs font-mono rounded text-app-text outline-none focus:border-app-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-app-text-muted uppercase tracking-widest block">Vol Offset (dB)</label>
                  <input 
                    type="number" step="1"
                    value={v.volOffset} 
                    onChange={e => handleUpdate(k as any, 'volOffset', parseInt(e.target.value))}
                    className="w-full bg-app-bg border border-app-border p-2 text-xs font-mono rounded text-app-text outline-none focus:border-app-accent"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-app-border flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-app-text-muted hover:text-app-text"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-app-accent text-white rounded text-xs font-semibold hover:bg-opacity-90"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
