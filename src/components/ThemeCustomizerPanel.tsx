import React, { useState, useEffect } from 'react';
import { Palette, Check, Sparkles, Copy, RefreshCw, Sliders, ExternalLink, Code, X, Eye, CheckCircle2, Type } from 'lucide-react';

export interface ThemePreset {
  id: string;
  name: string;
  vibe: string;
  description: string;
  badge: string;
  fontName: string;
  fontSans: string;
  fontMono: string;
  primaryColorName: string;
  secondaryColorName: string;
  colors: {
    bg: string;
    surface: string;
    surfaceLight: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;       // Primary
    secondary: string;    // Secondary
    amber: string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'tweakcn-imported',
    name: 'TweakCN Neon Magenta & Violet (Imported)',
    vibe: 'Modern OKLCH Glassmorphic Magenta & Violet',
    description: 'Directly imported from TweakCN: deep dark violet canvas with vibrant electric magenta primary and deep purple-violet accents.',
    badge: 'TweakCN Active',
    fontName: 'Modern System Sans (ui-sans-serif)',
    fontSans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    primaryColorName: 'Electric Magenta (oklch 0.6056 0.2189 292.7172)',
    secondaryColorName: 'Deep Purple Accent (oklch 0.5413 0.2466 293.0090)',
    colors: {
      bg: 'oklch(0.1491 0.0171 284.1290)',
      surface: 'oklch(0.1974 0.0240 283.9877)',
      surfaceLight: 'oklch(0.2429 0.0304 283.9110)',
      border: 'oklch(0.3092 0.0322 284.3630)',
      text: 'oklch(0.9288 0.0126 255.5078)',
      textMuted: 'oklch(0.7107 0.0351 256.7878)',
      accent: 'oklch(0.6056 0.2189 292.7172)',
      secondary: 'oklch(0.5413 0.2466 293.0090)',
      amber: 'oklch(0.7724 0.1728 65.3670)'
    }
  },
  {
    id: 'linear-precision',
    name: 'Linear Precision & Electric Iris',
    vibe: 'Modern Minimal SaaS & Developer Tool',
    description: 'Ultra-clean deep obsidian canvas with crisp violet-iris primary and horizon cyan secondary accents.',
    badge: 'Sleek SaaS',
    fontName: 'Plus Jakarta Sans + JetBrains Mono',
    fontSans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    primaryColorName: 'Electric Iris (#6366F1)',
    secondaryColorName: 'Cyan Mist (#06B6D4)',
    colors: {
      bg: '#090A0F',
      surface: '#11131B',
      surfaceLight: '#181C28',
      border: '#23283B',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      accent: '#6366F1',
      secondary: '#06B6D4',
      amber: '#F59E0B'
    }
  },
  {
    id: 'nordic-minimalist',
    name: '2. Nordic Minimalist & Signal Cobalt',
    vibe: 'Dieter Rams / Scandinavian Modern',
    description: 'High-contrast architectural slate with laser-precise cobalt blue primary and warm solar amber secondary.',
    badge: 'Precision',
    fontName: 'Inter + JetBrains Mono',
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    primaryColorName: 'Signal Cobalt (#2563EB)',
    secondaryColorName: 'Solar Amber (#F59E0B)',
    colors: {
      bg: '#0B0D13',
      surface: '#131722',
      surfaceLight: '#1B2030',
      border: '#262D42',
      text: '#E2E8F0',
      textMuted: '#8C97B0',
      accent: '#2563EB',
      secondary: '#F59E0B',
      amber: '#F59E0B'
    }
  },
  {
    id: 'emerald-studio',
    name: '3. Emerald Studio & Electric Mint',
    vibe: 'High-End DAW & Audio Console',
    description: 'Darkroom audio workstation aesthetic inspired by professional studio hardware and precision peak meters.',
    badge: 'Audio Studio',
    fontName: 'Space Grotesk + JetBrains Mono',
    fontSans: "'Space Grotesk', -apple-system, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    primaryColorName: 'Signal Emerald (#10B981)',
    secondaryColorName: 'Electric Mint (#34D399)',
    colors: {
      bg: '#080A0C',
      surface: '#101419',
      surfaceLight: '#171D25',
      border: '#202935',
      text: '#E6EDF5',
      textMuted: '#7F8FA4',
      accent: '#10B981',
      secondary: '#34D399',
      amber: '#F59E0B'
    }
  },
  {
    id: 'bauhaus-atelier',
    name: '4. Bauhaus Atelier & Royal Ultramarine (Clean Light)',
    vibe: 'Gallery Light / Clean Architectural',
    description: 'Crisp architectural ivory background with deep royal ultramarine cobalt and warm ochre bronze secondary.',
    badge: 'Clean Light',
    fontName: 'DM Sans + JetBrains Mono',
    fontSans: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    primaryColorName: 'Royal Ultramarine (#1D4ED8)',
    secondaryColorName: 'Ochre Bronze (#EA580C)',
    colors: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceLight: '#F1F5F9',
      border: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B',
      accent: '#1D4ED8',
      secondary: '#EA580C',
      amber: '#D97706'
    }
  }
];

