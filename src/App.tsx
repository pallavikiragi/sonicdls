import { useState, useEffect } from 'react';
import { Play, ChevronDown, ChevronRight, Activity, Volume2, Info, Moon, Sun, Layout, Monitor, Download } from 'lucide-react';
import { audioEngine, BrandTokens, COMPONENT_DEFS, SEMANTIC_DEFS as DEFAULT_SEMANTIC_DEFS, resolveNotes } from './lib/audio';
import { InfotainmentUI } from './components/InfotainmentUI';
import { CreateTokenPanel } from './components/CreateTokenPanel';
import { AssignModal } from './components/AssignModal';
import { EditSemanticModal } from './components/EditSemanticModal';

export default function App() {
  const [viewMode, setViewMode] = useState<'DLS' | 'INFOTAINMENT'>('DLS');
  const [isDark, setIsDark] = useState(true);

  const [brand, setBrand] = useState<BrandTokens>({
    scale: 'C4 major pentatonic',
    timbre: 'sine',
    decayUnit: 0.160,
    warmth: 0.9,
    volumeBase: -18,
    reverbAmount: 0.08,
    attack: 0.008
  });

  const [semanticDefs, setSemanticDefs] = useState(DEFAULT_SEMANTIC_DEFS);

  const [customTokens, setCustomTokens] = useState<Record<string, any>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [editTokenKey, setEditTokenKey] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [showEditSemantic, setShowEditSemantic] = useState(false);
  const [assignInput, setAssignInput] = useState('');
  const [playedTokens, setPlayedTokens] = useState<Set<string>>(new Set());

  const [activeToken, setActiveToken] = useState<{
    component: string;
    semantic: string;
    resolved: { degrees: number[]; notes: string[]; freqs: number[]; dur: number; vol: number };
  } | null>(null);

  const [expanded, setExpanded] = useState({ primitive: true, semantic: true, component: true });

  useEffect(() => {
    audioEngine.updateBrand(brand);
  }, [brand]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    
    // Link sonic theme to visual theme
    setBrand(b => {
      const newB = { ...b };
      if (nextDark) {
        // Darker Tone
        newB.scale = 'A3 minor pentatonic'; 
        newB.warmth = 0.9;
        newB.decayUnit = 0.180;
      } else {
        // Warmer / Brighter Tone
        newB.scale = 'C4 major pentatonic'; 
        newB.warmth = 0.95;
        newB.decayUnit = 0.200;
      }
      return newB;
    });
  };

  const playComponent = async (compId: string) => {
    setPlayedTokens(prev => new Set(prev).add(compId));
    await audioEngine.init();
    
    const allDefs = { ...COMPONENT_DEFS, ...customTokens };
    const def = allDefs[compId];
    if (!def) return;

    audioEngine.play(compId, def.semantic as keyof typeof DEFAULT_SEMANTIC_DEFS, brand, def.overrides || {});

    const semDef = semanticDefs[def.semantic as keyof typeof DEFAULT_SEMANTIC_DEFS];
    const degrees = def.overrides?.arpeggio || semDef.degrees;
    const resolvedNotes = resolveNotes(brand.scale, degrees);
    
    let dur = brand.decayUnit * semDef.durMult;
    if (def.overrides?.durMult) dur *= def.overrides.durMult;
    if (compId === 'nav.arrived') dur = Math.min(dur, 0.8);
    else dur = Math.min(dur, 0.5);

    let vol = semDef.volOffset;
    if (def.overrides?.volOffset !== undefined) vol += def.overrides.volOffset;
    if (def.overrides?.volOverride !== undefined) vol = def.overrides.volOverride - brand.volumeBase;

    setActiveToken({
      component: compId,
      semantic: def.semantic,
      resolved: {
        degrees: resolvedNotes.map(n => n.degree),
        notes: resolvedNotes.map(n => n.note),
        freqs: resolvedNotes.map(n => n.freq),
        dur,
        vol
      }
    });
  };

  const handleExportJSON = () => {
    const semanticExport: Record<string, any> = {};
    Object.entries(semanticDefs).forEach(([k, v]: [string, any]) => {
      semanticExport[k] = {
        degrees: v.degrees,
        duration: brand.decayUnit * v.durMult * 1000,
        volume: brand.volumeBase + v.volOffset
      };
    });

    const componentExport: Record<string, any> = {};
    const allDefs = { ...COMPONENT_DEFS, ...customTokens };
    Object.entries(allDefs).forEach(([k, v]: [string, any]) => {
      const semDef = semanticDefs[v.semantic as keyof typeof DEFAULT_SEMANTIC_DEFS];
      
      let dur = brand.decayUnit * semDef.durMult;
      if (v.overrides?.durMult) dur *= v.overrides.durMult;
      if (k === 'nav.arrived') dur = Math.min(dur, 0.8);
      else dur = Math.min(dur, 0.5);

      let vol = brand.volumeBase + semDef.volOffset;
      if (v.overrides?.volOffset !== undefined) vol += v.overrides.volOffset;
      if (v.overrides?.volOverride !== undefined) vol = v.overrides.volOverride;

      const degrees = v.overrides?.arpeggio || semDef.degrees;
      const resolvedNotes = resolveNotes(brand.scale, degrees);

      componentExport[k] = {
        semantic: v.semantic,
        resolvedDegrees: resolvedNotes.map(n => n.degree),
        resolvedNotes: resolvedNotes.map(n => n.note),
        resolvedFreqs: resolvedNotes.map(n => n.freq),
        resolvedDuration: dur * 1000,
        resolvedVolume: vol,
        custom: !!customTokens[k]
      };
    });

    const exportData = {
      meta: { version: "1.0", mode: isDark ? 'dark' : 'light' },
      primitive: { ...brand, decayUnitMs: brand.decayUnit * 1000, attackMs: brand.attack * 1000 },
      semantic: semanticExport,
      component: componentExport,
      assignments
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonic-dls-${isDark ? 'dark' : 'light'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allDefsCombined = { ...COMPONENT_DEFS, ...customTokens };
  const categories = Array.from(new Set(Object.values(allDefsCombined).map((d: any) => d.category)));

  return (
    <div className="relative h-screen flex flex-col font-sans bg-app-bg text-app-text overflow-hidden">
      
      {/* BRAND EDITOR TOP BAR */}
      <div className="h-auto border-b border-app-border bg-app-surface px-6 py-4 shrink-0 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Activity className="text-app-accent" size={20} />
            <h1 className="text-sm font-semibold tracking-wide uppercase text-app-text">Sonic DLS</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-sm border border-app-border text-app-text hover:bg-app-surface-light transition-colors"
            >
              <Download size={14} /> Export JSON
            </button>
            {/* View Mode Toggle */}
            <div className="flex bg-app-surface-light rounded-sm p-1 border border-app-border">
              <button
                onClick={() => setViewMode('DLS')}
                className={`flex items-center gap-2 px-4 py-1 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                  viewMode === 'DLS' ? 'bg-app-accent text-white font-medium shadow-sm' : 'text-app-text-muted hover:text-app-text'
                }`}
              >
                <Monitor size={14} /> Explorer
              </button>
              <button
                onClick={() => setViewMode('INFOTAINMENT')}
                className={`flex items-center gap-2 px-4 py-1 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                  viewMode === 'INFOTAINMENT' ? 'bg-app-accent text-white font-medium shadow-sm' : 'text-app-text-muted hover:text-app-text'
                }`}
              >
                <Layout size={14} /> Prototype
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-sm border border-app-border text-app-text-muted hover:text-app-text hover:border-app-text transition-colors"
              title="Toggle Visual & Sonic Theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="flex justify-between w-full px-6 pb-4 border-t border-app-border pt-4">
          
          {/* Cluster 1: Scale */}
          <div className="flex gap-4 pr-6 relative">
            <div className="absolute -top-3 left-0 bg-app-surface px-2 text-[9px] uppercase tracking-widest text-app-text-muted font-bold">Scale</div>
            <div className="flex flex-col gap-2">
              <select 
                value={brand.scale.split(' ')[0].replace(/[0-9]/g, '')} 
                onChange={e => {
                  const parts = brand.scale.split(' ');
                  const octave = parts[0].replace(/[^0-9]/g, '');
                  const scaleType = parts.slice(1).join(' ');
                  setBrand(b => ({ ...b, scale: `${e.target.value}${octave} ${scaleType}` }));
                }} 
                className="bg-app-surface-light border border-app-border text-xs p-1.5 rounded accent-app-accent outline-none"
              >
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-[10px] text-app-text-muted text-center">ROOT</span>
            </div>

            <div className="flex flex-col gap-2">
              <select 
                value={brand.scale.split(' ')[0].replace(/[^0-9]/g, '')} 
                onChange={e => {
                  const parts = brand.scale.split(' ');
                  const note = parts[0].replace(/[0-9]/g, '');
                  const scaleType = parts.slice(1).join(' ');
                  setBrand(b => ({ ...b, scale: `${note}${e.target.value} ${scaleType}` }));
                }} 
                className="bg-app-surface-light border border-app-border text-xs p-1.5 rounded accent-app-accent outline-none"
              >
                {[2, 3, 4, 5, 6].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <span className="text-[10px] text-app-text-muted text-center">OCT</span>
            </div>

            <div className="flex flex-col gap-2">
              <select 
                value={brand.scale.split(' ').slice(1).join(' ')} 
                onChange={e => {
                  const parts = brand.scale.split(' ');
                  setBrand(b => ({ ...b, scale: `${parts[0]} ${e.target.value}` }));
                }} 
                className="bg-app-surface-light border border-app-border text-xs p-1.5 rounded accent-app-accent outline-none"
              >
                <option value="major pentatonic">Major Pentatonic</option>
                <option value="minor pentatonic">Minor Pentatonic</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="dorian">Dorian</option>
                <option value="lydian">Lydian</option>
              </select>
              <span className="text-[10px] text-app-text-muted text-center">TYPE</span>
            </div>
          </div>

          <div className="w-[1px] bg-app-border mx-2"></div>

          {/* Cluster 2: Timbre */}
          <div className="flex gap-4 px-6 relative">
            <div className="absolute -top-3 left-6 bg-app-surface px-2 text-[9px] uppercase tracking-widest text-app-text-muted font-bold">Timbre</div>
            <div className="flex flex-col gap-2">
              <select 
                value={brand.timbre} 
                onChange={e => setBrand(b => ({ ...b, timbre: e.target.value as any }))} 
                className="bg-app-surface-light border border-app-border text-xs p-1.5 rounded accent-app-accent outline-none capitalize"
              >
                <option value="sine">Sine</option>
                <option value="triangle">Triangle</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
              </select>
              <span className="text-[10px] text-app-text-muted text-center">WAVE</span>
            </div>

            <div className="flex flex-col gap-2 w-[100px]">
              <div className="flex justify-between items-center px-1">
                <input type="range" min="0" max="1" step="0.01" value={brand.warmth} onChange={e => setBrand(b => ({ ...b, warmth: parseFloat(e.target.value) }))} className="accent-app-accent w-full" />
              </div>
              <span className="text-[10px] text-app-text-muted text-center mt-1">WARMTH ({brand.warmth.toFixed(2)})</span>
            </div>
          </div>

          <div className="w-[1px] bg-app-border mx-2"></div>

          {/* Cluster 3: Envelope */}
          <div className="flex gap-4 pl-6 relative">
            <div className="absolute -top-3 left-6 bg-app-surface px-2 text-[9px] uppercase tracking-widest text-app-text-muted font-bold">Envelope</div>
            
            <div className="flex flex-col gap-2 w-[100px]">
              <div className="flex justify-between items-center px-1">
                <input type="range" min="0.05" max="0.3" step="0.01" value={brand.decayUnit} onChange={e => setBrand(b => ({ ...b, decayUnit: parseFloat(e.target.value) }))} className="accent-app-accent w-full" />
              </div>
              <span className="text-[10px] text-app-text-muted text-center mt-1">DECAY ({(brand.decayUnit * 1000).toFixed(0)}ms)</span>
            </div>

            <div className="flex flex-col gap-2 w-[100px]">
              <div className="flex justify-between items-center px-1">
                <input type="range" min="0" max="0.5" step="0.01" value={brand.reverbAmount} onChange={e => setBrand(b => ({ ...b, reverbAmount: parseFloat(e.target.value) }))} className="accent-app-accent w-full" />
              </div>
              <span className="text-[10px] text-app-text-muted text-center mt-1">REVERB ({brand.reverbAmount.toFixed(2)})</span>
            </div>

            <div className="flex flex-col gap-2 w-[100px]">
              <div className="flex justify-between items-center px-1">
                <input type="range" min="-30" max="0" step="1" value={brand.volumeBase} onChange={e => setBrand(b => ({ ...b, volumeBase: parseInt(e.target.value) }))} className="accent-app-accent w-full" />
              </div>
              <span className="text-[10px] text-app-text-muted text-center mt-1">VOL ({brand.volumeBase}dB)</span>
            </div>
          </div>

        </div>
      </div>

      {viewMode === 'INFOTAINMENT' ? (
        <InfotainmentUI 
          brand={brand} 
          playComponent={playComponent} 
          assignments={assignments} 
          allTokens={Object.keys(allDefsCombined)}
          onUpdateAssignment={(elementName, token) => {
            setAssignments(prev => ({ ...prev, [elementName]: token }));
          }}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">

        
        {/* LEFT COL: HIERARCHY EXPLORER */}
        <div className="w-[300px] border-r border-app-border bg-app-surface overflow-y-auto">
          <div className="p-4 border-b border-app-border">
            <h2 className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold">Token Hierarchy</h2>
          </div>

          <div className="p-2">
            {/* Primitive */}
            <div>
              <button 
                className="w-full flex items-center justify-between p-2 text-xs uppercase tracking-wider font-medium text-app-text hover:bg-app-surface-light rounded transition-colors"
                onClick={() => setExpanded(e => ({ ...e, primitive: !e.primitive }))}
              >
                <span>1. Primitive</span>
                {expanded.primitive ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expanded.primitive && (
                <div className="pl-4 pr-2 py-2 space-y-2">
                  {Object.entries(brand).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex justify-between text-[11px] font-mono text-app-text-muted border-l border-app-border pl-2">
                      <span>brand.{k}</span>
                      <span className="text-app-accent">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Semantic */}
            <div className="mt-2">
              <button 
                className="w-full flex items-center justify-between p-2 text-xs uppercase tracking-wider font-medium text-app-text hover:bg-app-surface-light rounded transition-colors"
                onClick={() => setExpanded(e => ({ ...e, semantic: !e.semantic }))}
              >
                <span>2. Semantic</span>
                {expanded.semantic ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expanded.semantic && (
                <div className="pl-4 pr-2 py-2 space-y-3">
                  {Object.entries(semanticDefs).map(([k, v]: [string, any]) => {
                    const degrees = v.degrees.join(', ');
                    const dur = Math.round(brand.decayUnit * v.durMult * 1000);
                    return (
                      <div key={k} className="border-l border-app-border pl-2">
                        <div className="text-[11px] font-mono text-app-text">semantic.{k}</div>
                        <div className="text-[10px] text-app-text-muted mt-1">
                          deg: [{degrees}] • {dur}ms • {v.volOffset > 0 ? '+' : ''}{v.volOffset}dB
                        </div>
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => setShowEditSemantic(true)}
                    className="mt-2 w-full p-1.5 border border-dashed border-app-border rounded text-[10px] text-app-text-muted hover:text-app-text hover:border-app-text transition-colors uppercase tracking-wider"
                  >
                    Edit Semantics
                  </button>
                </div>
              )}
            </div>

            {/* Component */}
            <div className="mt-2">
              <button 
                className="w-full flex items-center justify-between p-2 text-xs uppercase tracking-wider font-medium text-app-text hover:bg-app-surface-light rounded transition-colors"
                onClick={() => setExpanded(e => ({ ...e, component: !e.component }))}
              >
                <span>3. Component</span>
                {expanded.component ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expanded.component && (
                <div className="pl-4 pr-2 py-2 space-y-3">
                  {Object.entries({ ...COMPONENT_DEFS, ...customTokens }).map(([k, v]: [string, any]) => (
                    <div key={k} className={`border-l pl-2 ${customTokens[k] ? 'border-[#A78BFA]' : 'border-app-border'}`}>
                      <div className="text-[11px] font-mono text-app-text">{k}</div>
                      <div className="text-[10px] text-app-text-muted mt-0.5">→ semantic.{v.semantic}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignments */}
            {Object.keys(assignments).length > 0 && (
              <div className="mt-4 pt-4 border-t border-app-border">
                <div className="p-2 text-[10px] uppercase tracking-widest text-app-text-muted font-bold">Assignments</div>
                <div className="pl-2 pr-2 py-2 space-y-2">
                  {Object.entries(assignments).map(([element, token]: [string, any]) => (
                    <div key={element} className="text-[11px] flex justify-between gap-2 border-l border-app-border pl-2">
                      <span className="text-app-text truncate">{element}</span>
                      <span className="text-app-text-muted font-mono shrink-0">→ {token}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => setShowCreateToken(true)}
              className="mt-6 w-full p-2 border border-dashed border-app-border rounded text-xs text-app-text-muted hover:text-app-text hover:border-app-text transition-colors uppercase tracking-wider"
            >
              + Create component token
            </button>

          </div>
        </div>

        {/* MID COL: PLAYGROUND */}
        <div className="flex-1 overflow-y-auto bg-app-bg p-8">
          <div className="max-w-4xl mx-auto space-y-12">
            {categories.map(cat => (
              <div key={cat}>
                <h3 className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold mb-4 border-b border-app-border pb-2">{cat}</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(allDefsCombined).filter(([_, v]: [string, any]) => v.category === cat).map(([k, v]: [string, any]) => {
                    const isSafety = cat === 'Safety Alerts';
                    const isCustom = !!customTokens[k];
                    const isActive = activeToken?.component === k;
                    const hasPlayed = playedTokens.has(k);

                    const semDef = semanticDefs[v.semantic as keyof typeof DEFAULT_SEMANTIC_DEFS];
                    const resolvedNotes = resolveNotes(brand.scale, v.overrides?.arpeggio || semDef.degrees);
                    const freqStr = resolvedNotes[0] ? `${Math.round(resolvedNotes[0].freq)} Hz` : '';
                    let dur = brand.decayUnit * semDef.durMult;
                    if (v.overrides?.durMult) dur *= v.overrides.durMult;
                    const badgeText = `${freqStr} · ${Math.round(dur * 1000)}ms`;

                    return (
                      <div key={k} className="relative group">
                        <button
                          onClick={() => playComponent(k)}
                          className={`w-full relative flex flex-col p-4 text-left border rounded-[4px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${
                            isSafety ? 'border-l-2 border-l-[#F5A623]' : isCustom ? 'border-l-2 border-l-[#A78BFA]' : ''
                          } ${
                            isActive
                              ? isSafety ? 'bg-[#F59E0B1A] border-app-amber shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#3B82F61A] border-app-accent shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                              : 'bg-app-surface border-app-border hover:border-app-text-muted'
                          }`}
                        >
                          {hasPlayed && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#3DD68C]"></div>}
                          
                          <div className="flex justify-between items-start mb-3 w-full">
                            <span className={`text-xs font-mono font-medium pr-4 ${isSafety ? 'text-app-amber' : isActive ? 'text-app-accent' : 'text-app-text'}`}>
                              {k}
                            </span>
                            <Play size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isSafety ? 'text-app-amber' : 'text-app-accent'}`} />
                          </div>
                          
                          <span className="text-[10px] text-app-text-muted mt-auto line-clamp-1">{v.desc}</span>
                          
                          <div className="absolute bottom-2 right-2 text-[9px] font-mono text-app-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                            {badgeText}
                          </div>
                        </button>
                        
                        <div className="absolute -top-3 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditTokenKey(k); }}
                            className="bg-app-surface-light border border-app-border text-[9px] uppercase px-2 py-0.5 rounded text-app-text-muted hover:text-app-text hover:border-app-text"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowAssignModal(k); setAssignInput(''); }}
                            className="bg-app-surface-light border border-app-border text-[9px] uppercase px-2 py-0.5 rounded text-app-text-muted hover:text-app-accent hover:border-app-accent"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COL: INSPECTOR */}
        <div className="w-[300px] border-l border-app-border bg-app-surface flex flex-col">
          <div className="p-4 border-b border-app-border">
            <h2 className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold flex items-center gap-2">
              <Info size={12} /> Active Inspector
            </h2>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            {!activeToken ? (
              <div className="flex flex-col h-full text-app-text-muted opacity-50 space-y-4 pt-8">
                <div className="text-[10px] uppercase tracking-widest text-center mb-4">Resolution Chain</div>
                
                <div className="border border-dashed border-app-border rounded p-3 text-center bg-app-surface-light">
                  <div className="text-[11px] font-mono">COMPONENT</div>
                  <div className="text-[9px] mt-1 opacity-50">token name will appear here</div>
                </div>
                
                <div className="flex justify-center"><div className="w-px h-6 bg-app-border"></div></div>
                
                <div className="border border-dashed border-app-border rounded p-3 text-center bg-app-surface-light">
                  <div className="text-[11px] font-mono">SEMANTIC</div>
                  <div className="text-[9px] mt-1 opacity-50">meaning layer</div>
                </div>
                
                <div className="flex justify-center"><div className="w-px h-6 bg-app-border"></div></div>
                
                <div className="border border-dashed border-app-border rounded p-3 text-center bg-app-surface-light">
                  <div className="text-[11px] font-mono">PRIMITIVE</div>
                  <div className="text-[9px] mt-1 opacity-50">brand DNA</div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* Chain Visualization */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-widest text-app-text-muted mb-3">Resolution Chain</div>
                  
                  <div className="bg-app-surface-light border border-app-border rounded p-3">
                    <div className="text-[11px] font-mono text-app-accent break-words">{activeToken.component}</div>
                  </div>
                  
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-app-accent animate-pulse relative">
                      <div className="absolute -bottom-1 -left-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-app-accent"></div>
                    </div>
                  </div>

                  <div className="bg-app-surface-light border border-app-border rounded p-3">
                    <div className="text-[11px] font-mono text-app-text break-words">semantic.{activeToken.semantic}</div>
                  </div>

                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-app-accent animate-pulse relative">
                      <div className="absolute -bottom-1 -left-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-app-accent"></div>
                    </div>
                  </div>

                  <div className="bg-app-surface-light border border-app-border rounded p-3">
                    <div className="text-[11px] font-mono text-app-text-muted">brand.scale.degree {activeToken.resolved.degrees.join(', ')}</div>
                    <div className="text-[11px] font-mono text-app-text-muted mt-1">brand.decay.unit</div>
                    <div className="text-[11px] font-mono text-app-text-muted mt-1">brand.timbre</div>
                  </div>
                </div>

                {/* Final Parameters */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-app-text-muted mb-3">Final Synthesis</div>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-app-border pb-2">
                      <span className="text-[11px] text-app-text-muted">Notes</span>
                      <span className="text-[11px] font-mono text-app-text">
                        {activeToken.resolved.notes.map((n, i) => `${n} (${Math.round(activeToken.resolved.freqs[i])}Hz)`).join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-app-border pb-2">
                      <span className="text-[11px] text-app-text-muted">Duration</span>
                      <span className="text-[11px] font-mono text-app-text">
                        {Math.round(activeToken.resolved.dur * 1000)} ms
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-app-border pb-2">
                      <span className="text-[11px] text-app-text-muted">Vol. Offset</span>
                      <span className="text-[11px] font-mono text-app-text">
                        {activeToken.resolved.vol > 0 ? '+' : ''}{activeToken.resolved.vol.toFixed(1)} dB
                      </span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-[11px] text-app-text-muted">Timbre</span>
                      <span className="text-[11px] font-mono text-app-text uppercase">
                        {brand.timbre}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
      )}

      {showCreateToken && (
        <CreateTokenPanel 
          brand={brand}
          onClose={() => setShowCreateToken(false)}
          onAdd={(name, def) => {
            setCustomTokens(prev => ({ ...prev, [name]: def }));
            setShowCreateToken(false);
          }}
          onPreview={(def) => {
            audioEngine.play('preview', def.semantic, brand, def.overrides);
          }}
        />
      )}

      {editTokenKey && (
        <CreateTokenPanel 
          brand={brand}
          initialData={{ name: editTokenKey, def: allDefsCombined[editTokenKey as keyof typeof allDefsCombined] }}
          onClose={() => setEditTokenKey(null)}
          onAdd={(name, def, originalName) => {
            setCustomTokens(prev => {
              const next = { ...prev, [name]: def };
              if (originalName && originalName !== name) {
                delete next[originalName];
              }
              return next;
            });
            setEditTokenKey(null);
          }}
          onPreview={(def) => {
            audioEngine.play('preview', def.semantic, brand, def.overrides);
          }}
        />
      )}

      {showAssignModal && (
        <AssignModal 
          token={showAssignModal}
          onClose={() => setShowAssignModal(null)}
          onAssign={(elementName) => {
            setAssignments(prev => ({ ...prev, [elementName]: showAssignModal }));
            setShowAssignModal(null);
          }}
        />
      )}

      {showEditSemantic && (
        <EditSemanticModal 
          initialDefs={semanticDefs}
          onClose={() => setShowEditSemantic(false)}
          onSave={(defs) => {
            setSemanticDefs(defs);
            setShowEditSemantic(false);
          }}
        />
      )}
    </div>
  );
}
