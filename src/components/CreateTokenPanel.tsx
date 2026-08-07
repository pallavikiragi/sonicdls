import { useState } from 'react';
import { BrandTokens, SEMANTIC_DEFS, resolveNotes } from '../lib/audio';
import { Play } from 'lucide-react';

export function CreateTokenPanel({ 
  onClose, 
  onAdd, 
  brand,
  initialData,
  onPreview
}: { 
  onClose: () => void, 
  onAdd: (name: string, def: any, originalName?: string) => void,
  brand: BrandTokens,
  initialData?: { name: string, def: any },
  onPreview: (def: any) => void
}) {
  const [name, setName] = useState(initialData?.name || 'climate.fan.on');
  const [sectionName, setSectionName] = useState(initialData?.def?.category || 'Custom');
  const [semantic, setSemantic] = useState<keyof typeof SEMANTIC_DEFS>(initialData?.def?.semantic || 'success');
  const [durMult, setDurMult] = useState(initialData?.def?.overrides?.durMult || 1.0);
  const [volOffset, setVolOffset] = useState(initialData?.def?.overrides?.volOffset || 0);
  
  let initialPattern: 'Single' | 'Arpeggio' | 'Pulse' | 'Rise' | 'Custom' = 'Single';
  let initialCustomArp = '0, 1, 2';
  
  if (initialData?.def?.overrides?.arpeggio) {
    const arp = initialData.def.overrides.arpeggio;
    if (arp.length === 2 && arp[0] === 0 && arp[1] === 0) initialPattern = 'Pulse';
    else if (arp.length === 3 && arp[0] === 1 && arp[2] === 3) initialPattern = 'Rise';
    else if (arp.length === 3 && arp[0] === 1 && arp[1] === 3 && arp[2] === 5) initialPattern = 'Arpeggio';
    else {
      initialPattern = 'Custom';
      initialCustomArp = arp.join(', ');
    }
  }
  const [pattern, setPattern] = useState<'Single' | 'Arpeggio' | 'Pulse' | 'Rise' | 'Custom'>(initialPattern);
  const [customArpStr, setCustomArpStr] = useState(initialCustomArp);

  // Derive preview
  const semDef = SEMANTIC_DEFS[semantic];
  let degrees = semDef.degrees;
  let overrides: any = {};
  
  if (pattern === 'Arpeggio') {
    degrees = [1, 3, 5];
    overrides.arpeggio = degrees;
  } else if (pattern === 'Pulse') {
    degrees = [0, 0];
    overrides.arpeggio = degrees;
  } else if (pattern === 'Rise') {
    degrees = [1, 2, 3];
    overrides.arpeggio = degrees;
  } else if (pattern === 'Custom') {
    const customDegs = customArpStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (customDegs.length > 0) {
      degrees = customDegs;
      overrides.arpeggio = degrees;
    }
  }

  if (durMult !== 1.0) overrides.durMult = durMult;
  if (volOffset !== 0) overrides.volOffset = volOffset;

  const resolvedNotes = resolveNotes(brand.scale, degrees);
  const freqStr = resolvedNotes[0] ? `${Math.round(resolvedNotes[0].freq)} Hz` : '';
  const durMs = Math.round(brand.decayUnit * semDef.durMult * durMult * 1000);
  const totalVol = brand.volumeBase + semDef.volOffset + volOffset;

  const handleAdd = () => {
    onAdd(name, {
      semantic,
      category: sectionName || 'Custom',
      desc: initialData?.def?.desc || 'Custom user token',
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined
    }, initialData?.name);
  };

  return (
    <div className="absolute top-0 right-0 w-[300px] h-full bg-app-surface border-l border-app-border flex flex-col z-50 animate-in slide-in-from-right shadow-2xl">
      <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-surface-light">
        <h2 className="text-xs uppercase tracking-widest text-app-text font-bold">{initialData ? 'Edit Token' : 'Create Token'}</h2>
        <button onClick={onClose} className="text-app-text-muted hover:text-app-text">✕</button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-app-text-muted">Token Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full bg-app-bg border border-app-border p-2 text-xs font-mono rounded text-app-text outline-none focus:border-app-accent"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-app-text-muted">Semantic Base</label>
          <select 
            value={semantic} 
            onChange={e => setSemantic(e.target.value as any)} 
            className="w-full bg-app-bg border border-app-border p-2 text-xs rounded text-app-text outline-none focus:border-app-accent"
          >
            {Object.keys(SEMANTIC_DEFS).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-[10px] uppercase tracking-widest text-app-text-muted">Duration Mult</label>
            <span className="text-[10px] text-app-accent font-mono">{durMult.toFixed(1)}x</span>
          </div>
          <input 
            type="range" min="0.4" max="5.0" step="0.1" 
            value={durMult} 
            onChange={e => setDurMult(parseFloat(e.target.value))} 
            className="w-full accent-app-accent"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-[10px] uppercase tracking-widest text-app-text-muted">Volume Offset</label>
            <span className="text-[10px] text-app-accent font-mono">{volOffset > 0 ? '+' : ''}{volOffset}dB</span>
          </div>
          <input 
            type="range" min="-8" max="6" step="1" 
            value={volOffset} 
            onChange={e => setVolOffset(parseInt(e.target.value))} 
            className="w-full accent-app-accent"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-app-text-muted mb-1 block">Pattern</label>
          <div className="flex flex-wrap gap-2">
            {['Single', 'Arpeggio', 'Pulse', 'Rise', 'Custom'].map(p => (
              <button 
                key={p} 
                onClick={() => setPattern(p as any)}
                className={`px-3 py-1 rounded-full text-[10px] transition-colors border ${pattern === p ? 'bg-app-accent border-app-accent text-white' : 'border-app-border text-app-text-muted hover:text-app-text hover:border-app-text'}`}
              >
                {p}
              </button>
            ))}
          </div>
          {pattern === 'Custom' && (
            <input 
              type="text" 
              value={customArpStr} 
              onChange={e => setCustomArpStr(e.target.value)} 
              placeholder="e.g. 0, 2, 4"
              className="w-full bg-app-bg border border-app-border p-2 text-xs font-mono rounded text-app-text outline-none focus:border-app-accent mt-2"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-app-text-muted">Section Name</label>
          <input 
            type="text" 
            value={sectionName} 
            onChange={e => setSectionName(e.target.value)} 
            placeholder="e.g. Custom, Media"
            className="w-full bg-app-bg border border-app-border p-2 text-xs font-mono rounded text-app-text outline-none focus:border-app-accent"
          />
        </div>

        {/* Live Preview Specs */}
        <div className="bg-app-surface-light border border-app-border rounded p-4 mt-6">
          <div className="text-[10px] uppercase tracking-widest text-app-text-muted mb-3 border-b border-app-border pb-2">Live Preview</div>
          <div className="space-y-2 text-[11px] font-mono">
            <div className="flex justify-between"><span className="text-app-text-muted">frequency:</span> <span className="text-app-text">{freqStr}</span></div>
            <div className="flex justify-between"><span className="text-app-text-muted">duration:</span> <span className="text-app-text">{durMs}ms</span></div>
            <div className="flex justify-between"><span className="text-app-text-muted">volume:</span> <span className="text-app-text">{totalVol}dB</span></div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-app-border bg-app-surface-light flex gap-3">
        <button 
          onClick={() => {
            onPreview({
              semantic,
              category: sectionName || 'Custom',
              desc: initialData?.def?.desc || 'Custom user token',
              overrides: Object.keys(overrides).length > 0 ? overrides : undefined
            });
          }}
          className="bg-app-surface border border-app-border text-app-text-muted hover:text-app-accent hover:border-app-accent py-2 px-3 rounded transition-colors"
        >
          <Play size={14} />
        </button>
        <button 
          onClick={handleAdd}
          className="flex-1 bg-app-accent text-white py-2 rounded text-xs font-semibold hover:bg-opacity-90 transition-opacity"
        >
          {initialData ? 'Save Changes' : 'Add to System'}
        </button>
      </div>
    </div>
  );
}