export function clearThemeColorOverrides() {
  const root = document.documentElement;
  const props = [
    '--app-bg', '--app-surface', '--app-surface-light', '--app-border',
    '--app-text', '--app-text-muted', '--app-accent', '--app-secondary', '--app-amber',
    '--app-font-sans', '--app-font-mono'
  ];
  props.forEach(p => root.style.removeProperty(p));
  document.body.style.fontFamily = '';
}

export function applyThemeColors(
  colors: ThemePreset['colors'], 
  fonts?: { fontSans?: string; fontMono?: string }
) {
  const root = document.documentElement;
  if (colors.bg) root.style.setProperty('--app-bg', colors.bg);
  if (colors.surface) root.style.setProperty('--app-surface', colors.surface);
  if (colors.surfaceLight) root.style.setProperty('--app-surface-light', colors.surfaceLight);
  if (colors.border) root.style.setProperty('--app-border', colors.border);
  if (colors.text) root.style.setProperty('--app-text', colors.text);
  if (colors.textMuted) root.style.setProperty('--app-text-muted', colors.textMuted);
  if (colors.accent) root.style.setProperty('--app-accent', colors.accent);
  if (colors.secondary) root.style.setProperty('--app-secondary', colors.secondary);
  if (colors.amber) root.style.setProperty('--app-amber', colors.amber);

  if (fonts?.fontSans) {
    root.style.setProperty('--app-font-sans', fonts.fontSans);
    document.body.style.fontFamily = fonts.fontSans;
  }
  if (fonts?.fontMono) {
    root.style.setProperty('--app-font-mono', fonts.fontMono);
  }
}

/**
 * Interactive Modal to quickly preview all suggested themes directly in the app.
 */
