import React, { useState } from 'react';
import { 
  Copy, Check, Play, Terminal, Code2, Layers, Cpu, 
  ExternalLink, Sparkles, Volume2, ArrowRight
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
  onPlayToken,
  onNavigateToSettings
}: SdkPanelProps) {
  // Section 2: Usage sub-tab
  const [usageTab, setUsageTab] = useState<'react' | 'vanilla' | 'react-native'>('react');

  // Section 3: Live Resolver selected token
  const allDefs = { ...COMPONENT_DEFS, ...customTokens };
  const allTokenKeys = Object.keys(allDefs);
  const [selectedTokenKey, setSelectedTokenKey] = useState<string>('ui.button.confirm');

  // Copied toast state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
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

  // Section 5 Mapping Table
  const soundcnMappings = [
    { token: 'ui.button.confirm', command: 'npx shadcn add @soundcn/click-soft' },
    { token: 'ui.button.cancel', command: 'npx shadcn add @soundcn/click-subtle' },
    { token: 'ui.button.danger', command: 'npx shadcn add @soundcn/error-buzz' },
    { token: 'ui.toggle.on', command: 'npx shadcn add @soundcn/switch-on' },
    { token: 'ui.toggle.off', command: 'npx shadcn add @soundcn/switch-off' },
    { token: 'nav.arrived', command: 'npx shadcn add @soundcn/success-chime' },
    { token: 'alert.collision', command: 'npx shadcn add @soundcn/alert-urgent' },
    { token: 'alert.fuel.low', command: 'npx shadcn add @soundcn/alert-gentle' },
    { token: 'voice.wake', command: 'npx shadcn add @soundcn/notification-pop' },
    { token: 'comms.message', command: 'npx shadcn add @soundcn/notification-chime' }
  ];

  return (
    <div className="flex-1 bg-app-bg overflow-y-auto p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      
      {/* Toast Alert */}
      {copiedId && (
        <div className="fixed bottom-14 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white px-3.5 py-2 rounded-lg shadow-xl text-xs font-semibold animate-fade-in">
          <Check size={14} /> Copied!
        </div>
      )}

      {/* HEADER */}
      <div className="border-b border-app-border pb-6">
        <div className="flex items-center gap-2 text-app-accent text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <Code2 size={16} /> Sonic DLS Developer Kit
        </div>
        <h1 className="text-2xl font-bold text-app-text">SDK & Runtime Integration</h1>
        <p className="text-sm text-app-text-muted mt-1 leading-relaxed">
          Embed the Sonic Design Language System directly into web, mobile, and native applications.
          One JSON export drives mathematical synthesis everywhere with zero sound file bloat.
        </p>
      </div>

      {/* SECTION 1 — Install */}
      <section className="bg-app-surface border border-app-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-app-text">@studio/sonic-dls</h2>
            <p className="text-xs text-app-text-muted">Sound design token system for UI</p>
          </div>
          <span className="text-[11px] font-mono bg-app-surface-light text-app-text-muted px-2.5 py-1 rounded border border-app-border w-fit">
            v1.2.0 • Zero external runtime dependencies
          </span>
        </div>

        <div className="relative flex items-center justify-between bg-zinc-950 text-zinc-100 rounded-lg p-3.5 font-mono text-xs border border-app-border">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Terminal size={14} className="text-app-accent shrink-0" />
            <span className="select-all">npm install @studio/sonic-dls</span>
          </div>
          <button
            onClick={() => copyToClipboard('npm install @studio/sonic-dls', 'install-cmd')}
            className="shrink-0 ml-3 p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Copy install command"
          >
            {copiedId === 'install-cmd' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </section>

      {/* SECTION 2 — Usage */}
      <section className="bg-app-surface border border-app-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border pb-3">
          <div>
            <h2 className="text-base font-semibold text-app-text">Implementation Usage</h2>
            <p className="text-xs text-app-text-muted">Native framework wrappers consuming your exported token dictionary</p>
          </div>

          {/* Three sub-tabs */}
          <div className="flex bg-app-surface-light rounded-lg p-1 border border-app-border">
            <button
              onClick={() => setUsageTab('react')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                usageTab === 'react'
                  ? 'bg-app-accent text-white shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              React
            </button>
            <button
              onClick={() => setUsageTab('vanilla')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                usageTab === 'vanilla'
                  ? 'bg-app-accent text-white shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              Vanilla JS
            </button>
            <button
              onClick={() => setUsageTab('react-native')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                usageTab === 'react-native'
                  ? 'bg-app-accent text-white shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              React Native
            </button>
          </div>
        </div>

        {/* Code Block for Active Sub-Tab */}
        <div className="relative bg-zinc-950 rounded-lg p-4 font-mono text-xs text-zinc-200 border border-app-border overflow-x-auto">
          <div className="absolute top-3 right-3">
            <button
              onClick={() => {
                const code = usageTab === 'react'
                  ? `import { useSonicDLS } from '@studio/sonic-dls'
import tokens from './sonic-dls-export.json'

function App() {
  const { play, setMode } = useSonicDLS(tokens)
  return (
    <button onClick={() => play('ui.button.confirm')}>
      Confirm
    </button>
  )
}`
                  : usageTab === 'vanilla'
                    ? `import { SonicDLS } from '@studio/sonic-dls/web'
import tokens from './sonic-dls-export.json'

const dls = new SonicDLS(tokens)
document.querySelector('#btn')
  .addEventListener('click', () =>
    dls.play('ui.button.confirm'))`
                    : `import { resolveSonicToken } from '@studio/sonic-dls/core'
import tokens from './sonic-dls-export.json'

const resolved = resolveSonicToken('ui.button.confirm', tokens)
// { freq: 329, duration: 90, volume: -18 }
// Pass resolved values to your native audio layer`;
                copyToClipboard(code, `usage-${usageTab}`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[11px]"
            >
              {copiedId === `usage-${usageTab}` ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre className="pr-16 leading-relaxed">
            {usageTab === 'react' && (
              `import { useSonicDLS } from '@studio/sonic-dls'
import tokens from './sonic-dls-export.json'

function App() {
  const { play, setMode } = useSonicDLS(tokens)
  return (
    <button onClick={() => play('ui.button.confirm')}>
      Confirm
    </button>
  )
}`
            )}

            {usageTab === 'vanilla' && (
              `import { SonicDLS } from '@studio/sonic-dls/web'
import tokens from './sonic-dls-export.json'

const dls = new SonicDLS(tokens)
document.querySelector('#btn')
  .addEventListener('click', () =>
    dls.play('ui.button.confirm'))`
            )}

            {usageTab === 'react-native' && (
              `import { resolveSonicToken } from '@studio/sonic-dls/core'
import tokens from './sonic-dls-export.json'

const resolved = resolveSonicToken('ui.button.confirm', tokens)
// { freq: 329, duration: 90, volume: -18 }
// Pass resolved values to your native audio layer`
            )}
          </pre>
        </div>
      </section>

      {/* SECTION 3 — Live Resolver */}
      <section className="bg-app-surface border border-app-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-app-text">Token Resolver — what the SDK computes</h2>
            <p className="text-xs text-app-text-muted">This is exactly what dls.play() resolves internally</p>
          </div>

          {/* Token Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-app-text-muted font-medium">Token:</span>
            <select
              value={selectedTokenKey}
              onChange={(e) => setSelectedTokenKey(e.target.value)}
              className="bg-app-surface-light border border-app-border text-xs text-app-text rounded-md px-3 py-1.5 font-mono focus:outline-none focus:border-app-accent"
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
              className="p-1.5 bg-app-accent hover:bg-blue-600 text-white rounded-md transition-colors shadow-xs"
              title={`Audition ${selectedTokenKey}`}
            >
              <Play size={14} className="fill-current" />
            </button>
          </div>
        </div>

        {/* Live Resolved Output Card formatted exactly as requested */}
        <div className="border border-app-border rounded-xl overflow-hidden bg-app-surface-light/40 font-mono text-xs shadow-inner">
          <div className="px-4 py-2.5 bg-app-surface-light border-b border-app-border flex justify-between items-center font-bold text-app-accent">
            <span>{selectedTokenKey}</span>
            <span className="text-[10px] text-app-text-muted font-normal uppercase tracking-wider">
              Live Resolution
            </span>
          </div>

          <div className="divide-y divide-app-border/60">
            <div className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">semantic</span>
              <span className="text-app-text font-medium">{currentDef.semantic} ({degreeStr})</span>
            </div>

            <div className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">frequency</span>
              <span className="text-app-text font-medium">{Math.round(primaryNote.freq)} Hz</span>
            </div>

            <div className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">duration</span>
              <span className="text-app-text font-medium">{Math.round(dur * 1000)}ms</span>
            </div>

            <div className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">volume</span>
              <span className="text-app-text font-medium">{vol}dB</span>
            </div>

            <div className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">timbre</span>
              <span className="text-app-text font-medium">{timbreLabel}</span>
            </div>

            <div className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-app-text-muted">scale</span>
              <span className="text-app-text font-medium">{brand.scale}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-app-text-muted leading-relaxed">
          Updates live as brand primitives change in Settings. This demonstrates the SDK&apos;s core value — one function call, fully resolved values.
        </p>
      </section>

      {/* SECTION 4 — Package Architecture */}
      <section className="bg-app-surface border border-app-border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-app-text">Package Architecture</h2>
          <p className="text-xs text-app-text-muted">Layered architecture for cross-platform sound synthesis</p>
        </div>

        <div className="bg-zinc-950 text-zinc-300 p-4 rounded-lg font-mono text-xs border border-app-border overflow-x-auto leading-relaxed">
          <pre>{`@studio/sonic-dls
├── /core    Pure TypeScript resolver. No audio.
│            Works in Node, React Native, any env.
├── /web     Web Audio API engine. Wraps /core.
│            Browser only.
└── /react   Hooks + Provider. Wraps /web.
             useSonicDLS(tokens) → { play, setMode }`}</pre>
        </div>

        <p className="text-xs text-app-text-muted italic">
          &ldquo;The JSON export from the Figma plugin is the single source of truth consumed by all three layers.&rdquo;
        </p>
      </section>

      {/* SECTION 5 — soundcn Fallback Mapping (CHANGE 4) */}
      <section className="bg-app-surface border border-app-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="border-b border-app-border pb-3">
          <h2 className="text-base font-semibold text-app-text">File-based fallback via soundcn</h2>
          <p className="text-xs text-app-text-muted mt-0.5">
            For production apps that need pre-rendered audio files alongside synthesis
          </p>
        </div>

        <div className="bg-app-surface-light/40 border border-app-border rounded-lg p-3.5 text-xs text-app-text-muted leading-relaxed">
          soundcn is an open-source library of 700+ CC0-licensed UI sounds installable via shadcn CLI. Use these as production fallbacks or for platforms where Web Audio API synthesis is unavailable.
        </div>

        {/* Mapping Table */}
        <div className="border border-app-border rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-app-surface-light border-b border-app-border text-[11px] text-app-text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4 font-semibold">Sonic DLS Token</th>
                <th className="py-2.5 px-4 font-semibold">soundcn equivalent</th>
                <th className="py-2.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {soundcnMappings.map((row) => (
                <tr key={row.token} className="hover:bg-app-surface-light/30 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-app-accent">{row.token}</td>
                  <td className="py-2.5 px-4 text-zinc-300">
                    <span className="bg-zinc-950 px-2 py-1 rounded border border-app-border text-[11px]">
                      {row.command}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => copyToClipboard(row.command, `row-${row.token}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-app-surface-light border border-app-border hover:border-app-accent text-app-text hover:text-app-accent transition-colors text-[10px]"
                      title="Copy install command"
                    >
                      {copiedId === `row-${row.token}` ? (
                        <>
                          <Check size={11} className="text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-app-surface-light/30 border border-app-border/70 rounded-lg p-3 text-xs text-app-text-muted">
          Your Sonic DLS tokens define semantic meaning and brand character. soundcn provides pre-rendered files for the same interactions. Use both together — synthesis for design exploration, files for shipping.
        </div>
      </section>

    </div>
  );
}
