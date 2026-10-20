import { lazy, Suspense, useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { 
  Play, ChevronDown, ChevronRight, Activity, Volume2, Info, Moon, Sun, 
  Layout, Monitor, Download, Sliders, Waves, Layers, Tag, Grid, Radio,
  ArrowDown, PlusCircle, Palette
} from 'lucide-react';
import { 
  audioEngine, 
  BrandTokens, 
  COMPONENT_DEFS, 
  SEMANTIC_DEFS as DEFAULT_SEMANTIC_DEFS, 
  resolveNotes,
  InteractionType,
  CategoryType,
  INTERACTION_GROUPS,
  CATEGORY_GROUPS
} from './lib/audio';
const InfotainmentUI = lazy(() =>
  import('./components/InfotainmentUI').then(module => ({ default: module.InfotainmentUI }))
);
const CreateTokenPanel = lazy(() =>
  import('./components/CreateTokenPanel').then(module => ({ default: module.CreateTokenPanel }))
);
const AssignModal = lazy(() =>
  import('./components/AssignModal').then(module => ({ default: module.AssignModal }))
);
const EditSemanticModal = lazy(() =>
  import('./components/EditSemanticModal').then(module => ({ default: module.EditSemanticModal }))
);
const WaveformSamplerPanel = lazy(() =>
  import('./components/WaveformSamplerPanel').then(module => ({ default: module.WaveformSamplerPanel }))
);
import { applyThemeColors, clearThemeColorOverrides, ThemePreviewModal, THEME_PRESETS } from './components/ThemeCustomizerPanel';

export default function App(): ReactElement {
  const [viewMode, setViewMode] = useState<'DLS' | 'CREATE' | 'INFOTAINMENT' | 'SETTINGS'>('DLS');
  const [downloadingWavToken, setDownloadingWavToken] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [showThemePreviewModal, setShowThemePreviewModal] = useState<boolean>(false);

  // Grouping mode for Tokens tab: By Interaction (new) vs By Category (classic DLS)
  const [groupBy, setGroupBy] = useState<'interaction' | 'category'>('interaction');

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
  const [playingComponents, setPlayingComponents] = useState<Set<string>>(new Set());

  const handleAddSemanticToken = (
    key: string,
    def: { degrees: number[]; durMult: number; volOffset: number; desc?: string }
  ) => {
    setSemanticDefs(prev => ({
      ...prev,
      [key]: def
    }));
  };

  const [activeToken, setActiveToken] = useState<{
    component: string;
    semantic: string;
    category?: string;
    interaction?: string;
    resolved: { degrees: number[]; notes: string[]; freqs: number[]; dur: number; vol: number };
  } | null>(null);

  const [expanded, setExpanded] = useState({ primitive: true, semantic: true, component: true });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExportingWav, setIsExportingWav] = useState(false);

  useEffect(() => {
    audioEngine.updateBrand(brand);
  }, [brand]);

  useEffect(() => {
    const unsubscribe = audioEngine.onPlaybackChange((compId, isPlaying) => {
      setPlayingComponents(prev => {
        const next = new Set(prev);
        if (isPlaying) {
          next.add(compId);
        } else {
          next.delete(compId);
        }
        return next;
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sonic_dls_custom_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id === 'tweakcn-imported') {
          clearThemeColorOverrides();
          return;
        }
        if (parsed.colors) {
          applyThemeColors(parsed.colors, { fontSans: parsed.fontSans, fontMono: parsed.fontMono });
          return;
        }
      }
    } catch {
      // ignore
    }
    // Default to the imported TweakCN theme (CSS variables from index.css)
    clearThemeColorOverrides();
  }, []);

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

    audioEngine.play(compId, def.semantic, brand, def.overrides || {}, undefined, semanticDefs as any);

    const semDef = (semanticDefs as any)[def.semantic] || DEFAULT_SEMANTIC_DEFS.neutral;
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
      category: def.category,
      interaction: def.interaction,
      resolved: {
        degrees: resolvedNotes.map(n => n.degree),
        notes: resolvedNotes.map(n => n.note),
        freqs: resolvedNotes.map(n => n.freq),
        dur,
        vol
      }
    });
  };

  const pauseComponent = (compId: string) => {
    audioEngine.pause(compId);
    setPlayingComponents(prev => {
      const next = new Set(prev);
      next.delete(compId);
      return next;
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
        category: v.category,
        interaction: v.interaction,
        interactions: v.interactions || (v.interaction ? [v.interaction] : []),
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
      primitive: { 
        ...brand, 
        timbre: typeof brand.timbre === 'object' && brand.timbre !== null && brand.timbre.type === 'custom'
          ? {
              type: 'custom',
              real: Array.from(brand.timbre.real),
              imag: Array.from(brand.timbre.imag)
            }
          : brand.timbre,
        decayUnitMs: brand.decayUnit * 1000, 
        attackMs: brand.attack * 1000 
      },
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
    setShowExportMenu(false);
  };

  const handleExportWav = async () => {
    setIsExportingWav(true);
    try {
      const { exportAllWavs } = await import('./lib/exportAudio');
      await exportAllWavs(brand);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingWav(false);
      setShowExportMenu(false);
    }
  };

  const handleDownloadTokenWav = async (tokenKey: string, tokenDef?: any) => {
    setDownloadingWavToken(tokenKey);
    try {
      const { downloadTokenWav } = await import('./lib/exportAudio');
      await downloadTokenWav(tokenKey, brand, tokenDef);
    } catch (err) {
      console.error('Failed to download token WAV:', err);
    } finally {
      setDownloadingWavToken(null);
    }
  };

  const allDefsCombined = { ...COMPONENT_DEFS, ...customTokens };

  const INTERACTION_ORDER: InteractionType[] = [
    'Input',
    'Navigation',
    'Confirmation',
    'Error',
    'Alert',
    'Ambient',
    'Voice'
  ];

  const CATEGORY_ORDER: CategoryType[] = [
    'UI Interactions',
    'Navigation',
    'Alerts',
    'Voice Assistant',
    'Media & Comms'
  ];

  const getTokensForGroup = (groupKey: string) => {
    if (groupBy === 'interaction') {
      return Object.entries(allDefsCombined).filter(([_, v]: [string, any]) => {
        if (v.interactions && Array.isArray(v.interactions)) {
          return v.interactions.includes(groupKey);
        }
        return v.interaction === groupKey;
      });
    } else {
      return Object.entries(allDefsCombined).filter(([_, v]: [string, any]) => {
        return v.category === groupKey;
      });
    }
  };

  const activeGroups = groupBy === 'interaction'
    ? INTERACTION_ORDER.map(key => ({
        key,
        label: INTERACTION_GROUPS[key].label,
        desc: INTERACTION_GROUPS[key].desc,
        badge: INTERACTION_GROUPS[key].badge,
        tokens: getTokensForGroup(key)
      }))
    : [
        ...CATEGORY_ORDER.map(key => ({
          key,
          label: CATEGORY_GROUPS[key].label,
          desc: CATEGORY_GROUPS[key].desc,
          badge: 'dls',
          tokens: getTokensForGroup(key)
        })),
        ...Array.from(new Set(
          Object.values(allDefsCombined)
            .map((d: any) => d.category)
            .filter(c => !CATEGORY_ORDER.includes(c as any))
        )).map(key => ({
          key,
          label: key,
          desc: 'Custom category user tokens',
          badge: 'custom',
          tokens: getTokensForGroup(key)
        }))
      ];

  return (
    <div className="relative h-screen flex flex-col font-sans bg-app-bg text-app-text overflow-hidden">
      
      {/* BRAND EDITOR TOP BAR */}
      <div className="h-auto border-b border-app-border bg-app-surface px-6 py-4 shrink-0 transition-colors">
        <div className="flex justify-between items-center mb-6">
          {/* LEFT: Logo Sonic DLS + Dark/Light Mode Toggle next to it */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-app-accent to-indigo-500 flex items-center justify-center text-white shadow-sm ring-1 ring-white/10">
                <Activity size={18} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-bold tracking-wider uppercase text-app-text leading-tight">Sonic DLS</h1>
                <span className="text-[10px] text-app-text-muted font-mono leading-none">Sound Design System</span>
              </div>
            </div>

            {/* Light / Dark Mode Toggle right next to logo */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-app-border bg-app-surface-light/60 text-app-text-muted hover:text-app-text hover:border-app-text/40 transition-colors shadow-xs ml-1"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
          
          {/* CENTER: Navigation [ Tokens ] [ Prototype ] [ Settings ] */}
          <nav className="flex items-center bg-app-surface-light rounded-md p-1 border border-app-border shadow-xs">
            <button
              onClick={() => setViewMode('DLS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-sm transition-colors ${
                viewMode === 'DLS' ? 'bg-app-accent text-white font-semibold shadow-sm' : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              <Monitor size={13} /> Tokens
            </button>
            <button
              onClick={() => setViewMode('INFOTAINMENT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-sm transition-colors ${
                viewMode === 'INFOTAINMENT' ? 'bg-app-accent text-white font-semibold shadow-sm' : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              <Layout size={13} /> Prototype
            </button>
            <button
              onClick={() => setViewMode('SETTINGS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-sm transition-colors ${
                viewMode === 'SETTINGS' ? 'bg-app-accent text-white font-semibold shadow-sm' : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              <Sliders size={13} /> Settings
            </button>
          </nav>

          {/* RIGHTMOST: Themes Preview + Create Component CTA + Export Dropdown */}
          <div className="flex items-center gap-2">
            {/* Themes Previewer Button */}
            <button
              onClick={() => setShowThemePreviewModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md border border-app-border text-app-text-muted hover:text-app-text hover:bg-app-surface-light transition-colors shadow-xs"
              title="Preview clean, modern visual styles and themes"
            >
              <Palette size={13} className="text-app-accent" />
              <span>Themes</span>
            </button>

            {/* Create CTA Button (creates Component or Semantic token) */}
            <div className="relative">
              <button
                onClick={() => {
                  if (viewMode === 'DLS') {
                    setShowCreateToken(true);
                  } else {
                    setViewMode('CREATE');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-app-accent hover:bg-blue-600 text-white shadow-sm transition-all active:scale-98"
                title="Create a Component or Semantic Token"
              >
                <PlusCircle size={14} />
                <span>Create Token</span>
              </button>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-md border border-app-border text-app-text hover:bg-app-surface-light transition-colors shadow-xs"
              >
                <Download size={14} /> Export <ChevronDown size={14} />
              </button>
              {showExportMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-app-surface border border-app-border rounded-md shadow-xl z-50 overflow-hidden">
                  <button 
                    onClick={() => { handleExportJSON(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-surface-light border-b border-app-border transition-colors flex items-center gap-2"
                  >
                    Export as JSON
                  </button>
                  <button 
                    onClick={handleExportWav}
                    disabled={isExportingWav}
                    className="w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-surface-light transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isExportingWav ? (
                      <>
                        <div className="w-3 h-3 border-2 border-app-text/30 border-t-app-text rounded-full animate-spin"></div>
                        Exporting WAV...
                      </>
                    ) : (
                      'Export as WAV (ZIP)'
                    )}
                  </button>
                </div>
              )}
            </div>
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
              <div className="flex items-center gap-1.5">
                <select 
                  value={typeof brand.timbre === 'object' ? 'custom' : brand.timbre} 
                  onChange={e => {
                    if (e.target.value === 'custom') {
                      setViewMode('SETTINGS');
                    } else {
                      setBrand(b => ({ ...b, timbre: e.target.value as any }));
                    }
                  }} 
                  className="bg-app-surface-light border border-app-border text-xs p-1.5 rounded accent-app-accent outline-none capitalize"
                >
                  <option value="sine">Sine</option>
                  <option value="triangle">Triangle</option>
                  <option value="square">Square</option>
                  <option value="sawtooth">Sawtooth</option>
                  {typeof brand.timbre === 'object' && (
                    <option value="custom">Custom (Sampled)</option>
                  )}
                </select>
                <button
                  onClick={() => setViewMode('SETTINGS')}
                  className={`text-[10px] px-2 py-1.5 rounded border transition-colors whitespace-nowrap font-medium ${
                    typeof brand.timbre === 'object'
                      ? 'bg-app-accent/15 border-app-accent text-app-accent'
                      : 'bg-app-surface-light border-app-border text-app-text-muted hover:text-app-text'
                  }`}
                  title="Open Waveform Sampler Panel"
                >
                  Sampler
                </button>
              </div>
              <span className="text-[10px] text-app-text-muted text-center">
                {typeof brand.timbre === 'object' ? 'PERIODIC WAVE (32 HARMONICS)' : 'WAVE'}
              </span>
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

      <Suspense fallback={null}>
      {viewMode === 'CREATE' ? (
        <CreateTokenPanel
          isFullView
          brand={brand}
          semanticDefs={semanticDefs}
          onAddComponent={(name, def, originalName) => {
            if (originalName && originalName !== name) {
              setCustomTokens(prev => {
                const copy = { ...prev };
                delete copy[originalName];
                return { ...copy, [name]: def };
              });
            } else {
              setCustomTokens(prev => ({ ...prev, [name]: def }));
            }
          }}
          onAddSemantic={handleAddSemanticToken}
        />
      ) : viewMode === 'INFOTAINMENT' ? (
        <InfotainmentUI 
          brand={brand} 
          playComponent={playComponent} 
          assignments={assignments} 
          allTokens={Object.keys(allDefsCombined)}
          onUpdateAssignment={(elementName, token) => {
            setAssignments(prev => ({ ...prev, [elementName]: token }));
          }}
          onOpenSettings={() => setViewMode('SETTINGS')}
        />
      ) : viewMode === 'SETTINGS' ? (
        <WaveformSamplerPanel
          brand={brand}
          onUpdateBrandTimbre={(newTimbre) => setBrand(b => ({ ...b, timbre: newTimbre }))}
          onNavigateToExplorer={() => setViewMode('DLS')}
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
                      <span className="text-app-accent">
                        {typeof v === 'number' 
                          ? v.toFixed(2) 
                          : typeof v === 'object' && v !== null && v.type === 'custom'
                            ? 'custom (32 harmonics)' 
                            : String(v)}
                      </span>
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
                <div className="flex items-center gap-1.5 truncate">
                  <span>3. Component</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-app-surface-light border border-app-border text-app-accent font-mono">
                    {groupBy === 'interaction' ? 'Interaction' : 'Category'}
                  </span>
                </div>
                {expanded.component ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expanded.component && (
                <div className="pl-2 pr-1 py-2 space-y-3">
                  {activeGroups.map(grp => (
                    <div key={grp.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-app-text-muted px-2 py-1 bg-app-surface-light/60 rounded border border-app-border/40">
                        <span className="truncate">{grp.label}</span>
                        <span className="font-mono text-[9px] px-1.5 bg-app-surface rounded text-app-accent border border-app-border">
                          {grp.tokens.length}
                        </span>
                      </div>
                      <div className="pl-2 space-y-1">
                        {grp.tokens.map(([k, v]: [string, any]) => {
                          const isSelected = activeToken?.component === k;
                          const isPlaying = playingComponents.has(k);
                          return (
                            <div
                              key={k}
                              className={`w-full text-left p-1.5 rounded transition-colors flex items-center justify-between group/side ${
                                isSelected 
                                  ? 'bg-app-accent/15 text-app-accent border-l-2 border-app-accent pl-2' 
                                  : customTokens[k]
                                    ? 'hover:bg-app-surface-light text-app-text-muted hover:text-app-text border-l-2 border-[#A78BFA] pl-2'
                                    : 'hover:bg-app-surface-light text-app-text-muted hover:text-app-text border-l border-app-border pl-2'
                              }`}
                            >
                              <button
                                onClick={() => playComponent(k)}
                                className="truncate text-left flex-1"
                                title={`Select & play ${k}`}
                              >
                                <div className="text-[11px] font-mono leading-tight truncate">{k}</div>
                                <div className="text-[9px] text-app-text-muted opacity-80 mt-0.5 truncate">
                                  → semantic.{v.semantic}
                                </div>
                              </button>

                              <div className="flex items-center shrink-0 ml-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => playComponent(k)}
                                  title={`Play ${k}`}
                                  className={`p-1 rounded transition-colors ${
                                    isPlaying
                                      ? 'bg-app-accent text-white shadow-sm ring-1 ring-app-accent/50'
                                      : 'text-app-text-muted hover:text-white hover:bg-app-accent'
                                  }`}
                                >
                                  <Play size={10} className={isPlaying ? 'fill-current animate-pulse' : ''} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
              onClick={() => setViewMode('CREATE')}
              className="mt-6 w-full p-2 border border-dashed border-app-border rounded text-xs text-app-text-muted hover:text-app-accent hover:border-app-accent transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <PlusCircle size={13} />
              <span>+ Create Token (Semantic or Component)</span>
            </button>

          </div>
        </div>

        {/* MID COL: PLAYGROUND */}
        <div className="flex-1 overflow-y-auto bg-app-bg p-8">
          <div className="max-w-4xl mx-auto space-y-10">

            {/* TOP BAR OF TOKENS TAB: VIEW TOGGLE [ By Interaction ] [ By Category ] */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-app-border">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-app-text">
                    Sonic DLS Tokens
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-app-surface-light border border-app-border text-app-text-muted font-semibold">
                    {Object.keys(allDefsCombined).length} Tokens
                  </span>
                </div>
                <p className="text-xs text-app-text-muted mt-1">
                  {groupBy === 'interaction' 
                    ? 'Interaction structure (per designer feedback): Input, Navigation, Confirmation, Error, Alert, Ambient, Voice.'
                    : 'Classic DLS category structure: UI Interactions, Navigation, Alerts, Voice Assistant, Media & Comms.'}
                </p>
              </div>

              {/* Toggle Buttons: [ By Interaction ]  [ By Category ] */}
              <div className="flex items-center bg-app-surface-light p-1 rounded-md border border-app-border shadow-inner shrink-0">
                <button
                  onClick={() => setGroupBy('interaction')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-all ${
                    groupBy === 'interaction'
                      ? 'bg-app-accent text-white shadow-sm'
                      : 'text-app-text-muted hover:text-app-text'
                  }`}
                >
                  <Tag size={13} /> By Interaction
                </button>
                <button
                  onClick={() => setGroupBy('category')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-all ${
                    groupBy === 'category'
                      ? 'bg-app-accent text-white shadow-sm'
                      : 'text-app-text-muted hover:text-app-text'
                  }`}
                >
                  <Grid size={13} /> By Category
                </button>
              </div>
            </div>

            {/* TOKEN GROUPS ACCORDING TO ACTIVE TOGGLE */}
            {activeGroups.map(grp => (
              <div key={grp.key} id={`group-${grp.key}`} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-app-border pb-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-xs uppercase tracking-widest text-app-text font-bold">
                      {grp.label}
                    </h3>
                    <span className="text-xs text-app-text-muted font-normal">
                      — {grp.desc}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-app-text-muted bg-app-surface-light px-2 py-0.5 rounded border border-app-border shrink-0">
                    {grp.tokens.length} {grp.tokens.length === 1 ? 'token' : 'tokens'}
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {grp.tokens.map(([k, v]: [string, any]) => {
                    const isSafety = grp.key === 'Alert' || v.category === 'Alerts';
                    const isCustom = !!customTokens[k];
                    const isActive = activeToken?.component === k;
                    const isPlaying = playingComponents.has(k);
                    const hasPlayed = playedTokens.has(k);

                    const semDef = semanticDefs[v.semantic as keyof typeof DEFAULT_SEMANTIC_DEFS];
                    const resolvedNotes = resolveNotes(brand.scale, v.overrides?.arpeggio || semDef.degrees);
                    const freqStr = resolvedNotes[0] ? `${Math.round(resolvedNotes[0].freq)} Hz` : '';
                    let dur = brand.decayUnit * semDef.durMult;
                    if (v.overrides?.durMult) dur *= v.overrides.durMult;
                    if (k === 'nav.arrived') dur = Math.min(dur, 0.8);
                    else dur = Math.min(dur, 0.5);
                    const badgeText = `${freqStr} · ${Math.round(dur * 1000)}ms`;

                    return (
                      <div key={k} className="relative group">
                        <div
                          onClick={() => playComponent(k)}
                          className={`w-full relative flex flex-col p-4 text-left border rounded-[4px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${
                            isSafety ? 'border-l-2 border-l-[#F5A623]' : isCustom ? 'border-l-2 border-l-[#A78BFA]' : ''
                          } ${
                            isPlaying
                              ? isSafety
                                ? 'bg-[#F59E0B20] border-app-amber shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-app-amber/50'
                                : 'bg-[#3B82F620] border-app-accent shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-app-accent/50'
                              : isActive
                                ? isSafety ? 'bg-[#F59E0B1A] border-app-amber shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#3B82F61A] border-app-accent shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                : 'bg-app-surface border-app-border hover:border-app-text-muted'
                          }`}
                        >
                          {hasPlayed && !isPlaying && (
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#3DD68C]" title="Previously played"></div>
                          )}
                          
                          {/* Top Row: Component Token Name & Dedicated Play / Pause Buttons */}
                          <div className="flex items-start justify-between gap-2 mb-2 w-full">
                            <span className={`text-xs font-mono font-medium truncate flex-1 ${
                              isSafety ? 'text-app-amber' : isActive || isPlaying ? 'text-app-accent' : 'text-app-text'
                            }`}>
                              {k}
                            </span>

                            {/* Component Play, Pause, WAV Download, and Copy Snippet Buttons */}
                            <div 
                              className="flex items-center gap-0.5 shrink-0 bg-app-surface-light p-0.5 rounded border border-app-border shadow-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* [ ▶ ] Play */}
                              <button
                                type="button"
                                onClick={() => playComponent(k)}
                                title={`Play ${k}`}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                  isPlaying
                                    ? isSafety
                                      ? 'bg-app-amber text-black font-bold shadow-xs ring-1 ring-app-amber animate-pulse'
                                      : 'bg-app-accent text-white font-bold shadow-xs ring-1 ring-app-accent animate-pulse'
                                    : 'text-app-text-muted hover:text-white hover:bg-app-accent active:scale-95'
                                }`}
                              >
                                <Play size={10} className={isPlaying ? 'fill-current' : ''} />
                                <span className="hidden xl:inline">Play</span>
                              </button>

                              {/* [ ↓ ] Download WAV */}
                              <button
                                type="button"
                                onClick={() => handleDownloadTokenWav(k, v)}
                                disabled={downloadingWavToken === k}
                                title={`Download ${k.replace(/\./g, '-')}.wav`}
                                className="p-1 rounded text-app-text-muted hover:text-app-accent hover:bg-app-surface active:scale-95 transition-all"
                              >
                                {downloadingWavToken === k ? (
                                  <div className="w-2.5 h-2.5 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <ArrowDown size={11} />
                                )}
                              </button>

                            </div>
                          </div>

                          {/* Secondary tag showing either Interaction or Category + Playing status */}
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-app-surface-light text-app-text-muted border border-app-border/60">
                              {groupBy === 'interaction' ? v.category : (v.interaction || 'Input')}
                            </span>

                            {isPlaying && (
                              <span className="flex items-center gap-1 text-[9px] font-mono text-app-accent font-semibold animate-pulse">
                                <Activity size={10} className="animate-spin" /> Playing...
                              </span>
                            )}
                          </div>
                          
                          <span className="text-[10px] text-app-text-muted mt-auto line-clamp-1">{v.desc}</span>
                          
                          <div className="absolute bottom-2 right-2 text-[9px] font-mono text-app-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                            {badgeText}
                          </div>
                        </div>
                        
                        <div className="absolute -top-3 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditTokenKey(k); }}
                            className="bg-app-surface-light border border-app-border text-[9px] uppercase px-2 py-0.5 rounded text-app-text-muted hover:text-app-text hover:border-app-text shadow-xs"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowAssignModal(k); setAssignInput(''); }}
                            className="bg-app-surface-light border border-app-border text-[9px] uppercase px-2 py-0.5 rounded text-app-text-muted hover:text-app-accent hover:border-app-accent shadow-xs"
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
                  <div className="text-[10px] uppercase tracking-widest text-app-text-muted mb-3">Classification & Synthesis</div>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-app-border pb-2">
                      <span className="text-[11px] text-app-text-muted">Interaction</span>
                      <span className="text-[11px] font-mono text-app-accent font-semibold">
                        {activeToken.interaction || 'Input'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-app-border pb-2">
                      <span className="text-[11px] text-app-text-muted">DLS Category</span>
                      <span className="text-[11px] font-mono text-app-text">
                        {activeToken.category || 'UI Interactions'}
                      </span>
                    </div>
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
                        {typeof brand.timbre === 'object' && brand.timbre !== null && brand.timbre.type === 'custom'
                          ? 'CUSTOM (PERIODIC WAVE)'
                          : String(brand.timbre)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inspector Component Playback Control */}
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playComponent(activeToken.component)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-xs font-semibold uppercase tracking-wider transition-all shadow-xs ${
                        playingComponents.has(activeToken.component)
                          ? 'bg-app-accent text-white ring-2 ring-app-accent/60 font-bold animate-pulse'
                          : 'bg-app-accent text-white hover:bg-blue-600 active:scale-95'
                      }`}
                    >
                      <Play size={13} className={playingComponents.has(activeToken.component) ? 'fill-current' : ''} />
                      <span>{playingComponents.has(activeToken.component) ? 'Playing Token...' : 'Play Token'}</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
      )}
      </Suspense>

      {showCreateToken && (
        <Suspense fallback={null}>
          <CreateTokenPanel 
            brand={brand}
            semanticDefs={semanticDefs}
            onClose={() => setShowCreateToken(false)}
            onAddComponent={(name, def) => {
              setCustomTokens(prev => ({ ...prev, [name]: def }));
              setShowCreateToken(false);
            }}
            onAddSemantic={(key, def) => {
              handleAddSemanticToken(key, def);
              setShowCreateToken(false);
            }}
          />
        </Suspense>
      )}

      {editTokenKey && (
        <Suspense fallback={null}>
          <CreateTokenPanel 
            brand={brand}
            semanticDefs={semanticDefs}
            initialData={{ type: 'component', name: editTokenKey, def: allDefsCombined[editTokenKey as keyof typeof allDefsCombined] }}
            onClose={() => setEditTokenKey(null)}
            onAddComponent={(name, def, originalName) => {
              setCustomTokens(prev => {
                const next = { ...prev, [name]: def };
                if (originalName && originalName !== name) {
                  delete next[originalName];
                }
                return next;
              });
              setEditTokenKey(null);
            }}
            onAddSemantic={(key, def) => {
              handleAddSemanticToken(key, def);
              setEditTokenKey(null);
            }}
          />
        </Suspense>
      )}

      {showAssignModal && (
        <Suspense fallback={null}>
          <AssignModal 
            token={showAssignModal}
            onClose={() => setShowAssignModal(null)}
            onAssign={(elementName) => {
              setAssignments(prev => ({ ...prev, [elementName]: showAssignModal }));
              setShowAssignModal(null);
            }}
          />
        </Suspense>
      )}

      {showEditSemantic && (
        <Suspense fallback={null}>
          <EditSemanticModal 
            initialDefs={semanticDefs}
            onClose={() => setShowEditSemantic(false)}
            onSave={(defs) => {
              setSemanticDefs(defs);
              setShowEditSemantic(false);
            }}
          />
        </Suspense>
      )}

      {/* THEME PREVIEW MODAL */}
      <ThemePreviewModal
        isOpen={showThemePreviewModal}
        onClose={() => setShowThemePreviewModal(false)}
      />

    </div>
  );
}
