import React, { useState } from 'react';
import { BrandTokens, audioEngine } from '../lib/audio';
import {
  Play,
  Square,
  Check,
  Sparkles,
  X,
  Search,
  CheckCircle2
} from 'lucide-react';
import {
  SonicPreset,
  SONIC_PRESETS,
  FILTER_CATEGORIES,
  PresetIllustration,
  applySonicPresetTheme
} from '../data/sonicPresets';

// Re-export types and presets for consumers
export type { SonicPreset };
export { SONIC_PRESETS, FILTER_CATEGORIES, applySonicPresetTheme };

export interface SonicPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBrand: BrandTokens;
  currentSemantics?: Record<string, { degrees: number[]; durMult: number; volOffset: number; desc?: string }>;
  onApplyPreset: (preset: SonicPreset) => void;
}

export function SonicPresetsModal({
  isOpen,
  onClose,
  currentBrand,
  onApplyPreset
}: SonicPresetsModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    return localStorage.getItem('sonic_dls_active_preset') || 'organic';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [auditioningPresetId, setAuditioningPresetId] = useState<string | null>(null);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  if (!isOpen) return null;

  // Audition signature motif
  const handleAudition = async (e: React.MouseEvent, preset: SonicPreset) => {
    e.stopPropagation();

    if (auditioningPresetId === preset.id) {
      audioEngine.stop('preset-audition');
      setAuditioningPresetId(null);
      return;
    }

    await audioEngine.init();
    setAuditioningPresetId(preset.id);

    // Synthesize signature motif for the preset
    const degrees = preset.auditionDegrees || [0, 2, 4];
    await audioEngine.previewSemantic(
      'preset-audition',
      {
        degrees,
        durMult: 1.15,
        volOffset: 0
      },
      preset.primitive
    );

    const dur = Math.round(preset.primitive.decayUnit * 1.15 * 1000 * degrees.length);
    setTimeout(() => {
      setAuditioningPresetId(prev => (prev === preset.id ? null : prev));
    }, Math.max(500, dur + 250));
  };

  const handleSelectAndApply = (preset: SonicPreset) => {
    setSelectedPresetId(preset.id);
    localStorage.setItem('sonic_dls_active_preset', preset.id);
    applySonicPresetTheme(preset);
    onApplyPreset(preset);
    setAppliedToast(`Applied "${preset.name}" preset & palette across System!`);
    setTimeout(() => {
      setAppliedToast(null);
    }, 2500);
  };

  // Filter presets by search and active category filter
  const filteredPresets = SONIC_PRESETS.filter(preset => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      preset.name.toLowerCase().includes(q) ||
      preset.industry.toLowerCase().includes(q) ||
      preset.filter.toLowerCase().includes(q) ||
      preset.emotion.toLowerCase().includes(q) ||
      preset.tagline.toLowerCase().includes(q) ||
      preset.characteristics.some(c => c.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeCategory === 'all') return true;
    return preset.filter === activeCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Toast Notification */}
      {appliedToast && (
        <div className="fixed top-8 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-4">
          <CheckCircle2 size={16} />
          <span>{appliedToast}</span>
        </div>
      )}

      {/* Main Modal Container */}
      <div className="w-full max-w-7xl max-h-[92vh] bg-app-surface border border-app-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-6 md:px-8 md:py-6 border-b border-app-border shrink-0 bg-app-surface/95 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-app-accent/15 border border-app-accent/25 flex items-center justify-center text-app-accent shadow-xs">
                <Sparkles size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-app-text tracking-tight">
                    Sonic Character Presets
                  </h2>
                  <span className="text-xs uppercase px-3 py-0.5 rounded-full bg-app-accent/10 border border-app-accent/20 text-app-accent font-mono font-medium">
                    {SONIC_PRESETS.length} Archetypes
                  </span>
                </div>
                <p className="text-xs text-app-text-muted mt-1">
                  Brand primitive archetypes with dedicated acoustic tuning, emotional resonance, and calibrated design system semantics.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search character, industry, emotion..."
                className="w-full bg-app-bg border border-app-border pl-9 pr-3.5 py-2 text-xs rounded-xl text-app-text outline-none focus:border-app-accent transition-all font-medium"
              />
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-app-border flex items-center justify-center text-app-text-muted hover:text-app-text hover:bg-app-surface-light transition-colors shrink-0"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="px-6 md:px-8 py-3 border-b border-app-border bg-app-surface-light/40 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-xs font-medium text-app-text-muted uppercase tracking-wider mr-1 shrink-0">
            Filter:
          </span>
          {FILTER_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                activeCategory === cat.id
                  ? 'bg-app-surface text-app-text border-app-border shadow-xs font-semibold ring-1 ring-app-accent/20'
                  : 'border-transparent text-app-text-muted hover:text-app-text hover:bg-app-surface/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Presets Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-app-bg">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredPresets.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              const isAuditioning = auditioningPresetId === preset.id;

              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectAndApply(preset)}
                  className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden group shadow-xs hover:shadow-lg min-h-[310px] ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md'
                      : 'border-app-border hover:border-app-text-muted/60'
                  }`}
                  style={{ backgroundColor: preset.cardBg }}
                >
                  {/* Selected checkmark indicator */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  )}

                  {/* Top Artwork Area with SVG viewBox="0 0 200 120" */}
                  <div className="relative w-full h-32 overflow-hidden rounded-t-2xl border-b border-black/5">
                    {/* Number Badge (01, 02, etc.) */}
                    <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/60 backdrop-blur-xs text-[10px] font-mono font-medium text-slate-900 dark:text-slate-100 shadow-2xs">
                      {preset.num}
                    </div>

                    {/* Bespoke Archetype Artwork Render */}
                    <PresetIllustration preset={preset} />
                  </div>

                  {/* Card Content & Metadata */}
                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div className="space-y-1">
                      {/* Title */}
                      <h3
                        className="text-base font-bold tracking-tight"
                        style={{ color: preset.textColor }}
                      >
                        {preset.name}
                      </h3>

                      {/* Industry & Emotion badges */}
                      <div className="pt-0.5 space-y-1">
                        <span
                          className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-black/10 dark:bg-white/10 backdrop-blur-xs truncate max-w-full"
                          style={{ color: preset.textColor }}
                        >
                          {preset.industry}
                        </span>
                        <p
                          className="text-[11px] font-normal leading-snug line-clamp-2 opacity-85"
                          style={{ color: preset.textColor }}
                        >
                          {preset.emotion}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Area: Acoustic Characteristics & Round Audition Play Button */}
                    <div className="pt-3 mt-auto flex items-end justify-between gap-2 border-t border-black/10 dark:border-white/10">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="text-[10px] font-mono font-medium opacity-80"
                          style={{ color: preset.textColor }}
                        >
                          {preset.primitive.scale.split(' ')[0]} {preset.primitive.timbre}
                        </span>
                        <span
                          className="text-[9px] font-mono opacity-70"
                          style={{ color: preset.textColor }}
                        >
                          {(preset.primitive.decayUnit * 1000).toFixed(0)}ms • {preset.primitive.volumeBase}dB
                        </span>
                      </div>

                      {/* Round Audition Button */}
                      <button
                        type="button"
                        onClick={(e) => handleAudition(e, preset)}
                        title={`Audition ${preset.name}`}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0 ${
                          isAuditioning ? 'ring-2 ring-emerald-500 scale-105 animate-pulse' : 'hover:scale-105'
                        }`}
                        style={{
                          backgroundColor: preset.playBtnBg,
                          color: preset.playBtnIcon
                        }}
                      >
                        {isAuditioning ? (
                          <Square size={13} className="fill-current" />
                        ) : (
                          <Play size={13} className="fill-current translate-x-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with summary and active preset info */}
        <div className="p-4 md:px-8 border-t border-app-border bg-app-surface flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-app-text-muted">Current Active Sonic Character:</span>
            <span className="text-xs font-bold text-app-accent bg-app-accent/10 px-2.5 py-0.5 rounded-full border border-app-accent/20">
              {SONIC_PRESETS.find(p => p.id === selectedPresetId)?.name || 'ORGANIC'} ({SONIC_PRESETS.find(p => p.id === selectedPresetId)?.industry || 'Cleantech, Sustainability & Ecology'})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-app-text-muted hidden sm:inline">
              Click any card to apply • Click circular icon to audition
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
