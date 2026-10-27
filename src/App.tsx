import { useState, useEffect } from 'react';
import {
  Play, Pause, ChevronDown, ChevronRight, ChevronLeft, Activity, Volume2, Info, Moon, Sun,
  Layout, LayoutGrid, Monitor, Download, Sliders, Waves, Layers, Tag, Grid, Radio,
  Code, ArrowDown, Code2, Copy, Check, Plus, PlusCircle, Palette, MoreHorizontal, MoreVertical, Edit2, Folder, Sparkles,
  Package, FileText
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
import { InfotainmentUI } from './components/InfotainmentUI';
import { CreateTokenPanel } from './components/CreateTokenPanel';
import { AssignModal } from './components/AssignModal';
import { EditSemanticModal } from './components/EditSemanticModal';
import { WaveformSamplerPanel } from './components/WaveformSamplerPanel';
import { SdkPanel } from './components/SdkPanel';
import { exportAllWavs, downloadTokenWav } from './lib/exportAudio';
import { applyThemeColors, clearThemeColorOverrides, ThemePreviewModal, THEME_PRESETS } from './components/ThemeCustomizerPanel';
import { SonicPresetsModal, SONIC_PRESETS, SonicPreset, applySonicPresetTheme } from './components/SonicPresetsModal';

function MiniWaveform({ isPlaying, barCount = 14 }: { isPlaying: boolean; barCount?: number }) {
  const heights = [20, 45, 80, 55, 30, 70, 95, 60, 40, 85, 50, 35, 65, 25];
  return (
    <div className="flex items-center gap-[2.5px] h-6 px-1">
      {heights.slice(0, barCount).map((h, i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full transition-all duration-150 ${
            isPlaying
              ? 'bg-app-accent animate-pulse'
              : 'bg-app-text-muted/40'
          }`}
          style={{
            height: isPlaying ? `${Math.max(20, (h * (0.6 + Math.random() * 0.8)))}%` : `${h}%`,
            transitionDelay: `${i * 30}ms`
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<'DLS' | 'CREATE' | 'INFOTAINMENT' | 'SETTINGS' | 'SDK' | 'PACKAGE'>('DLS');
  const [copiedTokenToast, setCopiedTokenToast] = useState<string | null>(null);
  const [downloadingWavToken, setDownloadingWavToken] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [showThemePreviewModal, setShowThemePreviewModal] = useState<boolean>(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);

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
  const [showSonicPresetsModal, setShowSonicPresetsModal] = useState(false);
  const [activePresetName, setActivePresetName] = useState<string>(() => {
    const saved = localStorage.getItem('sonic_dls_active_preset') || 'organic';
    const found = SONIC_PRESETS.find(p => p.id === saved);
    return found ? found.name : 'ORGANIC';
  });

  const handleApplySonicPreset = (preset: SonicPreset) => {
    setBrand(preset.primitive);
    setSemanticDefs(preset.semantics);
    localStorage.setItem('sonic_dls_active_preset', preset.id);
    applySonicPresetTheme(preset);
    setActivePresetName(preset.name);
  };

  useEffect(() => {
    // Initial mount: load saved sonic preset theme colors
    const saved = localStorage.getItem('sonic_dls_active_preset') || 'organic';
    const found = SONIC_PRESETS.find(p => p.id === saved);
    if (found) {
      applySonicPresetTheme(found);
      setActivePresetName(found.name);
    }
  }, []);

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
    const saved = localStorage.getItem('sonic_dls_active_preset') || 'organic';
    const found = SONIC_PRESETS.find(p => p.id === saved);
    if (found) {
      applySonicPresetTheme(found);
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

  const selectComponentToken = (compId: string, def: any) => {
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
        degrees,
        notes: resolvedNotes.map(n => n.note),
        freqs: resolvedNotes.map(n => n.freq),
        dur,
        vol
      }
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
      await downloadTokenWav(tokenKey, brand, tokenDef);
    } catch (err) {
      console.error('Failed to download token WAV:', err);
    } finally {
      setDownloadingWavToken(null);
    }
  };

  const handleCopyTokenSnippet = (tokenKey: string) => {
    const snippet = `import { SonicDLS } from '@pallavikiragi/sonic-design-system'
import tokens from './sonic-dls-export.json'
const dls = new SonicDLS(tokens)
dls.play('${tokenKey}')`;
    navigator.clipboard.writeText(snippet);
    setCopiedTokenToast(tokenKey);
    setTimeout(() => {
      setCopiedTokenToast(null);
    }, 1500);
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
      <div className="h-auto border-b border-app-nav-border bg-app-nav-bg shrink-0 transition-colors">
        <div className="flex justify-between items-center px-8 py-4.5 min-h-[72px]">
          {/* LEFT: Brand Icon + Title + Active Preset Pill + Dark/Light toggle */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl border border-app-nav-border bg-app-nav-controls-bg flex items-center justify-center text-app-accent shadow-2xs shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h3l3-7 4 14 3-7h7" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-bold tracking-tight text-app-text leading-tight">Sonic DLS</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-app-accent/15 text-app-accent border border-app-accent/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-app-accent" />
                  {activePresetName}
                </span>
              </div>
              <span className="text-[11px] text-app-text-muted leading-tight font-normal">Sound Design System • Acoustic Primitives</span>
            </div>

            {/* Light / Dark Mode Toggle button */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-nav-border bg-app-nav-controls-bg text-app-text-muted hover:text-app-text transition-colors shadow-2xs ml-1"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* CENTER: Navigation [ TOKENS ] [ PROTOTYPE ] [ SETTINGS ] [ PACKAGE ] */}
          <nav className="flex items-center bg-app-nav-controls-bg rounded-xl p-1.5 border border-app-nav-border shadow-2xs">
            <button
              onClick={() => setViewMode('DLS')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider rounded-lg transition-all ${
                viewMode === 'DLS'
                  ? 'bg-app-surface text-app-text shadow-xs font-semibold'
                  : 'text-app-text-muted hover:text-app-text font-medium'
              }`}
            >
              <LayoutGrid size={13} /> TOKENS
            </button>
            <button
              onClick={() => setViewMode('INFOTAINMENT')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider rounded-lg transition-all ${
                viewMode === 'INFOTAINMENT'
                  ? 'bg-app-surface text-app-text shadow-xs font-semibold'
                  : 'text-app-text-muted hover:text-app-text font-medium'
              }`}
            >
              <Layout size={13} /> PROTOTYPE
            </button>
            <button
              onClick={() => setViewMode('SETTINGS')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider rounded-lg transition-all ${
                viewMode === 'SETTINGS'
                  ? 'bg-app-surface text-app-text shadow-xs font-semibold'
                  : 'text-app-text-muted hover:text-app-text font-medium'
              }`}
            >
              <Sliders size={13} /> SETTINGS
            </button>
            <button
              onClick={() => setViewMode('PACKAGE')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider rounded-lg transition-all ${
                viewMode === 'PACKAGE' || viewMode === 'SDK'
                  ? 'bg-app-surface text-app-text shadow-xs font-semibold'
                  : 'text-app-text-muted hover:text-app-text font-medium'
              }`}
            >
              <Package size={13} /> PACKAGE
            </button>
          </nav>

          {/* RIGHTMOST: Sonic Presets (22), + Create Token CTA & Export Dropdown */}
          <div className="flex items-center gap-2.5">
            {/* Sonic Character Presets CTA (22 Archetypes) */}
            <button
              onClick={() => setShowSonicPresetsModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-app-nav-border bg-app-surface/90 text-app-text hover:bg-app-nav-controls-bg hover:border-app-accent shadow-2xs transition-all active:scale-95 group"
              title="Sonic Character Presets (22 Industry Archetypes)"
            >
              <Sparkles size={14} className="text-app-accent group-hover:scale-110 transition-transform" />
              <span>Sonic Presets</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-accent/15 text-app-accent font-semibold">22</span>
            </button>

            {/* Create Token CTA */}
            <button
              onClick={() => {
                if (viewMode === 'DLS') {
                  setShowCreateToken(true);
                } else {
                  setViewMode('CREATE');
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] hover:opacity-90 active:scale-95 shadow-sm transition-all"
              title="Create a Component or Semantic Token"
            >
              <Plus size={14} strokeWidth={2.2} />
              <span>Create Token</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-app-nav-border bg-app-surface/90 text-app-text hover:bg-app-nav-controls-bg shadow-2xs transition-all"
              >
                <Download size={13} />
                <span>Export</span>
                <ChevronDown size={13} />
              </button>
              {showExportMenu && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-app-surface border border-app-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => { handleExportJSON(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-surface-light border-b border-app-border transition-colors flex items-center gap-2 font-normal"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={handleExportWav}
                    disabled={isExportingWav}
                    className="w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-surface-light transition-colors flex items-center gap-2 disabled:opacity-50 font-normal"
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
                  <button
                    onClick={() => { setShowSonicPresetsModal(true); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-surface-light transition-colors flex items-center gap-2 border-t border-app-border/40 text-app-accent font-medium"
                  >
                    <Sparkles size={13} />
                    <span>Sonic Characters (22 Presets)</span>
                  </button>
                  <button
                    onClick={() => { setShowThemePreviewModal(true); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-surface-light transition-colors flex items-center gap-2 border-t border-app-border/40 font-medium"
                  >
                    <Palette size={13} />
                    <span>Visual Themes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PARAMETER CONTROLS BAR (Balanced, uncluttered typographic hierarchy) */}
        <div className="px-8 py-3.5 border-t border-app-nav-border flex flex-wrap items-center justify-between gap-6 text-app-text bg-app-nav-bg/60">
          {/* Cluster 1: SCALE */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">SCALE</span>
              <select
                value={brand.scale.split(' ')[0].replace(/[0-9]/g, '')}
                onChange={e => {
                  const parts = brand.scale.split(' ');
                  const octave = parts[0].replace(/[^0-9]/g, '');
                  const scaleType = parts.slice(1).join(' ');
                  setBrand(b => ({ ...b, scale: `${e.target.value}${octave} ${scaleType}` }));
                }}
                className="h-8 px-2.5 bg-app-surface border border-app-border rounded-lg text-xs font-medium text-app-text outline-none focus:border-app-accent"
              >
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">OCT</span>
              <select
                value={brand.scale.split(' ')[0].replace(/[^0-9]/g, '')}
                onChange={e => {
                  const parts = brand.scale.split(' ');
                  const note = parts[0].replace(/[0-9]/g, '');
                  const scaleType = parts.slice(1).join(' ');
                  setBrand(b => ({ ...b, scale: `${note}${e.target.value} ${scaleType}` }));
                }}
                className="h-8 px-2.5 bg-app-surface border border-app-border rounded-lg text-xs font-medium text-app-text outline-none focus:border-app-accent"
              >
                {[2, 3, 4, 5, 6].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">TYPE</span>
              <select
                value={brand.scale.split(' ').slice(1).join(' ')}
                onChange={e => {
                  const parts = brand.scale.split(' ');
                  setBrand(b => ({ ...b, scale: `${parts[0]} ${e.target.value}` }));
                }}
                className="h-8 px-3 bg-app-surface border border-app-border rounded-lg text-xs font-medium text-app-text outline-none focus:border-app-accent min-w-[150px]"
              >
                <option value="major pentatonic">Major Pentatonic</option>
                <option value="minor pentatonic">Minor Pentatonic</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="dorian">Dorian</option>
                <option value="lydian">Lydian</option>
              </select>
            </div>
          </div>

          <div className="hidden lg:block h-9 w-px bg-app-border"></div>

          {/* Cluster 2: TIMBRE */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">TIMBRE</span>
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
                  className="h-8 px-2.5 bg-app-surface border border-app-border rounded-lg text-xs font-medium text-app-text outline-none capitalize focus:border-app-accent"
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
                  className="h-8 px-2.5 rounded-lg border border-app-border bg-app-surface-light text-app-text text-xs font-medium hover:border-app-accent transition-colors"
                >
                  Sampler
                </button>
              </div>
            </div>

            {/* WAVE with editable numeric input */}
            <div className="flex flex-col gap-1 w-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">WAVE</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.005"
                    value={parseFloat(brand.attack.toFixed(3))}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) setBrand(b => ({ ...b, attack: Math.max(0, Math.min(1, v)) }));
                    }}
                    className="w-13 h-5 px-1 text-[11px] font-mono font-medium text-right bg-app-surface border border-app-border rounded text-app-text focus:border-app-accent outline-none"
                  />
                  <span className="text-[10px] text-app-text-muted font-mono">s</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={brand.attack}
                onChange={e => setBrand(b => ({ ...b, attack: parseFloat(e.target.value) }))}
                className="accent-app-accent w-full h-1 bg-app-border rounded-lg cursor-pointer"
              />
            </div>

            {/* WARMTH with editable numeric input */}
            <div className="flex flex-col gap-1 w-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">WARMTH</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parseFloat(brand.warmth.toFixed(2))}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setBrand(b => ({ ...b, warmth: Math.max(0, Math.min(1, v)) }));
                  }}
                  className="w-13 h-5 px-1 text-[11px] font-mono font-medium text-right bg-app-surface border border-app-border rounded text-app-text focus:border-app-accent outline-none"
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={brand.warmth}
                onChange={e => setBrand(b => ({ ...b, warmth: parseFloat(e.target.value) }))}
                className="accent-app-accent w-full h-1 bg-app-border rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="hidden lg:block h-9 w-px bg-app-border"></div>

          {/* Cluster 3: ENVELOPE */}
          <div className="flex items-center gap-4">
            {/* DECAY with editable numeric input */}
            <div className="flex flex-col gap-1 w-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">DECAY</span>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="50"
                    max="300"
                    step="5"
                    value={Math.round(brand.decayUnit * 1000)}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) setBrand(b => ({ ...b, decayUnit: Math.max(0.05, Math.min(0.3, v / 1000)) }));
                    }}
                    className="w-12 h-5 px-1 text-[11px] font-mono font-medium text-right bg-app-surface border border-app-border rounded text-app-text focus:border-app-accent outline-none"
                  />
                  <span className="text-[10px] text-app-text-muted font-mono">ms</span>
                </div>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.3"
                step="0.005"
                value={brand.decayUnit}
                onChange={e => setBrand(b => ({ ...b, decayUnit: parseFloat(e.target.value) }))}
                className="accent-app-accent w-full h-1 bg-app-border rounded-lg cursor-pointer"
              />
            </div>

            {/* REVERB with editable numeric input */}
            <div className="flex flex-col gap-1 w-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">REVERB</span>
                <input
                  type="number"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={parseFloat(brand.reverbAmount.toFixed(2))}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setBrand(b => ({ ...b, reverbAmount: Math.max(0, Math.min(0.5, v)) }));
                  }}
                  className="w-13 h-5 px-1 text-[11px] font-mono font-medium text-right bg-app-surface border border-app-border rounded text-app-text focus:border-app-accent outline-none"
                />
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={brand.reverbAmount}
                onChange={e => setBrand(b => ({ ...b, reverbAmount: parseFloat(e.target.value) }))}
                className="accent-app-accent w-full h-1 bg-app-border rounded-lg cursor-pointer"
              />
            </div>

            {/* VOL with editable numeric input */}
            <div className="flex flex-col gap-1 w-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-app-text-muted font-medium">VOL</span>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="-30"
                    max="0"
                    step="1"
                    value={brand.volumeBase}
                    onChange={e => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v)) setBrand(b => ({ ...b, volumeBase: Math.max(-30, Math.min(0, v)) }));
                    }}
                    className="w-12 h-5 px-1 text-[11px] font-mono font-medium text-right bg-app-surface border border-app-border rounded text-app-text focus:border-app-accent outline-none"
                  />
                  <span className="text-[10px] text-app-text-muted font-mono">dB</span>
                </div>
              </div>
              <input
                type="range"
                min="-30"
                max="0"
                step="1"
                value={brand.volumeBase}
                onChange={e => setBrand(b => ({ ...b, volumeBase: parseInt(e.target.value) }))}
                className="accent-app-accent w-full h-1 bg-app-border rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

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
      ) : (viewMode === 'PACKAGE' || viewMode === 'SDK') ? (
        <SdkPanel
          brand={brand}
          customTokens={customTokens}
          onPlayToken={(id) => playComponent(id)}
          onNavigateToSettings={() => setViewMode('SETTINGS')}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT COL: TOKEN HIERARCHY */}
          <div className="w-[280px] xl:w-[300px] border-r border-app-border bg-app-surface flex flex-col justify-between overflow-y-auto shrink-0 relative">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-app-text">
                  TOKEN HIERARCHY
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-app-token-bg border border-app-token-border text-app-text-muted font-medium">
                  3 Layers
                </span>
              </div>

              {/* Breaker line */}
              <div className="h-px bg-app-border/80 w-full" />

              {/* 1. PRIMITIVE */}
              <div className="space-y-2.5">
                <button
                  className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-app-text hover:text-app-accent transition-colors"
                  onClick={() => setExpanded(e => ({ ...e, primitive: !e.primitive }))}
                >
                  <span className="font-semibold">1. PRIMITIVE</span>
                  {expanded.primitive ? <ChevronDown size={14} className="text-app-text-muted" /> : <ChevronRight size={14} className="text-app-text-muted" />}
                </button>
                {expanded.primitive && (
                  <div className="space-y-2 pt-1 pl-1 text-xs font-mono">
                    <div className="flex items-center justify-between text-app-text-muted">
                      <span>brand.scale</span>
                      <span className="text-app-text truncate max-w-[130px] text-right font-sans font-medium">
                        {brand.scale.split(' ')[0]}; {brand.scale.split(' ').slice(1).join(' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-app-text-muted">
                      <span>brand.timbre</span>
                      <span className="text-app-text font-sans font-medium capitalize">
                        {typeof brand.timbre === 'object' ? 'custom' : brand.timbre}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-app-text-muted">
                      <span>brand.decayUnit</span>
                      <span className="text-app-text font-sans font-normal">{brand.decayUnit.toFixed(2)}s</span>
                    </div>
                    <div className="flex items-center justify-between text-app-text-muted">
                      <span>brand.warmth</span>
                      <span className="text-app-text font-sans font-normal">{brand.warmth.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-app-text-muted">
                      <span>brand.volumeBase</span>
                      <span className="text-app-text font-sans font-normal">{brand.volumeBase.toFixed(2)}dB</span>
                    </div>
                    <div className="flex items-center justify-between text-app-text-muted">
                      <span>brand.reverbAmount</span>
                      <span className="text-app-text font-sans font-normal">{brand.reverbAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-app-text-muted">
                      <span>brand.attack</span>
                      <span className="text-app-text font-sans font-normal">{brand.attack.toFixed(3)}s</span>
                    </div>

                    <button
                      onClick={() => setShowSonicPresetsModal(true)}
                      className="mt-3.5 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-app-border rounded-xl bg-app-surface hover:bg-app-surface-light hover:border-app-accent text-app-text transition-all shadow-2xs group"
                    >
                      <Sparkles size={13} className="text-app-accent group-hover:scale-110 transition-transform" />
                      <span>22 Sonic Character Presets</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Breaker line */}
              <div className="h-px bg-app-border/80 w-full" />

              {/* 2. SEMANTIC */}
              <div className="space-y-2.5">
                <button
                  className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-app-text hover:text-app-accent transition-colors"
                  onClick={() => setExpanded(e => ({ ...e, semantic: !e.semantic }))}
                >
                  <span className="font-semibold">2. SEMANTIC</span>
                  {expanded.semantic ? <ChevronDown size={14} className="text-app-text-muted" /> : <ChevronRight size={14} className="text-app-text-muted" />}
                </button>
                {expanded.semantic && (
                  <div className="space-y-2 pt-1 pl-1 text-xs font-mono">
                    {Object.entries(semanticDefs).map(([k, v]: [string, any]) => {
                      const dur = Math.round(brand.decayUnit * v.durMult * 1000);
                      return (
                        <div key={k} className="flex items-center justify-between text-app-text-muted hover:text-app-text transition-colors">
                          <span className="truncate font-normal">
                            semantic.{k}
                          </span>
                          <span className="text-[11px] text-app-text-muted/80 font-mono shrink-0 ml-1 font-normal">
                            [{v.degrees[0]}...{dur}ms, {v.volOffset > 0 ? `+${v.volOffset}` : v.volOffset}dB]
                          </span>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setShowEditSemantic(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-app-border rounded-lg bg-app-surface hover:bg-app-surface-light text-app-text transition-colors shadow-2xs"
                    >
                      <Edit2 size={13} />
                      <span>Edit Semantics</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Breaker line */}
              <div className="h-px bg-app-border/80 w-full" />

              {/* 3. COMPONENT */}
              <div className="space-y-2.5">
                <button
                  className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-app-text hover:text-app-accent transition-colors"
                  onClick={() => setExpanded(e => ({ ...e, component: !e.component }))}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">3. COMPONENT</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-app-surface-light border border-app-border text-app-text-muted font-mono font-medium">
                      INTERACTION
                    </span>
                  </div>
                  {expanded.component ? <ChevronDown size={14} className="text-app-text-muted" /> : <ChevronRight size={14} className="text-app-text-muted" />}
                </button>
                {expanded.component && (
                  <div className="space-y-2 pt-1 pl-1 text-xs font-mono">
                    {['ui.knob.rotate', 'ui.toggle.on', 'ui.toggle.off'].map(tokenName => {
                      const def = allDefsCombined[tokenName as keyof typeof allDefsCombined];
                      const semName = def ? def.semantic : 'neutral';
                      return (
                        <div
                          key={tokenName}
                          onClick={() => {
                            if (def) selectComponentToken(tokenName, def);
                            playComponent(tokenName);
                          }}
                          className="flex items-center justify-between text-app-text-muted hover:text-app-text cursor-pointer transition-colors"
                        >
                          <span className="truncate font-normal">
                            {tokenName}
                          </span>
                          <span className="text-[11px] text-app-text-muted/80 font-mono shrink-0 ml-1 font-normal">
                            semantic.{semName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Breaker line above Add Category */}
            <div className="px-6">
              <div className="h-px bg-app-border/80 w-full" />
            </div>

            {/* Bottom + Add Category & decorative contours */}
            <div className="p-6 relative">
              <button
                onClick={() => setShowCreateToken(true)}
                className="flex items-center justify-center gap-2.5 w-full text-xs font-medium py-3 px-4 rounded-xl bg-black text-white hover:bg-neutral-800 active:scale-98 transition-all shadow-md relative z-10"
              >
                <FileText size={15} className="text-white" />
                <span>Add Category</span>
              </button>

              {/* Subtle decorative wave curves */}
              <svg className="absolute bottom-0 left-0 w-44 h-28 opacity-15 pointer-events-none text-app-text" viewBox="0 0 100 80" fill="none">
                <path d="M0 40 Q 25 20, 50 40 T 100 40" stroke="currentColor" strokeWidth="0.8" />
                <path d="M0 50 Q 25 30, 50 50 T 100 50" stroke="currentColor" strokeWidth="0.8" />
                <path d="M0 60 Q 25 40, 50 60 T 100 60" stroke="currentColor" strokeWidth="0.8" />
                <path d="M0 70 Q 25 50, 50 70 T 100 70" stroke="currentColor" strokeWidth="0.8" />
              </svg>
            </div>
          </div>

          {/* MID COL: TOKENS GRID (Matches image.png) */}
          <div className="flex-1 overflow-y-auto bg-app-bg p-8">
            <div className="max-w-6xl mx-auto space-y-10">

              {/* Header: Title + Badge + Subtitle + By Interaction / By Category switch */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-app-border">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold tracking-tight text-app-text">
                      Sonic DLS Tokens
                    </h2>
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-app-token-bg border border-app-token-border text-app-text-muted font-medium">
                      {Object.keys(allDefsCombined).length} tokens
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-app-text-muted mt-1.5 font-normal">
                    {groupBy === 'interaction'
                      ? 'Interaction structure (per designer feedback): Input, Navigation, Confirmation, Error, Alert, Ambient, Voice.'
                      : 'Classic DLS category structure: UI Interactions, Navigation, Alerts, Voice Assistant, Media & Comms.'}
                  </p>
                </div>

                {/* View Toggle Pill */}
                <div className="flex items-center bg-app-nav-controls-bg p-1 rounded-xl border border-app-nav-border shrink-0 shadow-2xs">
                  <button
                    onClick={() => setGroupBy('interaction')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg transition-all ${
                      groupBy === 'interaction'
                        ? 'bg-app-surface text-app-text shadow-xs font-semibold'
                        : 'text-app-text-muted hover:text-app-text font-medium'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${groupBy === 'interaction' ? 'bg-app-accent' : 'bg-transparent'}`} />
                    By Interaction
                  </button>
                  <button
                    onClick={() => setGroupBy('category')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg transition-all ${
                      groupBy === 'category'
                        ? 'bg-app-surface text-app-text shadow-xs font-semibold'
                        : 'text-app-text-muted hover:text-app-text font-medium'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${groupBy === 'category' ? 'bg-app-accent' : 'bg-transparent'}`} />
                    By Category
                  </button>
                </div>
              </div>

              {/* Groups */}
              {activeGroups.map(grp => (
                <div key={grp.key} id={`group-${grp.key}`} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-app-border pb-2.5">
                    <div className="flex items-baseline gap-2.5">
                      <h3 className="text-sm font-semibold tracking-normal text-app-text">
                        {grp.label}
                      </h3>
                      <span className="text-xs text-app-text-muted font-normal">
                        — {grp.desc}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-app-text-muted bg-app-token-bg px-3 py-1 rounded-full border border-app-token-border font-medium">
                      {grp.tokens.length} {grp.tokens.length === 1 ? 'token' : 'tokens'}
                    </span>
                  </div>

                  {/* Rectangular compact token cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {grp.tokens.map(([k, v]: [string, any]) => {
                      const isSelected = activeToken?.component === k;
                      const isPlaying = playingComponents.has(k);

                      return (
                        <div
                          key={k}
                          onClick={() => {
                            selectComponentToken(k, v);
                            playComponent(k);
                          }}
                          className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer min-h-[112px] shadow-2xs hover:shadow-md ${
                            isSelected
                              ? 'border-app-accent ring-2 ring-app-accent/30 shadow-sm bg-app-token-bg-hover'
                              : 'border-app-token-border hover:border-app-accent/50 bg-app-token-bg hover:bg-app-token-bg-hover'
                          }`}
                        >
                          {/* Top: Name + Action Icons (Copy Code, Download WAV, Options) */}
                          <div className="flex items-center justify-between gap-1.5 w-full">
                            <span className="text-xs sm:text-sm font-semibold text-app-text truncate flex-1" title={k}>
                              {k}
                            </span>

                            <div className="flex items-center gap-0.5 shrink-0">
                              {/* Copy Code Icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyTokenSnippet(k);
                                }}
                                className="p-1 text-app-text-muted hover:text-app-text hover:bg-app-token-pill-bg rounded-md transition-colors"
                                title="Copy code snippet"
                              >
                                <Code2 size={13} />
                              </button>

                              {/* Download WAV Icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadTokenWav(k, v);
                                }}
                                disabled={downloadingWavToken === k}
                                className="p-1 text-app-text-muted hover:text-app-accent hover:bg-app-token-pill-bg rounded-md transition-colors disabled:opacity-50"
                                title="Download WAV audio"
                              >
                                {downloadingWavToken === k ? (
                                  <div className="w-3 h-3 border-2 border-app-accent/30 border-t-app-accent rounded-full animate-spin" />
                                ) : (
                                  <Download size={13} />
                                )}
                              </button>

                              {/* More Options / Edit Icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTokenKey(k);
                                }}
                                className="p-1 text-app-text-muted hover:text-app-text hover:bg-app-token-pill-bg rounded-md transition-colors"
                                title="Edit token"
                              >
                                <MoreHorizontal size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Middle: Category Pill on left + Circular Play/Pause button and Waveform on right */}
                          <div className="flex items-center justify-between gap-2 my-1">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-app-token-pill-bg border border-app-token-border/80 text-app-text-muted truncate max-w-[120px]">
                              {groupBy === 'interaction' ? (v.interaction || 'Interaction') : v.category}
                            </span>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPlaying) {
                                    pauseComponent(k);
                                  } else {
                                    selectComponentToken(k, v);
                                    playComponent(k);
                                  }
                                }}
                                title={isPlaying ? `Pause ${k}` : `Play ${k}`}
                                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                  isPlaying
                                    ? 'bg-app-accent border-app-accent text-white shadow-sm ring-2 ring-app-accent/40 animate-pulse'
                                    : 'bg-app-token-bg border-app-token-border text-app-text hover:bg-app-token-bg-hover hover:border-app-accent/50 active:scale-95'
                                }`}
                              >
                                {isPlaying ? (
                                  <Pause size={11} className="fill-current" />
                                ) : (
                                  <Play size={11} className="fill-current translate-x-0.5" />
                                )}
                              </button>

                              <MiniWaveform isPlaying={isPlaying} barCount={10} />
                            </div>
                          </div>

                          {/* Bottom Description */}
                          <p className="text-[11px] text-app-text-muted truncate mt-0.5">
                            {v.desc || 'Interaction trigger'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attached Tab Present on Right Edge When Inspector is Collapsed */}
          {!inspectorOpen && (
            <button
              onClick={() => setInspectorOpen(true)}
              title="Open Active Inspector"
              className="w-9 border-l border-y border-app-border bg-app-surface hover:bg-app-surface-light hover:border-app-accent flex flex-col items-center justify-center py-6 gap-3 shrink-0 shadow-md transition-all group cursor-pointer z-20"
            >
              <ChevronLeft size={16} className="text-app-text-muted group-hover:text-app-accent transition-colors" />
              <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-widest text-app-text group-hover:text-app-accent transition-colors">
                ACTIVE INSPECTOR
              </span>
            </button>
          )}

          {/* RIGHT COL: ACTIVE INSPECTOR (Collapsible) */}
          {inspectorOpen && (
            <div className="w-[310px] xl:w-[330px] border-l border-app-border bg-app-surface flex flex-col justify-between p-5 shrink-0 overflow-y-auto animate-in slide-in-from-right-4 duration-200">
              <div className="space-y-5">
                {/* Header: ACTIVE INSPECTOR + Collapse Button */}
                <div className="flex items-center justify-between pb-1.5 border-b border-app-border">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs uppercase tracking-wider font-semibold text-app-text">
                      ACTIVE INSPECTOR
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-app-surface-light border border-app-border text-app-text-muted font-medium">
                      Live
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectorOpen(false)}
                    className="p-1 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-surface-light transition-colors"
                    title="Collapse inspector"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* RESOLUTION CHAIN */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-app-text-muted font-semibold mb-2.5">
                    RESOLUTION CHAIN
                  </div>

                  <div className="space-y-1.5">
                    {/* 1. Component Card */}
                    <div className="border border-app-token-border rounded-xl p-3 text-center bg-app-token-bg shadow-2xs">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-app-text">
                        COMPONENT
                      </div>
                      <div className="text-xs text-app-text font-mono font-medium mt-0.5 truncate">
                        {activeToken ? activeToken.component : 'ui.knob.rotate'}
                      </div>
                    </div>

                    <div className="text-center text-xs text-app-text-muted/60 my-0.5 font-medium">↓</div>

                    {/* 2. Semantic Card */}
                    <div className="border border-app-token-border rounded-xl p-3 text-center bg-app-token-bg shadow-2xs">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-app-text">
                        SEMANTIC
                      </div>
                      <div className="text-xs text-app-accent font-mono font-medium mt-0.5 truncate">
                        {activeToken ? `semantic.${activeToken.semantic}` : 'semantic.neutral'}
                      </div>
                    </div>

                    <div className="text-center text-xs text-app-text-muted/60 my-0.5 font-medium">↓</div>

                    {/* 3. Primitive Card */}
                    <div className="border border-app-token-border rounded-xl p-3 text-center bg-app-token-bg shadow-2xs">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-app-text">
                        PRIMITIVE
                      </div>
                      <div className="text-xs text-app-text-muted mt-0.5 font-medium">
                        brand DNA ({brand.scale.split(' ')[0]})
                      </div>
                    </div>
                  </div>
                </div>

                {/* TOKEN DETAILS */}
                <div className="space-y-3 pt-1">
                  <div className="text-xs uppercase tracking-wider text-app-text-muted font-semibold mb-1.5">
                    TOKEN DETAILS
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-app-border/50">
                    <span className="text-app-text-muted font-medium">Name</span>
                    <span className="font-mono font-medium text-app-text text-right truncate max-w-[170px]">
                      {activeToken ? activeToken.component : 'ui.knob.rotate'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-app-border/50">
                    <span className="text-app-text-muted font-medium">Category</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-app-token-pill-bg border border-app-token-border text-app-text">
                      {activeToken ? (activeToken.interaction || activeToken.category || 'Interaction') : 'Interaction'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-app-border/50">
                    <span className="text-app-text-muted font-medium">Type</span>
                    <span className="text-app-text font-semibold">Audio DLS</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-app-border/50">
                    <span className="text-app-text-muted font-medium">Scale</span>
                    <select
                      value={brand.scale.split(' ')[0].replace(/[0-9]/g, '')}
                      onChange={e => {
                        const parts = brand.scale.split(' ');
                        const octave = parts[0].replace(/[^0-9]/g, '');
                        const scaleType = parts.slice(1).join(' ');
                        setBrand(b => ({ ...b, scale: `${e.target.value}${octave} ${scaleType}` }));
                      }}
                      className="h-7 px-2 text-xs font-semibold bg-app-surface border border-app-border rounded-lg text-app-text outline-none"
                    >
                      {['C', 'C#', 'D', 'D#', 'E', 'F', 'G', 'A', 'B'].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-app-border/50">
                    <span className="text-app-text-muted font-medium">Octave</span>
                    <select
                      value={brand.scale.split(' ')[0].replace(/[^0-9]/g, '')}
                      onChange={e => {
                        const parts = brand.scale.split(' ');
                        const note = parts[0].replace(/[0-9]/g, '');
                        const scaleType = parts.slice(1).join(' ');
                        setBrand(b => ({ ...b, scale: `${note}${e.target.value} ${scaleType}` }));
                      }}
                      className="h-7 px-2 text-xs font-semibold bg-app-surface border border-app-border rounded-lg text-app-text outline-none"
                    >
                      {[2, 3, 4, 5, 6].map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-app-text-muted font-medium">Timbre</span>
                    <select
                      value={typeof brand.timbre === 'object' ? 'sine' : brand.timbre}
                      onChange={e => setBrand(b => ({ ...b, timbre: e.target.value as any }))}
                      className="h-7 px-2 text-xs font-semibold bg-app-surface border border-app-border rounded-lg text-app-text outline-none capitalize"
                    >
                      {['sine', 'triangle', 'square', 'sawtooth'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Bottom Audio Player Bar with waveform and time */}
              <div className="mt-5 pt-3.5 border-t border-app-border/60">
                <div className="p-2.5 rounded-xl border border-app-token-border bg-app-token-bg flex items-center justify-between gap-3 shadow-2xs">
                  {(() => {
                    const tokenToPlay = activeToken?.component || 'ui.knob.rotate';
                    const isPlayingActive = playingComponents.has(tokenToPlay);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (isPlayingActive) {
                            pauseComponent(tokenToPlay);
                          } else {
                            playComponent(tokenToPlay);
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shrink-0 shadow-xs"
                        title={isPlayingActive ? `Pause ${tokenToPlay}` : `Play ${tokenToPlay}`}
                      >
                        {isPlayingActive ? (
                          <Pause size={12} className="fill-current" />
                        ) : (
                          <Play size={12} className="fill-current translate-x-0.5" />
                        )}
                      </button>
                    );
                  })()}

                  {/* Waveform track with dots */}
                  <div className="flex items-center gap-1 flex-1 overflow-hidden px-1">
                    {[12, 24, 40, 20, 16, 32, 48, 60, 36, 20, 14, 28, 44, 30, 18, 12, 10, 8, 6].map((h, i) => (
                      <span
                        key={i}
                        className="w-[2px] bg-app-text-muted/40 rounded-full"
                        style={{ height: `${h * 0.4}px` }}
                      />
                    ))}
                  </div>

                  <span className="text-[10px] font-mono text-app-text-muted shrink-0">
                    0:00 / 0:02
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const tokenToEdit = activeToken?.component || 'ui.knob.rotate';
                      setEditTokenKey(tokenToEdit);
                    }}
                    className="p-1 text-app-text-muted hover:text-app-text rounded transition-colors shrink-0"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {showCreateToken && (
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
      )}

      {editTokenKey && (
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

      {/* THEME PREVIEW MODAL */}
      <ThemePreviewModal
        isOpen={showThemePreviewModal}
        onClose={() => setShowThemePreviewModal(false)}
      />

      {/* SONIC CHARACTER PRESETS MODAL (Matches image.png) */}
      <SonicPresetsModal
        isOpen={showSonicPresetsModal}
        onClose={() => setShowSonicPresetsModal(false)}
        currentBrand={brand}
        currentSemantics={semanticDefs}
        onApplyPreset={handleApplySonicPreset}
      />

      {/* TOAST NOTIFICATION (CHANGE 2) */}
      {copiedTokenToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-fade-in">
          <Check size={14} /> Copied!
        </div>
      )}
    </div>
  );
}
