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

let brand: BrandTokens = { ...DEFAULT_BRAND };

async function play(tokenKey: string): Promise<void> {
  const def = COMPONENT_DEFS[tokenKey];
  if (!def) {
    console.warn(`Unknown sound token: ${tokenKey}`);
    return;
  }

  await audioEngine.init();
  audioEngine.updateBrand(brand);
  audioEngine.play(
    tokenKey,
    def.semantic,
    brand,
    def.overrides || {},
    undefined,
    SEMANTIC_DEFS,
  );
}

function pause(tokenKey: string): void {
  audioEngine.pause(tokenKey);
}

function stop(tokenKey: string): void {
  audioEngine.stop(tokenKey);
}

function stopAll(): void {
  audioEngine.stopAll();
}

function updateBrand(changes: Partial<BrandTokens>): void {
  brand = { ...brand, ...changes };
  audioEngine.updateBrand(brand);
}

export const sonic = { play, pause, stop, stopAll, updateBrand };

export function useSonicDLS() {
  return sonic;
}
