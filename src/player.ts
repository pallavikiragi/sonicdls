import {
  audioEngine,
  COMPONENT_DEFS,
  SEMANTIC_DEFS,
  type BrandTokens,
} from './lib/audio';

export const DEFAULT_BRAND: BrandTokens = {
  scale: 'C4 major pentatonic',
  timbre: 'sine',
  decayUnit: 0.160,
  warmth: 0.9,
  volumeBase: -18,
  reverbAmount: 0.08,
  attack: 0.008,
};

// The JSON file exported from the Sonic DLS app
export interface SonicExport {
  meta?: any;
  primitive: any;
  semantic: Record<string, any>;
  component: Record<string, any>;
  assignments?: Record<string, string>;
}

type SemanticMap = Record<string, { degrees: number[]; durMult: number; volOffset: number }>;

let brand: BrandTokens = { ...DEFAULT_BRAND };
let semanticDefs: SemanticMap = SEMANTIC_DEFS as any;
let tokenDefs: Record<string, any> = COMPONENT_DEFS as any;
let assignments: Record<string, string> = {};

// Load the JSON exported from the app (call once at startup)
function configure(data: SonicExport): void {
  if (!data || !data.primitive || !data.semantic || !data.component) {
    console.warn('[sonic-dls] configure(): this does not look like a Sonic DLS export.');
    return;
  }

  audioEngine.stopAll();

  const p = data.primitive;
  const timbre =
    p.timbre && typeof p.timbre === 'object' && p.timbre.type === 'custom'
      ? {
          type: 'custom',
          real: Float32Array.from(p.timbre.real),
          imag: Float32Array.from(p.timbre.imag),
        }
      : p.timbre;

  brand = {
    scale: p.scale,
    timbre: timbre as any,
    decayUnit: p.decayUnit ?? p.decayUnitMs / 1000,
    warmth: p.warmth,
    volumeBase: p.volumeBase,
    reverbAmount: p.reverbAmount,
    attack: p.attack ?? p.attackMs / 1000,
  };

  const unitMs = brand.decayUnit * 1000;
  const sem: SemanticMap = {};
  for (const [key, v] of Object.entries<any>(data.semantic)) {
    sem[key] = {
      degrees: v.degrees,
      durMult: v.durMult ?? (unitMs > 0 ? v.duration / unitMs : 1),
      volOffset: v.volOffset ?? v.volume - brand.volumeBase,
    };
  }

  const defs: Record<string, any> = {};
  for (const [key, v] of Object.entries<any>(data.component)) {
    const builtIn = (COMPONENT_DEFS as any)[key];
    const overrides =
      v.overrides ??
      builtIn?.overrides ??
      (v.custom ? { arpeggio: v.resolvedDegrees, volOverride: v.resolvedVolume } : {});
    defs[key] = { ...v, overrides };
  }

  semanticDefs = sem;
  tokenDefs = defs;
  assignments = data.assignments || {};
  audioEngine.updateBrand(brand);
}

async function play(tokenKey: string): Promise<void> {
  const def = tokenDefs[tokenKey];
  if (!def) {
    console.warn(`[sonic-dls] Unknown token "${tokenKey}"`);
    return;
  }
  if (!semanticDefs[def.semantic]) {
    console.warn(`[sonic-dls] Token "${tokenKey}" uses missing semantic "${def.semantic}"`);
    return;
  }
  await audioEngine.init(); // starts audio on the first user click
  audioEngine.play(tokenKey, def.semantic, brand, def.overrides || {}, undefined, semanticDefs as any);
}

function pause(tokenKey: string) { audioEngine.pause(tokenKey); }
function stop(tokenKey: string) { audioEngine.stop(tokenKey); }
function stopAll() { audioEngine.stopAll(); }

function updateBrand(changes: Partial<BrandTokens>) {
  brand = { ...brand, ...changes };
  audioEngine.updateBrand(brand);
}

function tokens(): string[] { return Object.keys(tokenDefs); }
function getAssignments(): Record<string, string> { return assignments; }

export const sonic = { configure, play, pause, stop, stopAll, updateBrand, tokens, getAssignments };

export function useSonicDLS() {
  return sonic;
}