export function ThemePreviewModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [activeThemeId, setActiveThemeId] = useState<string>('tweakcn-imported');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sonic_dls_custom_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id) setActiveThemeId(parsed.id);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!isOpen) return null;

  const handleLivePreview = (preset: ThemePreset) => {
    setPreviewingId(preset.id);
    if (preset.id === 'tweakcn-imported') {
      clearThemeColorOverrides();
    } else {
      applyThemeColors(preset.colors, { fontSans: preset.fontSans, fontMono: preset.fontMono });
    }
  };

  const handleExecuteAndSave = (preset: ThemePreset) => {
    setActiveThemeId(preset.id);
    setPreviewingId(null);
    if (preset.id === 'tweakcn-imported') {
      clearThemeColorOverrides();
    } else {
      applyThemeColors(preset.colors, { fontSans: preset.fontSans, fontMono: preset.fontMono });
    }
    try {
      localStorage.setItem('sonic_dls_custom_theme', JSON.stringify({
        id: preset.id,
        colors: preset.colors,
        fontSans: preset.fontSans,
        fontMono: preset.fontMono
      }));
    } catch {
      // ignore
    }
    onClose();
  };

  const handleReset = () => {
    const def = THEME_PRESETS[0]; // TweakCN imported default
    setActiveThemeId(def.id);
    setPreviewingId(null);
    clearThemeColorOverrides();
    try {
      localStorage.removeItem('sonic_dls_custom_theme');
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-app-surface border border-app-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-app-text">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-app-border flex items-center justify-between shrink-0 bg-app-surface-light/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-app-accent/20 text-app-accent flex items-center justify-center border border-app-accent/30">
              <Palette size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-app-text">
                Preview Visual Styling & Themes
              </h2>
              <p className="text-xs text-app-text-muted">
                Test clean, modern themes with primary & secondary colors and modern font styles before executing.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md text-app-text-muted hover:text-app-text hover:bg-app-surface-light transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* LIVE PREVIEW BANNER */}
        {previewingId && (
          <div className="px-6 py-2.5 bg-app-accent/15 border-b border-app-accent/30 flex items-center justify-between shrink-0 text-xs">
            <span className="flex items-center gap-2 font-medium text-app-accent">
              <Eye size={14} className="animate-pulse" />
              Live Preview Active: <strong className="underline">{THEME_PRESETS.find(p => p.id === previewingId)?.name}</strong>
            </span>
            <span className="text-[11px] text-app-text-muted">Click "Execute Theme" on the card to save permanently.</span>
          </div>
        )}

        {/* THEMES GRID */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THEME_PRESETS.map((preset) => {
              const isCurrent = activeThemeId === preset.id;
              const isPreviewing = previewingId === preset.id;

              return (
                <div 
                  key={preset.id}
                  className={`relative flex flex-col p-4 rounded-xl border transition-all ${
                    isPreviewing
                      ? 'border-app-accent shadow-lg ring-2 ring-app-accent/30 bg-app-surface-light'
                      : isCurrent
                      ? 'border-app-accent/70 bg-app-surface-light/60'
                      : 'border-app-border hover:border-app-text/30 bg-app-surface/60 hover:bg-app-surface-light/30'
                  }`}
                  style={{ fontFamily: preset.fontSans }}
                >
                  {/* TOP ROW: Badge + Name */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-app-text">
                          {preset.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-app-border bg-app-surface text-app-text-muted">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-app-accent font-medium">{preset.vibe}</p>
                    </div>

                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold shrink-0">
                        <CheckCircle2 size={13} /> Active
                      </span>
                    )}
                  </div>

                  {/* DESCRIPTION */}
                  <p className="text-xs text-app-text-muted mb-3 leading-relaxed">
                    {preset.description}
                  </p>

                  {/* PALETTE SWATCHES & COLOR DETAILS */}
                  <div className="p-3 rounded-lg border border-app-border/70 bg-app-surface mb-3 space-y-2 text-xs">
                    {/* Primary & Secondary indicators */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs shrink-0" style={{ backgroundColor: preset.colors.accent }} />
                        <div className="truncate">
                          <span className="text-[10px] text-app-text-muted block uppercase">Primary</span>
                          <span className="font-semibold text-app-text">{preset.primaryColorName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs shrink-0" style={{ backgroundColor: preset.colors.secondary }} />
                        <div className="truncate">
                          <span className="text-[10px] text-app-text-muted block uppercase">Secondary</span>
                          <span className="font-semibold text-app-text">{preset.secondaryColorName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Full palette swatch strip */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-app-border/50">
                      <span className="text-[10px] text-app-text-muted font-mono shrink-0 mr-1">Tones:</span>
                      <div className="flex-1 flex h-4 rounded overflow-hidden border border-app-border">
                        <div className="flex-1" style={{ backgroundColor: preset.colors.bg }} title={`Background: ${preset.colors.bg}`} />
                        <div className="flex-1" style={{ backgroundColor: preset.colors.surface }} title={`Surface: ${preset.colors.surface}`} />
                        <div className="flex-1" style={{ backgroundColor: preset.colors.surfaceLight }} title={`Surface Light: ${preset.colors.surfaceLight}`} />
                        <div className="flex-1" style={{ backgroundColor: preset.colors.border }} title={`Border: ${preset.colors.border}`} />
                        <div className="flex-1" style={{ backgroundColor: preset.colors.accent }} title={`Primary Accent: ${preset.colors.accent}`} />
                        <div className="flex-1" style={{ backgroundColor: preset.colors.secondary }} title={`Secondary: ${preset.colors.secondary}`} />
                        <div className="flex-1" style={{ backgroundColor: preset.colors.text }} title={`Text: ${preset.colors.text}`} />
                      </div>
                    </div>

                    {/* Font Style Badge */}
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-app-text-muted">
                      <Type size={12} className="text-app-accent" />
                      <span className="font-medium text-app-text">{preset.fontName}</span>
                    </div>
                  </div>

                  {/* ACTION BUTTONS: Live Preview & Execute */}
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleLivePreview(preset)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        isPreviewing
                          ? 'border-app-accent bg-app-accent/20 text-app-accent'
                          : 'border-app-border hover:border-app-text/40 bg-app-surface text-app-text'
                      }`}
                    >
                      <Eye size={13} />
                      <span>{isPreviewing ? 'Previewing Now' : 'Preview Live'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteAndSave(preset)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-app-accent hover:bg-blue-600 text-white shadow-xs transition-all active:scale-98"
                    >
                      <Check size={13} />
                      <span>Execute Theme</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-app-border bg-app-surface flex items-center justify-between shrink-0 text-xs">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-app-text-muted hover:text-app-text transition-colors"
          >
            <RefreshCw size={12} />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-app-border hover:bg-app-surface-light text-app-text font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Settings Section Theme Customizer Panel
 */
export function ThemeCustomizerPanel() {
  const [selectedThemeId, setSelectedThemeId] = useState<string>('tweakcn-imported');
  const [tweakcnInput, setTweakcnInput] = useState<string>(`@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0.4395 0.0411 280.9890);
  --card: oklch(1.0000 0 0);
  --primary: oklch(0.5547 0.2503 297.0156);
  --secondary: oklch(0.8604 0.0102 267.3488);
  --accent: oklch(0.5767 0.1916 304.0332);
  --border: oklch(0.8110 0.0191 269.0504);
}

.dark {
  --background: oklch(0.1828 0.0204 284.2039);
  --foreground: oklch(0.8787 0.0426 272.2767);
  --card: oklch(0.1828 0.0204 284.2039);
  --primary: oklch(0.7871 0.1187 304.7693);
  --secondary: oklch(0.3240 0.0319 281.9784);
  --accent: oklch(0.8166 0.0910 277.3092);
  --border: oklch(0.4037 0.0320 280.1520);
}`);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Load saved theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sonic_dls_custom_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.colors) {
          applyThemeColors(parsed.colors, { fontSans: parsed.fontSans, fontMono: parsed.fontMono });
          if (parsed.id) setSelectedThemeId(parsed.id);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSelectPreset = (preset: ThemePreset) => {
    setSelectedThemeId(preset.id);
    applyThemeColors(preset.colors, { fontSans: preset.fontSans, fontMono: preset.fontMono });
    try {
      localStorage.setItem('sonic_dls_custom_theme', JSON.stringify({ 
        id: preset.id, 
        colors: preset.colors,
        fontSans: preset.fontSans,
        fontMono: preset.fontMono
      }));
    } catch {
      // ignore
    }
    setParseStatus(`Applied ${preset.name}`);
    setTimeout(() => setParseStatus(null), 3000);
  };

  const handleResetToDefault = () => {
    const def = THEME_PRESETS[0];
    setSelectedThemeId(def.id);
    applyThemeColors(def.colors, { fontSans: def.fontSans, fontMono: def.fontMono });
    try {
      localStorage.removeItem('sonic_dls_custom_theme');
    } catch {
      // ignore
    }
    setParseStatus('Reset to default Sonic DLS style');
    setTimeout(() => setParseStatus(null), 3000);
  };

  const handleParseAndApplyTweakcn = () => {
    if (!tweakcnInput.trim()) {
      setParseStatus('Please paste CSS variables or JSON from tweakcn');
      return;
    }

    try {
      if (tweakcnInput.trim().startsWith('{')) {
        const json = JSON.parse(tweakcnInput);
        const newColors = {
          bg: json.bg || json.background || '#0B0D13',
          surface: json.surface || json.card || '#131722',
          surfaceLight: json.surfaceLight || json.muted || '#1B2030',
          border: json.border || '#262D42',
          text: json.text || json.foreground || '#E2E8F0',
          textMuted: json.textMuted || json.mutedForeground || '#8C97B0',
          accent: json.accent || json.primary || '#2563EB',
          secondary: json.secondary || '#F59E0B',
          amber: json.amber || json.warning || '#F59E0B'
        };
        applyThemeColors(newColors);
        setSelectedThemeId('custom');
        localStorage.setItem('sonic_dls_custom_theme', JSON.stringify({ id: 'custom', colors: newColors }));
        setParseStatus('Successfully parsed & applied JSON theme!');
        return;
      }

      const extractVal = (varName: string): string | null => {
        const regex = new RegExp(`--${varName}\\s*:\\s*([^;]+);`, 'i');
        const match = tweakcnInput.match(regex);
        if (match && match[1]) {
          let val = match[1].trim();
          if (/^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(val)) {
            return `hsl(${val})`;
          }
          return val;
        }
        return null;
      };

      const bg = extractVal('app-bg') || extractVal('background') || extractVal('bg');
      const surface = extractVal('app-surface') || extractVal('card') || extractVal('surface');
      const surfaceLight = extractVal('app-surface-light') || extractVal('muted') || extractVal('popover');
      const border = extractVal('app-border') || extractVal('border');
      const text = extractVal('app-text') || extractVal('foreground') || extractVal('card-foreground');
      const textMuted = extractVal('app-text-muted') || extractVal('muted-foreground');
      const accent = extractVal('app-accent') || extractVal('primary') || extractVal('accent');
      const secondary = extractVal('app-secondary') || extractVal('secondary');
      const amber = extractVal('app-amber') || extractVal('warning') || extractVal('destructive');

      if (!accent && !bg && !surface) {
        setParseStatus('Could not find --primary, --background, or --accent variables in snippet.');
        return;
      }

      const activeTheme = THEME_PRESETS.find(p => p.id === selectedThemeId) || THEME_PRESETS[0];
      const newColors = {
        bg: bg || activeTheme.colors.bg,
        surface: surface || activeTheme.colors.surface,
        surfaceLight: surfaceLight || activeTheme.colors.surfaceLight,
        border: border || activeTheme.colors.border,
        text: text || activeTheme.colors.text,
        textMuted: textMuted || activeTheme.colors.textMuted,
        accent: accent || activeTheme.colors.accent,
        secondary: secondary || activeTheme.colors.secondary,
        amber: amber || activeTheme.colors.amber
      };

      applyThemeColors(newColors);
      setSelectedThemeId('custom');
      localStorage.setItem('sonic_dls_custom_theme', JSON.stringify({ id: 'custom', colors: newColors }));
      setParseStatus('Successfully parsed & applied tweakcn CSS variables!');
    } catch (err: any) {
      setParseStatus(`Error parsing snippet: ${err.message}`);
    }
  };

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-6 shadow-sm mt-8">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-app-border gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-app-accent to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-app-text tracking-wide uppercase">
              Visual Styling & Theme Engine
            </h2>
            <p className="text-xs text-app-text-muted">
              Select clean, modern themes with 1-2 primary & secondary colors and modern font pairings, or import from TweakCN.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-accent/15 border border-app-accent/40 text-app-accent hover:bg-app-accent hover:text-white text-xs font-semibold transition-all"
          >
            <Eye size={13} />
            <span>Open Theme Previewer</span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-surface-light text-app-text-muted hover:text-app-text text-xs font-medium transition-colors"
            title="Reset to default Sonic DLS style"
          >
            <RefreshCw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {parseStatus && (
        <div className="mt-4 p-3 rounded-lg bg-app-accent/10 border border-app-accent/30 text-xs font-medium text-app-accent flex items-center gap-2">
          <Sparkles size={14} />
          <span>{parseStatus}</span>
        </div>
      )}

      {/* CURATED PRESETS LIST */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-app-text-muted flex items-center gap-2">
            <span>Clean Modern Presets (Primary + Secondary Colors & Modern Fonts)</span>
          </h3>
          <span className="text-[11px] text-app-text-muted">Click any theme card to preview and apply</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isSelected = selectedThemeId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`cursor-pointer rounded-xl p-4 border transition-all text-left flex flex-col justify-between ${
                  isSelected
                    ? 'border-app-accent ring-2 ring-app-accent/30 bg-app-surface-light shadow-md'
                    : 'border-app-border hover:border-app-text/40 bg-app-surface-light/40 hover:bg-app-surface-light'
                }`}
                style={{ fontFamily: preset.fontSans }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-app-text">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="text-emerald-400 shrink-0">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-app-accent font-medium mb-1">{preset.vibe}</p>
                  <p className="text-[11px] text-app-text-muted leading-relaxed line-clamp-2 mb-3">
                    {preset.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-app-border/60 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-app-text-muted">Primary:</span>
                    <span className="font-semibold text-app-text flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: preset.colors.accent }} />
                      {preset.primaryColorName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-app-text-muted">Secondary:</span>
                    <span className="font-semibold text-app-text flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: preset.colors.secondary }} />
                      {preset.secondaryColorName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-app-border/40">
                    <span className="text-app-text-muted">Typography:</span>
                    <span className="font-mono text-app-text font-medium text-[9px]">{preset.fontName}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PASTE FROM TWEAKCN SECTION */}
      <div className="mt-8 pt-6 border-t border-app-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Code size={16} className="text-app-accent" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-app-text">
              Import from TweakCN or Custom CSS
            </h3>
          </div>
          <a
            href="https://tweakcn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-app-accent hover:underline"
          >
            <span>Open TweakCN Designer</span>
            <ExternalLink size={11} />
          </a>
        </div>
        <p className="text-xs text-app-text-muted mb-3 leading-relaxed">
          Copy CSS variables from <strong className="text-app-text">tweakcn.com</strong> (e.g. <code className="bg-app-surface-light px-1 py-0.5 rounded text-[10px]">--primary</code>, <code className="bg-app-surface-light px-1 py-0.5 rounded text-[10px]">--background</code>, <code className="bg-app-surface-light px-1 py-0.5 rounded text-[10px]">--card</code>) or paste a theme JSON object below to instantly skin the app.
        </p>

        <div className="relative">
          <textarea
            value={tweakcnInput}
            onChange={(e) => setTweakcnInput(e.target.value)}
            placeholder={`:root {\n  --background: 240 10% 3.9%;\n  --foreground: 0 0% 98%;\n  --primary: 217.2 91.2% 59.8%;\n  --card: 240 10% 6%;\n  --border: 240 3.7% 15.9%;\n}`}
            className="w-full h-24 p-3 font-mono text-xs bg-app-surface-light/60 border border-app-border rounded-lg text-app-text focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent resize-none placeholder:text-app-text-muted/40"
          />
          <button
            onClick={handleParseAndApplyTweakcn}
            className="absolute bottom-3 right-3 px-3 py-1.5 bg-app-accent hover:bg-blue-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Sparkles size={12} />
            <span>Apply TweakCN Snippet</span>
          </button>
        </div>
      </div>

      {/* POPUP THEME PREVIEW MODAL */}
      <ThemePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
    </div>
  );
}
