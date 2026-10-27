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
  Square,
  Sparkles,
  Layers,
  Check,
  Volume2,
  Sliders,
  PlusCircle,
  Info,
  Clock,
  Gauge,
  X,
  Music,
  ArrowRight,
  Activity,
  Tag
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

  // Playback state
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
  const compDurMs = Math.round(brand.decayUnit * (currentSemDef.durMult || 1.0) * compDurMult * 1000);
  const compTotalVol = brand.volumeBase + (currentSemDef.volOffset || 0) + compVolOffset;

  const handlePlayComponentPreview = async () => {
    if (isPlayingPreview) {
      audioEngine.stop('preview-comp-create');
      setIsPlayingPreview(false);
      return;
    }
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
    }, Math.max(350, compDurMs + 250));
  };

  const handleSaveComponent = () => {
    const cleanedName = compName.trim();
    if (!cleanedName) return;
    onAddComponent(
      cleanedName,
      {
        semantic: compSemantic,
        category: compSection,
        interaction: compInteraction,
        desc: compDesc,
        overrides: Object.keys(compOverrides).length > 0 ? compOverrides : undefined
      },
      initialData?.type === 'component' ? initialData.name : undefined
    );
    setSuccessToast(`Component token "${cleanedName}" saved!`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // ---------------------------------------------------------------------------
  // SEMANTIC TOKEN STATE
  // ---------------------------------------------------------------------------
  const [semKey, setSemKey] = useState(
    initialData?.type === 'semantic' ? initialData.name : 'affirmation'
  );
  const [semDegreesStr, setSemDegreesStr] = useState(
    initialData?.type === 'semantic' && initialData.def?.degrees
      ? initialData.def.degrees.join(', ')
      : '1, 3, 5'
  );
  const [semDurMult, setSemDurMult] = useState(
    initialData?.type === 'semantic' ? initialData.def?.durMult || 1.0 : 1.0
  );
  const [semVolOffset, setSemVolOffset] = useState(
    initialData?.type === 'semantic' ? initialData.def?.volOffset || 0 : 0
  );
  const [semDesc, setSemDesc] = useState(
    initialData?.type === 'semantic' ? initialData.def?.desc || '' : 'Positive user action confirmation chime'
  );

  const parsedSemDegrees = semDegreesStr
    .split(',')
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n));
  const validSemDegrees = parsedSemDegrees.length > 0 ? parsedSemDegrees : [0];

  const semResolvedNotes = resolveNotes(brand.scale, validSemDegrees);
  const semDurMs = Math.round(brand.decayUnit * semDurMult * 1000);
  const semTotalVol = brand.volumeBase + semVolOffset;

  const DEGREE_PRESETS = [
    { label: 'Unison [0]', degrees: '0' },
    { label: 'Minor 3rd [0, 2]', degrees: '0, 2' },
    { label: 'Major Triad [1, 3, 5]', degrees: '1, 3, 5' },
    { label: 'Fifth Chime [0, 4]', degrees: '0, 4' },
    { label: 'Downstep [-1]', degrees: '-1' },
    { label: 'Ascend [1, 2, 3]', degrees: '1, 2, 3' },
    { label: 'Cluster [0, 1, 2]', degrees: '0, 1, 2' }
  ];

  const handlePlaySemanticPreview = async () => {
    if (isPlayingPreview) {
      audioEngine.stop('semantic.preview-sem-create');
      setIsPlayingPreview(false);
      return;
    }
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
    }, Math.max(350, semDurMs + 250));
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

  const NAME_PREFIXES = ['ui.', 'button.', 'nav.', 'modal.', 'alert.', 'input.', 'switch.', 'audio.'];

  // ---------------------------------------------------------------------------
  // MAIN PANEL RENDERER
  // ---------------------------------------------------------------------------
  const panelContent = (
    <div className="flex flex-col h-full bg-app-surface text-app-text">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-8 z-50 bg-emerald-600 text-white px-3.5 py-2 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check size={14} />
          <span>{successToast}</span>
        </div>
      )}

      {/* TOP HEADER - Spacious & Clean */}
      <div className="px-6 md:px-8 py-4.5 border-b border-app-border shrink-0 bg-app-surface/90 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-app-accent/15 border border-app-accent/25 flex items-center justify-center text-app-accent shrink-0 shadow-2xs">
            <PlusCircle size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-semibold text-app-text tracking-tight">
                {initialData ? `Edit ${initialData.type === 'component' ? 'Component' : 'Semantic'} Token` : 'Create Sonic Token'}
              </h2>
              <span className="text-xs uppercase px-2 py-0.2 rounded-md bg-app-surface-light border border-app-border font-mono font-medium text-app-text-muted">
                Studio
              </span>
            </div>
            <p className="text-xs text-app-text-muted mt-0.5 font-normal">
              Define interactive acoustic components or core semantic foundation tokens.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8.5 h-8.5 rounded-md border border-app-border flex items-center justify-center text-app-text-muted hover:text-app-text hover:bg-app-surface-light transition-colors shrink-0"
            title="Close panel"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* MODE SELECTOR PILL TABS */}
      <div className="px-6 md:px-8 pt-4 pb-1 shrink-0">
        <div className="bg-app-surface-light border border-app-border p-1 rounded-md flex gap-1 max-w-sm">
          <button
            type="button"
            onClick={() => setTokenType('component')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              tokenType === 'component'
                ? 'bg-app-surface text-app-text shadow-2xs border border-app-border/70 font-semibold'
                : 'text-app-text-muted hover:text-app-text'
            }`}
          >
            <Layers size={14} className={tokenType === 'component' ? 'text-app-accent' : ''} />
            <span>Component Token</span>
          </button>

          <button
            type="button"
            onClick={() => setTokenType('semantic')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              tokenType === 'semantic'
                ? 'bg-app-surface text-app-text shadow-2xs border border-app-border/70 font-semibold'
                : 'text-app-text-muted hover:text-app-text'
            }`}
          >
            <Sparkles size={14} className={tokenType === 'semantic' ? 'text-app-accent' : ''} />
            <span>Semantic Token</span>
          </button>
        </div>
      </div>

      {/* SCROLLABLE FORM BODY */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-4.5 space-y-5">
        {tokenType === 'component' ? (
          /* =================================================================== */
          /* 1. COMPONENT TOKEN FORM                                             */
          /* =================================================================== */
          <div className="space-y-5">
            {/* Card 1: Identification & Taxonomy */}
            <div className="bg-app-surface-light/40 border border-app-border rounded-lg p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-app-text border-b border-app-border/70 pb-2.5">
                <Tag size={14} className="text-app-accent" />
                <span>Identity & Taxonomy</span>
              </div>

              {/* Token Name with quick prefixes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-app-text">
                    Token Identifier
                  </label>
                  <span className="text-[11px] text-app-text-muted font-mono">
                    convention: system.element.state
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={compName}
                    onChange={e => setCompName(e.target.value)}
                    placeholder="e.g. ui.button.confirm or nav.tab.switch"
                    className="w-full bg-app-bg border border-app-border px-3.5 py-2 text-xs font-mono font-medium rounded-md text-app-text outline-none focus:border-app-accent transition-all shadow-inner"
                  />
                </div>
                {/* Prefix chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-app-text-muted font-medium mr-1">Prefixes:</span>
                  {NAME_PREFIXES.map(pref => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => {
                        if (!compName.startsWith(pref)) {
                          const rest = compName.replace(/^[a-z]+\./i, '');
                          setCompName(`${pref}${rest}`);
                        }
                      }}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-app-surface border border-app-border text-app-text-muted hover:text-app-text hover:border-app-accent transition-colors font-normal"
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-Column Selects: Category and Taxonomy with generous spacing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-app-text block">
                    DLS Category
                  </label>
                  <select
                    value={compSection}
                    onChange={e => setCompSection(e.target.value)}
                    className="w-full bg-app-bg border border-app-border px-3 py-2 text-xs rounded-md text-app-text outline-none focus:border-app-accent transition-colors font-normal cursor-pointer"
                  >
                    {['UI Interactions', 'Navigation', 'Alerts', 'Voice Assistant', 'Media & Comms', 'Custom'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-app-text block">
                    Interaction Taxonomy
                  </label>
                  <select
                    value={compInteraction}
                    onChange={e => setCompInteraction(e.target.value as InteractionType)}
                    className="w-full bg-app-bg border border-app-border px-3 py-2 text-xs rounded-md text-app-text outline-none focus:border-app-accent transition-colors font-normal cursor-pointer"
                  >
                    {Object.keys(INTERACTION_GROUPS).map(k => (
                      <option key={k} value={k}>
                        {k} ({INTERACTION_GROUPS[k as InteractionType].desc})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 pt-0.5">
                <label className="text-xs font-medium text-app-text block">
                  Documentation / Interaction Meaning
                </label>
                <input
                  type="text"
                  value={compDesc}
                  onChange={e => setCompDesc(e.target.value)}
                  placeholder="Describes UX condition (e.g. Triggered when primary CTA button is pressed)"
                  className="w-full bg-app-bg border border-app-border px-3.5 py-2 text-xs rounded-md text-app-text outline-none focus:border-app-accent transition-all font-normal"
                />
              </div>
            </div>

            {/* Card 2: Acoustic DNA & Pattern */}
            <div className="bg-app-surface-light/40 border border-app-border rounded-lg p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-app-text border-b border-app-border/70 pb-2.5">
                <Music size={14} className="text-app-accent" />
                <span>Acoustic Meaning & Pattern</span>
              </div>

              {/* Semantic Base Selection with visual info card */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-app-text block">
                  Inherited Semantic Base
                </label>
                <select
                  value={compSemantic}
                  onChange={e => setCompSemantic(e.target.value)}
                  className="w-full bg-app-bg border border-app-border px-3.5 py-2 text-xs rounded-md text-app-text outline-none focus:border-app-accent font-normal cursor-pointer"
                >
                  {Object.keys(semanticDefs).map(k => {
                    const def = semanticDefs[k];
                    return (
                      <option key={k} value={k}>
                        {k} — notes: [{def.degrees.join(', ')}], dur: {def.durMult}x, vol: {def.volOffset > 0 ? `+${def.volOffset}` : def.volOffset}dB
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-app-text-muted leading-relaxed font-normal">
                  Component tokens inherit their core harmonic identity from the selected semantic token, ensuring brand-wide coherence.
                </p>
              </div>

              {/* Playback Pattern Pills */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-app-text block">
                  Playback Pattern Overrides
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['Single', 'Arpeggio', 'Pulse', 'Rise', 'Custom'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCompPattern(p)}
                      className={`py-2 px-2.5 rounded-md text-xs font-medium transition-all border text-center ${
                        compPattern === p
                          ? 'bg-app-accent border-app-accent text-white shadow-2xs font-semibold'
                          : 'border-app-border bg-app-surface text-app-text-muted hover:text-app-text hover:bg-app-surface-light'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {compPattern === 'Custom' && (
                  <div className="pt-1.5">
                    <input
                      type="text"
                      value={compCustomArpStr}
                      onChange={e => setCompCustomArpStr(e.target.value)}
                      placeholder="Custom scale degrees, e.g. 0, 2, 4"
                      className="w-full bg-app-bg border border-app-border px-3.5 py-2 text-xs font-mono rounded-md text-app-text outline-none focus:border-app-accent"
                    />
                    <span className="text-[11px] text-app-text-muted mt-1 block font-normal">
                      Enter comma-separated integers representing scale degrees on {brand.scale}.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Micro-Tuning Sliders */}
            <div className="bg-app-surface-light/40 border border-app-border rounded-lg p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-app-text border-b border-app-border/70 pb-2.5">
                <Sliders size={14} className="text-app-accent" />
                <span>Micro-Tuning Overrides</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Duration Slider */}
                <div className="space-y-2 bg-app-surface p-3.5 rounded-md border border-app-border shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-app-text">Duration Multiplier</span>
                    <span className="text-xs text-app-accent font-mono font-medium px-2 py-0.5 rounded-md bg-app-accent/10 border border-app-accent/20">
                      {compDurMult.toFixed(1)}x ({compDurMs}ms)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.0"
                    step="0.1"
                    value={compDurMult}
                    onChange={e => setCompDurMult(parseFloat(e.target.value))}
                    className="w-full accent-app-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-app-text-muted font-mono pt-0.5">
                    <span>Snappy (0.4x)</span>
                    <span>Neutral (1.0x)</span>
                    <span>Sustained (3.0x)</span>
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="space-y-2 bg-app-surface p-3.5 rounded-md border border-app-border shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-app-text">Volume Offset</span>
                    <span className="text-xs text-app-accent font-mono font-medium px-2 py-0.5 rounded-md bg-app-accent/10 border border-app-accent/20">
                      {compVolOffset > 0 ? `+${compVolOffset}` : compVolOffset}dB ({compTotalVol}dB)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="6"
                    step="1"
                    value={compVolOffset}
                    onChange={e => setCompVolOffset(parseInt(e.target.value))}
                    className="w-full accent-app-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-app-text-muted font-mono pt-0.5">
                    <span>Subtle (-12dB)</span>
                    <span>Flat (0dB)</span>
                    <span>Prominent (+6dB)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Resolved Audio Synthesis Preview */}
            <div className="bg-app-surface border border-app-border rounded-lg p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-app-border/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-app-accent" />
                  <h4 className="text-xs uppercase font-semibold tracking-wider text-app-text">
                    Resolved Audio Synthesis
                  </h4>
                </div>
                <span className="text-xs font-mono text-app-text-muted bg-app-surface-light px-2.5 py-0.5 rounded-md border border-app-border font-normal">
                  Scale: {brand.scale}
                </span>
              </div>

              {/* Resolved Notes display */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-medium tracking-wider text-app-text-muted block">
                  Acoustic Notes & Frequencies
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {compResolvedNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-app-surface-light border border-app-border text-xs font-mono font-medium shadow-2xs"
                    >
                      <span className="text-app-accent font-semibold">{note.note}</span>
                      <span className="text-[11px] text-app-text-muted font-normal">({Math.round(note.freq)}Hz)</span>
                      {idx < compResolvedNotes.length - 1 && (
                        <ArrowRight size={11} className="text-app-text-muted/60 ml-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="bg-app-surface-light p-3 rounded-md border border-app-border text-center">
                  <span className="text-[11px] uppercase tracking-wider text-app-text-muted font-medium block mb-0.5">Duration</span>
                  <span className="text-xs font-mono font-medium text-app-text">
                    {compDurMs} ms
                  </span>
                </div>
                <div className="bg-app-surface-light p-3 rounded-md border border-app-border text-center">
                  <span className="text-[11px] uppercase tracking-wider text-app-text-muted font-medium block mb-0.5">Total Vol</span>
                  <span className="text-xs font-mono font-medium text-app-text">
                    {compTotalVol} dB
                  </span>
                </div>
                <div className="bg-app-surface-light p-3 rounded-md border border-app-border text-center">
                  <span className="text-[11px] uppercase tracking-wider text-app-text-muted font-medium block mb-0.5">Timbre</span>
                  <span className="text-xs font-mono font-medium text-app-accent capitalize">
                    {typeof brand.timbre === 'object' ? 'custom' : brand.timbre}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* 2. SEMANTIC TOKEN FORM                                              */
          /* =================================================================== */
          <div className="space-y-5">
            <div className="bg-app-surface-light/40 border border-app-border rounded-lg p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-app-text border-b border-app-border/70 pb-2.5">
                <Sparkles size={14} className="text-app-accent" />
                <span>Semantic Meaning & Harmonics</span>
              </div>

              <div className="bg-app-surface border border-app-border rounded-md p-3.5 text-xs text-app-text-muted leading-relaxed flex items-start gap-2.5 font-normal">
                <Info size={15} className="text-app-accent shrink-0 mt-0.5" />
                <span>
                  Semantic tokens represent universal feedback states (e.g. <em>neutral</em>, <em>warning</em>, <em>positive</em>). Multiple components map back to this sonic anchor.
                </span>
              </div>

              {/* Semantic Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-app-text block">
                  Semantic Key Name
                </label>
                <input
                  type="text"
                  value={semKey}
                  onChange={e => setSemKey(e.target.value)}
                  placeholder="e.g. confirmation, warning_soft, prompt"
                  className="w-full bg-app-bg border border-app-border px-3.5 py-2 text-xs font-mono font-medium rounded-md text-app-text outline-none focus:border-app-accent transition-all shadow-inner"
                />
                <span className="text-[11px] text-app-text-muted block font-normal">
                  Lowercase letters and underscores only (e.g. <code>affirmation_light</code>)
                </span>
              </div>

              {/* Scale Degrees */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-app-text">
                    Scale Degrees on {brand.scale}
                  </label>
                  <span className="text-xs font-mono text-app-accent font-medium px-2 py-0.5 rounded-md bg-app-accent/10 border border-app-accent/20">
                    [{validSemDegrees.join(', ')}]
                  </span>
                </div>
                <input
                  type="text"
                  value={semDegreesStr}
                  onChange={e => setSemDegreesStr(e.target.value)}
                  placeholder="e.g. 0, 2 or 1, 3, 5"
                  className="w-full bg-app-bg border border-app-border px-3.5 py-2 text-xs font-mono rounded-md text-app-text outline-none focus:border-app-accent font-normal"
                />

                {/* Harmonic Presets */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-app-text-muted block">
                    Harmonic Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEGREE_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSemDegreesStr(preset.degrees)}
                        className="text-xs px-2.5 py-1 rounded-md bg-app-surface border border-app-border text-app-text hover:text-app-accent hover:border-app-accent transition-colors shadow-2xs font-normal"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sliders: Duration Mult & Vol Offset */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1.5">
                <div className="space-y-2 bg-app-surface p-3.5 rounded-md border border-app-border shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-app-text">Duration Multiplier</span>
                    <span className="text-xs text-app-accent font-mono font-medium px-2 py-0.5 rounded-md bg-app-accent/10">
                      {semDurMult.toFixed(1)}x ({semDurMs}ms)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.0"
                    step="0.1"
                    value={semDurMult}
                    onChange={e => setSemDurMult(parseFloat(e.target.value))}
                    className="w-full accent-app-accent cursor-pointer"
                  />
                </div>

                <div className="space-y-2 bg-app-surface p-3.5 rounded-md border border-app-border shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-app-text">Volume Offset</span>
                    <span className="text-xs text-app-accent font-mono font-medium px-2 py-0.5 rounded-md bg-app-accent/10">
                      {semVolOffset > 0 ? `+${semVolOffset}` : semVolOffset}dB ({semTotalVol}dB)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="6"
                    step="1"
                    value={semVolOffset}
                    onChange={e => setSemVolOffset(parseInt(e.target.value))}
                    className="w-full accent-app-accent cursor-pointer"
                  />
                </div>
              </div>

              {/* Semantic Description */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-medium text-app-text block">
                  Acoustic Intent Description
                </label>
                <input
                  type="text"
                  value={semDesc}
                  onChange={e => setSemDesc(e.target.value)}
                  placeholder="e.g. Joyful triple-tone celebration chime"
                  className="w-full bg-app-bg border border-app-border px-3.5 py-2 text-xs rounded-md text-app-text outline-none focus:border-app-accent font-normal"
                />
              </div>
            </div>

            {/* Semantic Resolved Notes Preview */}
            <div className="bg-app-surface border border-app-border rounded-lg p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-app-border/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-app-accent" />
                  <h4 className="text-xs uppercase font-semibold tracking-wider text-app-text">
                    Semantic Chime Resonance
                  </h4>
                </div>
                <span className="text-xs font-mono text-app-text-muted font-normal">
                  {semResolvedNotes.length} notes resolved
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {semResolvedNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-app-surface-light border border-app-border text-xs font-mono font-medium shadow-2xs"
                  >
                    <span className="text-app-accent font-semibold">{note.note}</span>
                    <span className="text-[11px] text-app-text-muted font-normal">({Math.round(note.freq)}Hz)</span>
                    {idx < semResolvedNotes.length - 1 && (
                      <ArrowRight size={11} className="text-app-text-muted/60 ml-0.5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="px-6 md:px-8 py-3.5 border-t border-app-border bg-app-surface/95 backdrop-blur-md shrink-0 flex items-center justify-between gap-3">
        {/* Live Audition Button */}
        <button
          type="button"
          onClick={tokenType === 'component' ? handlePlayComponentPreview : handlePlaySemanticPreview}
          className={`px-4 py-2 rounded-md text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-all border shadow-2xs active:scale-95 ${
            isPlayingPreview
              ? 'bg-app-accent border-app-accent text-white ring-2 ring-app-accent/30'
              : 'bg-app-surface-light border-app-border text-app-text hover:bg-app-surface hover:border-app-accent'
          }`}
        >
          {isPlayingPreview ? (
            <>
              <Square size={13} className="fill-current" />
              <span>Stop Audition</span>
            </>
          ) : (
            <>
              <Play size={13} className="fill-current translate-x-0.5" />
              <span>Play Audition</span>
            </>
          )}
        </button>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md text-xs font-medium text-app-text-muted hover:text-app-text transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={tokenType === 'component' ? handleSaveComponent : handleSaveSemantic}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-md text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Check size={14} />
            <span>
              {tokenType === 'component'
                ? (initialData ? 'Update Component' : 'Add Component Token')
                : 'Save Semantic Token'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isFullView) {
    return (
      <div className="flex-1 overflow-y-auto bg-app-bg text-app-text">
        <div className="max-w-4xl mx-auto py-8 px-4 h-full">
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Click backdrop to close */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-label="Close drawer backdrop"
      />
      {/* Spacious right drawer with ample width and elegant shadow */}
      <div className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl h-full bg-app-surface border-l border-app-border shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        {panelContent}
      </div>
    </div>
  );
}
