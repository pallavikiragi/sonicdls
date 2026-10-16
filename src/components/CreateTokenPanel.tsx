import React, { useState } from 'react';
import { 
  BrandTokens, 
  resolveNotes, 
  InteractionType, 
  INTERACTION_GROUPS,
  audioEngine 
} from '../lib/audio';
import { 
  Play, 
  Sparkles, 
  Layers, 
  Check, 
  Volume2, 
  Sliders, 
  PlusCircle, 
  Info,
  Clock,
  Gauge
} from 'lucide-react';

export interface CreateTokenPanelProps {
  onClose?: () => void;
  onAddComponent: (name: string, def: any, originalName?: string) => void;
  onAddSemantic: (key: string, def: { degrees: number[]; durMult: number; volOffset: number; desc?: string }) => void;
  brand: BrandTokens;
  semanticDefs: Record<string, { degrees: number[]; durMult: number; volOffset: number; desc?: string }>;
  initialData?: { type: 'component' | 'semantic'; name: string; def: any };
  isFullView?: boolean;
}

export function CreateTokenPanel({
  onClose,
  onAddComponent,
  onAddSemantic,
  brand,
  semanticDefs,
  initialData,
  isFullView = false
}: CreateTokenPanelProps) {
  // Mode: Component vs Semantic
  const [tokenType, setTokenType] = useState<'component' | 'semantic'>(
    initialData?.type || 'component'
  );

  // Success toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Playback states
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // ---------------------------------------------------------------------------
  // COMPONENT TOKEN STATE
  // ---------------------------------------------------------------------------
  const [compName, setCompName] = useState(
    initialData?.type === 'component' ? initialData.name : 'ui.button.confirm'
  );
  const [compSection, setCompSection] = useState(
    initialData?.def?.category || 'UI Interactions'
  );
  const [compInteraction, setCompInteraction] = useState<InteractionType>(
    initialData?.def?.interaction || 'Input'
  );
  const [compSemantic, setCompSemantic] = useState<string>(
    initialData?.def?.semantic || Object.keys(semanticDefs)[0] || 'success'
  );
  const [compDurMult, setCompDurMult] = useState(
    initialData?.def?.overrides?.durMult || 1.0
  );
  const [compVolOffset, setCompVolOffset] = useState(
    initialData?.def?.overrides?.volOffset || 0
  );
  const [compDesc, setCompDesc] = useState(
    initialData?.def?.desc || 'User tap confirmation trigger'
  );

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
  const [compPattern, setCompPattern] = useState<'Single' | 'Arpeggio' | 'Pulse' | 'Rise' | 'Custom'>(initialPattern);
  const [compCustomArpStr, setCompCustomArpStr] = useState(initialCustomArp);

  // Derive component preview values
  const currentSemDef = semanticDefs[compSemantic] || { degrees: [0], durMult: 1.0, volOffset: 0 };
  let compDegrees = currentSemDef.degrees;
  const compOverrides: any = {};

  if (compPattern === 'Arpeggio') {
    compDegrees = [1, 3, 5];
    compOverrides.arpeggio = compDegrees;
  } else if (compPattern === 'Pulse') {
    compDegrees = [0, 0];
    compOverrides.arpeggio = compDegrees;
  } else if (compPattern === 'Rise') {
    compDegrees = [1, 2, 3];
    compOverrides.arpeggio = compDegrees;
  } else if (compPattern === 'Custom') {
    const customDegs = compCustomArpStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (customDegs.length > 0) {
      compDegrees = customDegs;
      compOverrides.arpeggio = compDegrees;
    }
  }

  if (compDurMult !== 1.0) compOverrides.durMult = compDurMult;
  if (compVolOffset !== 0) compOverrides.volOffset = compVolOffset;

  const compResolvedNotes = resolveNotes(brand.scale, compDegrees);
  const compFreqStr = compResolvedNotes.map(n => `${Math.round(n.freq)}Hz (${n.note})`).join(' → ') || '440Hz';
  const compDurMs = Math.round(brand.decayUnit * (currentSemDef.durMult || 1.0) * compDurMult * 1000);
  const compTotalVol = brand.volumeBase + (currentSemDef.volOffset || 0) + compVolOffset;

  const handlePlayComponentPreview = async () => {
    await audioEngine.init();
    setIsPlayingPreview(true);
    const previewId = 'preview-comp-create';
    audioEngine.play(
      previewId, 
      compSemantic, 
      brand, 
      compOverrides, 
      undefined, 
      semanticDefs
    );
    setTimeout(() => {
      setIsPlayingPreview(false);
    }, Math.max(300, compDurMs + 200));
  };

  const handlePausePreview = () => {
    audioEngine.stop('preview-comp-create');
    audioEngine.stop('semantic.preview-sem-create');
    setIsPlayingPreview(false);
  };

  const handleSaveComponent = () => {
    const cleanedName = compName.trim();
    if (!cleanedName) return;
    onAddComponent(
      cleanedName,
      {
        semantic: compSemantic,
        category: compSection || 'UI Interactions',
        interaction: compInteraction || 'Input',
        interactions: [compInteraction || 'Input'],
        desc: compDesc || 'Custom token',
        overrides: Object.keys(compOverrides).length > 0 ? compOverrides : undefined
      },
      initialData?.name
    );
    setSuccessToast(`Component token "${cleanedName}" created!`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // ---------------------------------------------------------------------------
  // SEMANTIC TOKEN STATE
  // ---------------------------------------------------------------------------
  const [semKey, setSemKey] = useState(
    initialData?.type === 'semantic' ? initialData.name : 'warning_soft'
  );
  const [semDegreesStr, setSemDegreesStr] = useState(
    initialData?.type === 'semantic' && initialData.def?.degrees
      ? initialData.def.degrees.join(', ')
      : '0, 2'
  );
  const [semDurMult, setSemDurMult] = useState(
    initialData?.type === 'semantic' && initialData.def?.durMult !== undefined
      ? initialData.def.durMult
      : 1.0
  );
  const [semVolOffset, setSemVolOffset] = useState(
    initialData?.type === 'semantic' && initialData.def?.volOffset !== undefined
      ? initialData.def.volOffset
      : 0
  );
  const [semDesc, setSemDesc] = useState(
    initialData?.def?.desc || 'Base aesthetic meaning for attention & warning'
  );

  const parsedSemDegrees = semDegreesStr
    .split(',')
    .map(n => parseInt(n.trim()))
    .filter(n => !isNaN(n));
  const validSemDegrees = parsedSemDegrees.length > 0 ? parsedSemDegrees : [0];

  const semResolvedNotes = resolveNotes(brand.scale, validSemDegrees);
  const semFreqStr = semResolvedNotes.map(n => `${Math.round(n.freq)}Hz (${n.note})`).join(' → ') || '440Hz';
  const semDurMs = Math.round(brand.decayUnit * semDurMult * 1000);
  const semTotalVol = brand.volumeBase + semVolOffset;

  const DEGREE_PRESETS = [
    { label: 'Unison [0]', degrees: '0' },
    { label: 'Minor 3rd [0, 2]', degrees: '0, 2' },
    { label: 'Major Triad [1, 3, 5]', degrees: '1, 3, 5' },
    { label: 'Fifth Chime [0, 4]', degrees: '0, 4' },
    { label: 'Downstep [-1]', degrees: '-1' },
    { label: 'Quad [1, 2, 3, 4]', degrees: '1, 2, 3, 4' },
    { label: 'Cluster [0, 1, 2, 4]', degrees: '0, 1, 2, 4' }
  ];

  const handlePlaySemanticPreview = async () => {
    await audioEngine.init();
    setIsPlayingPreview(true);
    await audioEngine.previewSemantic(
      'preview-sem-create',
      {
        degrees: validSemDegrees,
        durMult: semDurMult,
        volOffset: semVolOffset
      },
      brand
    );
    setTimeout(() => {
      setIsPlayingPreview(false);
    }, Math.max(300, semDurMs + 200));
  };

  const handleSaveSemantic = () => {
    const cleanedKey = semKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanedKey) return;
    onAddSemantic(cleanedKey, {
      degrees: validSemDegrees,
      durMult: semDurMult,
      volOffset: semVolOffset,
      desc: semDesc
    });
    setSuccessToast(`Semantic token "${cleanedKey}" added to system!`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  return (
    <div className={`flex flex-col bg-app-bg text-app-text ${
      isFullView 
        ? 'flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full' 
        : 'absolute top-0 right-0 w-[380px] h-full bg-app-surface border-l border-app-border z-50 animate-in slide-in-from-right shadow-2xl overflow-y-auto'
    }`}>
      {/* Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between pb-6 border-b border-app-border mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PlusCircle size={20} className="text-app-accent" />
            <h2 className="text-base font-bold text-app-text tracking-wide uppercase">
              {initialData ? 'Edit Token' : 'Create Token'}
            </h2>
            <span className="text-[10px] bg-app-accent/15 text-app-accent px-2 py-0.5 rounded font-mono font-medium">
              Sonic Token Studio
            </span>
          </div>
          <p className="text-xs text-app-text-muted">
            Create either a <strong>Component Token</strong> (specific UI interaction) or a <strong>Semantic Token</strong> (reusable acoustic meaning).
          </p>
        </div>

        {onClose && (
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-lg border border-app-border flex items-center justify-center text-app-text-muted hover:text-app-text hover:bg-app-surface-light transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* MODE SELECTOR PILL TABS */}
      <div className="bg-app-surface border border-app-border p-1.5 rounded-xl flex gap-1 mb-6 max-w-md">
        <button
          type="button"
          onClick={() => setTokenType('component')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
            tokenType === 'component'
              ? 'bg-app-accent text-white shadow-md'
              : 'text-app-text-muted hover:text-app-text'
          }`}
        >
          <Layers size={14} />
          <span>Component Token</span>
        </button>

        <button
          type="button"
          onClick={() => setTokenType('semantic')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
            tokenType === 'semantic'
              ? 'bg-app-accent text-white shadow-md'
              : 'text-app-text-muted hover:text-app-text'
          }`}
        >
          <Sparkles size={14} />
          <span>Semantic Token</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 1. COMPONENT TOKEN FORM                                             */}
      {/* =================================================================== */}
      {tokenType === 'component' ? (
        <div className="space-y-6">
          <div className="bg-app-surface border border-app-border rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-app-border pb-3">
              <Layers size={16} className="text-app-accent" />
              <h3 className="text-xs uppercase font-bold tracking-wider text-app-text">
                Component Token Configuration
              </h3>
            </div>

            {/* Token Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                Token Name (Identifier)
              </label>
              <input 
                type="text" 
                value={compName} 
                onChange={e => setCompName(e.target.value)} 
                placeholder="e.g. ui.button.confirm or climate.fan.on"
                className="w-full bg-app-bg border border-app-border p-2.5 text-xs font-mono rounded-lg text-app-text outline-none focus:border-app-accent transition-colors"
              />
              <span className="text-[10px] text-app-text-muted">
                Dot notation convention: <code>[system].[element].[state]</code>
              </span>
            </div>

            {/* Semantic Base */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                Semantic Base (Inherited Meaning)
              </label>
              <select 
                value={compSemantic} 
                onChange={e => setCompSemantic(e.target.value)} 
                className="w-full bg-app-bg border border-app-border p-2.5 text-xs rounded-lg text-app-text outline-none focus:border-app-accent font-medium"
              >
                {Object.keys(semanticDefs).map(k => {
                  const def = semanticDefs[k];
                  return (
                    <option key={k} value={k}>
                      {k} — degrees: [{def.degrees.join(', ')}], dur: {def.durMult}x, vol: {def.volOffset > 0 ? `+${def.volOffset}` : def.volOffset}dB
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interaction Type (Taxonomy) */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                  Interaction Taxonomy
                </label>
                <select 
                  value={compInteraction} 
                  onChange={e => setCompInteraction(e.target.value as InteractionType)} 
                  className="w-full bg-app-bg border border-app-border p-2.5 text-xs rounded-lg text-app-text outline-none focus:border-app-accent font-medium"
                >
                  {Object.keys(INTERACTION_GROUPS).map(k => (
                    <option key={k} value={k}>
                      {k} ({INTERACTION_GROUPS[k as InteractionType].desc})
                    </option>
                  ))}
                </select>
              </div>

              {/* DLS Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                  DLS Category
                </label>
                <select 
                  value={compSection} 
                  onChange={e => setCompSection(e.target.value)} 
                  className="w-full bg-app-bg border border-app-border p-2.5 text-xs rounded-lg text-app-text outline-none focus:border-app-accent"
                >
                  {['UI Interactions', 'Navigation', 'Alerts', 'Voice Assistant', 'Media & Comms', 'Custom'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pattern Presets */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                Playback Pattern
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Single', 'Arpeggio', 'Pulse', 'Rise', 'Custom'] as const).map(p => (
                  <button 
                    key={p} 
                    type="button"
                    onClick={() => setCompPattern(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      compPattern === p 
                        ? 'bg-app-accent border-app-accent text-white shadow-xs' 
                        : 'border-app-border bg-app-surface-light text-app-text-muted hover:text-app-text hover:border-app-text'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {compPattern === 'Custom' && (
                <input 
                  type="text" 
                  value={compCustomArpStr} 
                  onChange={e => setCompCustomArpStr(e.target.value)} 
                  placeholder="Scale degrees, e.g. 0, 2, 4"
                  className="w-full bg-app-bg border border-app-border p-2 text-xs font-mono rounded text-app-text outline-none focus:border-app-accent mt-2"
                />
              )}
            </div>

            {/* Sliders: Duration Mult & Volume Offset */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5 bg-app-surface-light p-3 rounded-lg border border-app-border">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold">
                    Duration Multiplier
                  </span>
                  <span className="text-xs text-app-accent font-mono font-bold">
                    {compDurMult.toFixed(1)}x ({compDurMs}ms)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.4" 
                  max="4.0" 
                  step="0.1" 
                  value={compDurMult} 
                  onChange={e => setCompDurMult(parseFloat(e.target.value))} 
                  className="w-full accent-app-accent"
                />
              </div>

              <div className="space-y-1.5 bg-app-surface-light p-3 rounded-lg border border-app-border">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold">
                    Volume Offset
                  </span>
                  <span className="text-xs text-app-accent font-mono font-bold">
                    {compVolOffset > 0 ? `+${compVolOffset}` : compVolOffset}dB ({compTotalVol}dB total)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-12" 
                  max="6" 
                  step="1" 
                  value={compVolOffset} 
                  onChange={e => setCompVolOffset(parseInt(e.target.value))} 
                  className="w-full accent-app-accent"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                Documentation / Semantic Intent
              </label>
              <input 
                type="text" 
                value={compDesc} 
                onChange={e => setCompDesc(e.target.value)} 
                placeholder="Brief explanation of when this sound triggers..."
                className="w-full bg-app-bg border border-app-border p-2.5 text-xs rounded-lg text-app-text outline-none focus:border-app-accent"
              />
            </div>
          </div>

          {/* LIVE PREVIEW & AUDITION BAR */}
          <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-app-accent" />
                <h4 className="text-xs uppercase font-bold tracking-wider text-app-text">
                  Resolved Synthesis Preview
                </h4>
              </div>
              <span className="text-[10px] font-mono text-app-text-muted">
                Scale: {brand.scale}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-app-surface-light p-3 rounded-lg border border-app-border">
                <span className="text-[10px] uppercase tracking-widest text-app-text-muted block mb-1">Frequency</span>
                <span className="text-xs font-mono font-bold text-app-text truncate block" title={compFreqStr}>
                  {compFreqStr}
                </span>
              </div>
              <div className="bg-app-surface-light p-3 rounded-lg border border-app-border">
                <span className="text-[10px] uppercase tracking-widest text-app-text-muted block mb-1">Duration</span>
                <span className="text-xs font-mono font-bold text-app-accent block">
                  {compDurMs} ms
                </span>
              </div>
              <div className="bg-app-surface-light p-3 rounded-lg border border-app-border">
                <span className="text-[10px] uppercase tracking-widest text-app-text-muted block mb-1">Volume</span>
                <span className="text-xs font-mono font-bold text-app-text block">
                  {compTotalVol} dB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                type="button"
                onClick={handlePlayComponentPreview}
                className="flex-1 bg-app-accent hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <Play size={14} className={isPlayingPreview ? 'fill-current animate-bounce' : ''} />
                <span>{isPlayingPreview ? 'Auditioning...' : 'Play Preview'}</span>
              </button>

              <button 
                type="button"
                onClick={handleSaveComponent}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <Check size={14} />
                <span>{initialData ? 'Update Component' : 'Add Component Token'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* 2. SEMANTIC TOKEN FORM                                              */
        /* =================================================================== */
        <div className="space-y-6">
          <div className="bg-app-surface border border-app-border rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-app-border pb-3">
              <Sparkles size={16} className="text-app-accent" />
              <h3 className="text-xs uppercase font-bold tracking-wider text-app-text">
                Semantic Token Configuration
              </h3>
            </div>

            <div className="bg-app-surface-light border border-app-border/80 rounded-lg p-3 text-xs text-app-text-muted leading-relaxed flex items-start gap-2.5">
              <Info size={16} className="text-app-accent shrink-0 mt-0.5" />
              <span>
                Semantic tokens establish reusable brand meanings (e.g. <em>neutral</em>, <em>warning</em>, <em>sparkle</em>). Multiple component tokens can inherit from a single semantic base.
              </span>
            </div>

            {/* Semantic Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                Semantic Key Name
              </label>
              <input 
                type="text" 
                value={semKey} 
                onChange={e => setSemKey(e.target.value)} 
                placeholder="e.g. warning_soft, prompt, celebration"
                className="w-full bg-app-bg border border-app-border p-2.5 text-xs font-mono rounded-lg text-app-text outline-none focus:border-app-accent"
              />
              <span className="text-[10px] text-app-text-muted">
                Lowercase letters and underscores (e.g. <code>affirmation_light</code>)
              </span>
            </div>

            {/* Scale Degrees */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                  Scale Degrees (Steps on {brand.scale})
                </label>
                <span className="text-xs font-mono text-app-accent font-semibold">
                  [{validSemDegrees.join(', ')}]
                </span>
              </div>
              <input 
                type="text" 
                value={semDegreesStr} 
                onChange={e => setSemDegreesStr(e.target.value)} 
                placeholder="e.g. 0, 2 or 1, 3, 5"
                className="w-full bg-app-bg border border-app-border p-2.5 text-xs font-mono rounded-lg text-app-text outline-none focus:border-app-accent"
              />
              
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DEGREE_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSemDegreesStr(preset.degrees)}
                    className="text-[10px] px-2.5 py-1 rounded bg-app-surface-light border border-app-border text-app-text-muted hover:text-app-text hover:border-app-accent transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Duration Mult & Vol Offset */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5 bg-app-surface-light p-3 rounded-lg border border-app-border">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold">
                    Duration Multiplier
                  </span>
                  <span className="text-xs text-app-accent font-mono font-bold">
                    {semDurMult.toFixed(1)}x ({semDurMs}ms)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.2" 
                  max="3.0" 
                  step="0.1" 
                  value={semDurMult} 
                  onChange={e => setSemDurMult(parseFloat(e.target.value))} 
                  className="w-full accent-app-accent"
                />
              </div>

              <div className="space-y-1.5 bg-app-surface-light p-3 rounded-lg border border-app-border">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold">
                    Volume Offset
                  </span>
                  <span className="text-xs text-app-accent font-mono font-bold">
                    {semVolOffset > 0 ? `+${semVolOffset}` : semVolOffset}dB ({semTotalVol}dB total)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-16" 
                  max="6" 
                  step="1" 
                  value={semVolOffset} 
                  onChange={e => setSemVolOffset(parseInt(e.target.value))} 
                  className="w-full accent-app-accent"
                />
              </div>
            </div>

            {/* Semantic Meaning / Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-app-text-muted font-bold block">
                Semantic Meaning / Description
              </label>
              <input 
                type="text" 
                value={semDesc} 
                onChange={e => setSemDesc(e.target.value)} 
                placeholder="What emotional or structural role does this meaning convey?"
                className="w-full bg-app-bg border border-app-border p-2.5 text-xs rounded-lg text-app-text outline-none focus:border-app-accent"
              />
            </div>
          </div>

          {/* LIVE PREVIEW & AUDITION BAR */}
          <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-app-accent" />
                <h4 className="text-xs uppercase font-bold tracking-wider text-app-text">
                  Semantic Synthesis Preview
                </h4>
              </div>
              <span className="text-[10px] font-mono text-app-text-muted">
                Scale: {brand.scale}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-app-surface-light p-3 rounded-lg border border-app-border">
                <span className="text-[10px] uppercase tracking-widest text-app-text-muted block mb-1">Pitches</span>
                <span className="text-xs font-mono font-bold text-app-text truncate block" title={semFreqStr}>
                  {semFreqStr}
                </span>
              </div>
              <div className="bg-app-surface-light p-3 rounded-lg border border-app-border">
                <span className="text-[10px] uppercase tracking-widest text-app-text-muted block mb-1">Duration</span>
                <span className="text-xs font-mono font-bold text-app-accent block">
                  {semDurMs} ms
                </span>
              </div>
              <div className="bg-app-surface-light p-3 rounded-lg border border-app-border">
                <span className="text-[10px] uppercase tracking-widest text-app-text-muted block mb-1">Volume</span>
                <span className="text-xs font-mono font-bold text-app-text block">
                  {semTotalVol} dB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                type="button"
                onClick={handlePlaySemanticPreview}
                className="flex-1 bg-app-accent hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <Play size={14} className={isPlayingPreview ? 'fill-current animate-bounce' : ''} />
                <span>{isPlayingPreview ? 'Auditioning...' : 'Play Preview'}</span>
              </button>

              <button 
                type="button"
                onClick={handleSaveSemantic}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <Check size={14} />
                <span>Add Semantic Token</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
