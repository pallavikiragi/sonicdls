import React, { useState } from 'react';
import {
  Copy, Check, Play, Terminal, Package, Layers,
  ArrowRight, Download, BookOpen, Sparkles, CheckCircle2,
  FileCode, Cpu, ShieldCheck
} from 'lucide-react';
import { BrandTokens, COMPONENT_DEFS, SEMANTIC_DEFS, resolveNotes, audioEngine } from '../lib/audio';

interface SdkPanelProps {
  brand: BrandTokens;
  customTokens?: Record<string, any>;
  onPlayToken?: (tokenId: string) => void;
  onNavigateToSettings?: () => void;
}

export function SdkPanel({
  brand,
  customTokens = {},
  onPlayToken
}: SdkPanelProps) {
  const [packageManager, setPackageManager] = useState<'npm' | 'pnpm' | 'yarn'>('npm');
  const [usageTab, setUsageTab] = useState<'react' | 'vanilla' | 'nextjs' | 'react-native'>('react');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Resolver selected token
  const allDefs = { ...COMPONENT_DEFS, ...customTokens };
  const allTokenKeys = Object.keys(allDefs);
  const [selectedTokenKey, setSelectedTokenKey] = useState<string>('ui.button.confirm');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  const getInstallCommand = () => {
    switch (packageManager) {
      case 'pnpm': return 'pnpm add @pallavikiragi/sonic-design-system@beta tone';
      case 'yarn': return 'yarn add @pallavikiragi/sonic-design-system@beta tone';
      default: return 'npm install @pallavikiragi/sonic-design-system@beta tone';
    }
  };

  // Compute live resolver data for selected token
  const currentDef = allDefs[selectedTokenKey] || COMPONENT_DEFS['ui.button.confirm'];
  const semDef = SEMANTIC_DEFS[currentDef.semantic] || { degrees: [0], durMult: 1, volOffset: 0 };
  const degrees = currentDef.overrides?.arpeggio || semDef.degrees;
  const resolvedNotes = resolveNotes(brand.scale, degrees);
  const primaryNote = resolvedNotes[0] || { freq: 440, degree: 0 };

  let dur = brand.decayUnit * semDef.durMult;
  if (currentDef.overrides?.durMult) dur *= currentDef.overrides.durMult;
  if (selectedTokenKey === 'nav.arrived') dur = Math.min(dur, 0.8);
  else dur = Math.min(dur, 0.5);

  let vol = brand.volumeBase + semDef.volOffset;
  if (currentDef.overrides?.volOffset !== undefined) vol += currentDef.overrides.volOffset;
  if (currentDef.overrides?.volOverride !== undefined) vol = currentDef.overrides.volOverride;

  const timbreLabel = typeof brand.timbre === 'object' && brand.timbre !== null && brand.timbre.type === 'custom'
    ? 'custom'
    : typeof brand.timbre === 'string'
      ? brand.timbre
      : 'sine';

  const degreeStr = degrees.length === 1 ? `degree ${degrees[0]}` : `degrees [${degrees.join(', ')}]`;

  // Download standalone package starter zip simulation/guide
  const handleDownloadStandalone = () => {
    const packageJson = {
      name: "@pallavikiragi/sonic-design-system",
      version: "1.4.0",
      description: "Mathematical Sound Design Language System (Sonic DLS) runtime engine",
      main: "dist/index.cjs",
      module: "dist/index.mjs",
      types: "dist/index.d.ts",
      peerDependencies: {
        "tone": "^15.0.0"
      }
    };

    const blob = new Blob([JSON.stringify(packageJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'package.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 bg-app-bg overflow-y-auto p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">

      {/* Toast Alert */}
      {copiedId && (
        <div className="fixed bottom-14 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-xl text-xs font-semibold animate-fade-in">
          <Check size={14} /> Copied to clipboard!
        </div>
      )}

      {/* HEADER */}
      <div className="border-b border-app-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-app-accent text-xs font-mono font-medium uppercase tracking-wider mb-1.5">
            <Package size={16} /> Package Documentation & Installation Guide
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-app-text tracking-tight">
            Sonic DLS Runtime Package
          </h1>
          <p className="text-sm text-app-text-muted mt-1.5 max-w-2xl leading-relaxed">
            Everything you need to install, configure, and synthesize the Sonic Sound Design Language System in any frontend, mobile app, or design system prototype.
          </p>
        </div>

        <button
          onClick={handleDownloadStandalone}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-app-surface border border-app-border hover:border-app-accent text-app-text text-xs font-semibold transition-all shadow-xs shrink-0"
          title="Download package configuration"
        >
          <Download size={15} className="text-app-accent" />
          <span>Download Package Config</span>
        </button>
      </div>

      {/* SECTION 1 — Installation Guide */}
      <section className="bg-app-surface border border-app-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-app-text flex items-center gap-2">
              <Terminal size={16} className="text-app-accent" /> Step 1: Install the Package
            </h2>
            <p className="text-xs text-app-text-muted mt-0.5">
              Add the official Sonic DLS runtime and Tone.js synthesis engine to your dependencies
            </p>
          </div>

          {/* Package Manager Selector */}
          <div className="flex items-center bg-app-surface-light rounded-xl p-1 border border-app-border shrink-0">
            {(['npm', 'pnpm', 'yarn'] as const).map(pm => (
              <button
                key={pm}
                onClick={() => setPackageManager(pm)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  packageManager === pm
                    ? 'bg-app-surface text-app-text shadow-xs'
                    : 'text-app-text-muted hover:text-app-text'
                }`}
              >
                {pm}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Box */}
        <div className="relative flex items-center justify-between bg-zinc-950 text-zinc-100 rounded-xl p-4 font-mono text-xs border border-app-border shadow-inner">
          <div className="flex items-center gap-2.5 overflow-x-auto">
            <span className="text-zinc-500 select-none">$</span>
            <span className="select-all font-semibold text-emerald-400">{getInstallCommand()}</span>
          </div>
          <button
            onClick={() => copyToClipboard(getInstallCommand(), 'install-cmd')}
            className="shrink-0 ml-3 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
            title="Copy command"
          >
            {copiedId === 'install-cmd' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-app-surface-light/40 border border-app-border flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-app-text block">Zero Sound Bloat</span>
              <span className="text-app-text-muted text-[11px]">Generates audio mathematically via Web Audio API. 0 MB sound assets.</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-app-surface-light/40 border border-app-border flex items-start gap-2.5">
            <Cpu size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-app-text block">Sub-5ms Latency</span>
              <span className="text-app-text-muted text-[11px]">Instant tactile response on keypress, hover, tap, and state triggers.</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-app-surface-light/40 border border-app-border flex items-start gap-2.5">
            <FileCode size={16} className="text-purple-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-app-text block">Full TypeScript Types</span>
              <span className="text-app-text-muted text-[11px]">Auto-complete for every token: &quot;ui.knob.rotate&quot;, &quot;nav.arrived&quot;, etc.</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Implementation & Code Examples */}
      <section className="bg-app-surface border border-app-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border pb-3">
          <div>
            <h2 className="text-base font-bold text-app-text flex items-center gap-2">
              <BookOpen size={16} className="text-app-accent" /> Step 2: Implementation & Code Usage
            </h2>
            <p className="text-xs text-app-text-muted mt-0.5">
              Choose your framework to view drop-in integration code
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex bg-app-surface-light rounded-xl p-1 border border-app-border shrink-0">
            {(['react', 'nextjs', 'vanilla', 'react-native'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setUsageTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                  usageTab === tab
                    ? 'bg-app-accent text-white shadow-xs'
                    : 'text-app-text-muted hover:text-app-text'
                }`}
              >
                {tab === 'nextjs' ? 'Next.js' : tab === 'react-native' ? 'React Native' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Code Block for Active Sub-Tab */}
        <div className="relative bg-zinc-950 rounded-xl p-4 font-mono text-xs text-zinc-200 border border-app-border shadow-inner overflow-x-auto">
          <div className="absolute top-3.5 right-3.5">
            <button
              onClick={() => {
                let code = '';
                if (usageTab === 'react') {
                  code = `import React from 'react';
import { useSonicDLS } from '@pallavikiragi/sonic-design-system';

export function ActionButton() {
  const { play, pause } = useSonicDLS();

  return (
    <button
      onClick={() => play('ui.button.confirm')}
      onMouseEnter={() => play('ui.knob.rotate')}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      Confirm Action
    </button>
  );
}`;
                } else if (usageTab === 'nextjs') {
                  code = `'use client';
import { useEffect } from 'react';
import { SonicDLSProvider, useSonicToken } from '@pallavikiragi/sonic-design-system/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SonicDLSProvider preset="minimal" defaultVolume={-14}>
      {children}
    </SonicDLSProvider>
  );
}`;
                } else if (usageTab === 'vanilla') {
                  code = `import { SonicDLS } from '@pallavikiragi/sonic-design-system';

const dls = new SonicDLS({
  scale: 'C4 major pentatonic',
  decayUnit: 0.160,
  warmth: 0.90
});

// Play token on button click
document.querySelector('#confirm-btn').addEventListener('click', () => {
  dls.play('ui.button.confirm');
});

// Stop or pause looped ambient audio
document.querySelector('#stop-btn').addEventListener('click', () => {
  dls.stop('voice.listening');
});`;
                } else {
                  code = `import { resolveSonicToken } from '@pallavikiragi/sonic-design-system/core';

// Pure mathematical resolver (No Web Audio API required)
const resolved = resolveSonicToken('ui.button.confirm', {
  scale: 'C4 major pentatonic',
  decayUnit: 0.160
});

console.log(resolved);
// Output: { freq: 329.63, duration: 90, volume: -14, notes: ['E4'] }
// Pass resolved frequencies directly to native sound synthesizers`;
                }
                copyToClipboard(code, `usage-${usageTab}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-xs font-semibold border border-zinc-800"
            >
              {copiedId === `usage-${usageTab}` ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <pre className="pr-20 leading-relaxed text-[12px]">
            {usageTab === 'react' && (
`import React from 'react';
import { useSonicDLS } from '@pallavikiragi/sonic-design-system';

export function ActionButton() {
  const { play, pause } = useSonicDLS();

  return (
    <button
      onClick={() => play('ui.button.confirm')}
      onMouseEnter={() => play('ui.knob.rotate')}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
    >
      Confirm Action
    </button>
  );
}`
            )}

            {usageTab === 'nextjs' && (
`'use client';
import React from 'react';
import { SonicDLSProvider, useSonicToken } from '@pallavikiragi/sonic-design-system/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SonicDLSProvider preset="minimal" defaultVolume={-14}>
      {children}
    </SonicDLSProvider>
  );
}`
            )}

            {usageTab === 'vanilla' && (
`import { SonicDLS } from '@pallavikiragi/sonic-design-system';

const dls = new SonicDLS({
  scale: 'C4 major pentatonic',
  decayUnit: 0.160,
  warmth: 0.90
});

// Trigger synthesis anytime
document.querySelector('#confirm-btn').addEventListener('click', () => {
  dls.play('ui.button.confirm');
});

// Pause or stop specific tokens
document.querySelector('#stop-btn').addEventListener('click', () => {
  dls.stop('voice.listening');
});`
            )}

            {usageTab === 'react-native' && (
`import { resolveSonicToken } from '@pallavikiragi/sonic-design-system/core';

// Pure mathematical resolver (Zero audio device dependencies)
const resolved = resolveSonicToken('ui.button.confirm', {
  scale: 'C4 major pentatonic',
  decayUnit: 0.160
});

console.log(resolved);
// Output: { freq: 329.63, duration: 90, volume: -14, notes: ['E4'] }
// Pass resolved frequencies directly to native audio synthesizers`
            )}
          </pre>
        </div>
      </section>

      {/* SECTION 3 — API Reference */}
      <section className="bg-app-surface border border-app-border rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-app-text">Step 3: Runtime API Reference</h2>
          <p className="text-xs text-app-text-muted mt-0.5">Methods and interfaces provided by the SonicDLS instance</p>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-app-surface-light/40 border border-app-border space-y-1">
            <div className="flex items-center justify-between text-app-accent font-bold">
              <span>play(tokenKey: string, options?: PlaybackOptions): Promise&lt;void&gt;</span>
              <span className="text-[10px] text-emerald-500 font-sans font-bold uppercase">Synthesize</span>
            </div>
            <p className="text-app-text-muted font-sans text-xs">Plays the resolved token with scale harmonics, timbre, and duration parameters.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-app-surface-light/40 border border-app-border space-y-1">
            <div className="flex items-center justify-between text-app-accent font-bold">
              <span>pause(tokenKey: string) / stop(tokenKey: string): void</span>
              <span className="text-[10px] text-amber-500 font-sans font-bold uppercase">Control</span>
            </div>
            <p className="text-app-text-muted font-sans text-xs">Immediately silences a running looped or ambient token (such as voice.listening).</p>
          </div>

          <div className="p-3.5 rounded-xl bg-app-surface-light/40 border border-app-border space-y-1">
            <div className="flex items-center justify-between text-app-accent font-bold">
              <span>stopAll(): void</span>
              <span className="text-[10px] text-red-500 font-sans font-bold uppercase">Emergency</span>
            </div>
            <p className="text-app-text-muted font-sans text-xs">Halts all active sound nodes, clears polyphonic voices, and stops Tone loops.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-app-surface-light/40 border border-app-border space-y-1">
            <div className="flex items-center justify-between text-app-accent font-bold">
              <span>updateBrand(brandTokens: Partial&lt;BrandTokens&gt;): void</span>
              <span className="text-[10px] text-blue-500 font-sans font-bold uppercase">Reactive</span>
            </div>
            <p className="text-app-text-muted font-sans text-xs">Dynamically updates scale, timbre, warmth, and volume in real-time across the app.</p>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Interactive Live Token Resolver */}
      <section className="bg-app-surface border border-app-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-app-text">Interactive Live Resolver</h2>
            <p className="text-xs text-app-text-muted mt-0.5">Test how the package computes token acoustics in real-time</p>
          </div>

          {/* Token Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-app-text-muted font-medium">Select Token:</span>
            <select
              value={selectedTokenKey}
              onChange={(e) => setSelectedTokenKey(e.target.value)}
              className="bg-app-surface-light border border-app-border text-xs text-app-text rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-app-accent"
            >
              {allTokenKeys.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>

            <button
              onClick={() => {
                if (onPlayToken) onPlayToken(selectedTokenKey);
                else audioEngine.play(selectedTokenKey, currentDef.semantic, brand, currentDef.overrides);
              }}
              className="p-2 bg-app-accent hover:opacity-90 text-white rounded-xl transition-all shadow-xs"
              title={`Audition ${selectedTokenKey}`}
            >
              <Play size={14} className="fill-current" />
            </button>
          </div>
        </div>

        {/* Live Resolved Output Card */}
        <div className="border border-app-border rounded-2xl overflow-hidden bg-app-surface-light/30 font-mono text-xs shadow-inner">
          <div className="px-5 py-3 bg-app-surface-light border-b border-app-border flex justify-between items-center font-bold text-app-accent">
            <span>{selectedTokenKey}</span>
            <span className="text-[11px] text-app-text-muted font-normal uppercase tracking-wider">
              Calculated Acoustic Values
            </span>
          </div>

          <div className="divide-y divide-app-border/60">
            <div className="px-5 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">Semantic layer</span>
              <span className="text-app-text font-medium">{currentDef.semantic} ({degreeStr})</span>
            </div>

            <div className="px-5 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">Frequency (Hz)</span>
              <span className="text-app-text font-medium">{Math.round(primaryNote.freq)} Hz</span>
            </div>

            <div className="px-5 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">Duration (ms)</span>
              <span className="text-app-text font-medium">{Math.round(dur * 1000)}ms</span>
            </div>

            <div className="px-5 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">Volume offset</span>
              <span className="text-app-text font-medium">{vol} dB</span>
            </div>

            <div className="px-5 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">Timbre</span>
              <span className="text-app-text font-medium capitalize">{timbreLabel}</span>
            </div>

            <div className="px-5 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">Scale</span>
              <span className="text-app-text font-medium">{brand.scale}</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
