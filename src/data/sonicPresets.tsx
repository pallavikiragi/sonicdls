import React from 'react';
import { BrandTokens } from '../lib/audio';

export interface SonicPreset {
  id: string;
  num: string;
  name: string;
  tagline: string;
  industry: string;
  filter: string;
  emotion: string;
  characteristics: string[];
  description: string;
  bgClass: string;
  cardBg: string;
  textColor: string;
  playBtnBg: string;
  playBtnIcon: string;
  borderColor: string;
  accentColor: string;
  secondaryColor: string;
  auditionDegrees: number[];
  primitive: BrandTokens;
  semantics: Record<string, { degrees: number[]; durMult: number; volOffset: number; desc?: string }>;
}

export const FILTER_CATEGORIES = [
  { id: 'all', label: 'All 22 Archetypes' },
  { id: 'Fintech & Pro Audio', label: 'Fintech & Pro Audio' },
  { id: 'Health & MedTech', label: 'Health & MedTech' },
  { id: 'Productivity & Tools', label: 'Productivity & Tools' },
  { id: 'Gaming & Mobile', label: 'Gaming & Mobile' },
  { id: 'Safety & Industrial', label: 'Safety & Industrial' },
  { id: 'Wellness & Zen', label: 'Wellness & Zen' },
  { id: 'Children & Education', label: 'Children & Education' },
  { id: 'Automotive & Aerospace', label: 'Automotive & Aerospace' },
  { id: 'Retail & Commerce', label: 'Retail & Commerce' },
  { id: 'Spatial & Ambient', label: 'Spatial & Ambient' },
];

export function applySonicPresetTheme(preset: SonicPreset) {
  if (typeof document === 'undefined' || !preset) return;
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  // Primary and accent color updates for buttons, sliders, badges
  root.style.setProperty('--app-accent', preset.accentColor);
  root.style.setProperty('--primary', preset.accentColor);
  root.style.setProperty('--ring', preset.accentColor);
  root.style.setProperty('--sidebar-primary', preset.accentColor);
  root.style.setProperty('--sidebar-ring', preset.accentColor);

  if (preset.secondaryColor) {
    root.style.setProperty('--app-secondary', preset.secondaryColor);
    root.style.setProperty('--accent', preset.secondaryColor);
  }

  // Set card accent variables for custom tinting
  root.style.setProperty('--app-preset-card-bg', preset.cardBg);
  root.style.setProperty('--app-preset-text', preset.textColor);
  root.style.setProperty('--app-preset-accent', preset.accentColor);

  // Dynamic subtle hue of the respective preset for nav section and token boxes
  // Uses color-mix dynamically for smooth harmonic blending with light and dark mode surfaces
  const navPct = isDark ? '7.5%' : '4.5%';
  const navBorderPct = isDark ? '18%' : '12%';
  const navControlsPct = isDark ? '10%' : '6.5%';
  const tokenBgPct = isDark ? '8.5%' : '5.5%';
  const tokenHoverPct = isDark ? '13%' : '9.5%';
  const tokenBorderPct = isDark ? '22%' : '15%';
  const tokenPillPct = isDark ? '12%' : '8%';

  root.style.setProperty('--app-nav-bg', `color-mix(in srgb, ${preset.accentColor} ${navPct}, var(--card))`);
  root.style.setProperty('--app-nav-border', `color-mix(in srgb, ${preset.accentColor} ${navBorderPct}, var(--border))`);
  root.style.setProperty('--app-nav-controls-bg', `color-mix(in srgb, ${preset.accentColor} ${navControlsPct}, var(--secondary))`);
  root.style.setProperty('--app-token-bg', `color-mix(in srgb, ${preset.accentColor} ${tokenBgPct}, var(--card))`);
  root.style.setProperty('--app-token-bg-hover', `color-mix(in srgb, ${preset.accentColor} ${tokenHoverPct}, var(--card))`);
  root.style.setProperty('--app-token-border', `color-mix(in srgb, ${preset.accentColor} ${tokenBorderPct}, var(--border))`);
  root.style.setProperty('--app-token-pill-bg', `color-mix(in srgb, ${preset.accentColor} ${tokenPillPct}, var(--secondary))`);
}

export const SONIC_PRESETS: SonicPreset[] = [
  {
    id: 'minimal',
    num: '01',
    name: 'MINIMAL',
    tagline: 'Whisper-quiet precision & zero cognitive friction',
    industry: 'Fintech & Security',
    filter: 'Fintech & Pro Audio',
    emotion: 'Trustworthy, Assured & Transparent',
    characteristics: ['100ms decay', 'C4 Major Pentatonic', 'Sine Wave', 'Fintech & Pro Audio'],
    description: 'Engineered for financial terminals and cryptographic verification where sound must be unequivocal, non-distracting, and pristine.',
    bgClass: 'bg-[#F5F5F0]',
    cardBg: '#F5F5F0',
    textColor: '#1A1A1A',
    playBtnBg: '#1A1A1A',
    playBtnIcon: '#F5F5F0',
    borderColor: '#E2DBD2',
    accentColor: '#2563EB',
    secondaryColor: '#64748B',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'C4 major pentatonic',
      timbre: 'sine',
      decayUnit: 0.100,
      warmth: 0.60,
      volumeBase: -20,
      reverbAmount: 0.04,
      attack: 0.005
    },
    semantics: {
      success: { degrees: [2, 4], durMult: 0.9, volOffset: 0, desc: 'Crisp dual verification confirm' },
      error: { degrees: [-1, -3], durMult: 0.8, volOffset: 2, desc: 'Damped dry rejection click' },
      neutral: { degrees: [0], durMult: 0.6, volOffset: -2, desc: 'Micro-tactile ledger touch' },
      warning: { degrees: [3], durMult: 1.0, volOffset: 2, desc: 'Discrete security alert' },
      critical: { degrees: [-2, 0, 3], durMult: 1.1, volOffset: 4, desc: 'Critical authorization required' },
      ambient: { degrees: [0], durMult: 1.8, volOffset: -8, desc: 'Low-frequency secure idle' }
    }
  },
  {
    id: 'soft',
    num: '02',
    name: 'SOFT',
    tagline: 'Gentle biometric reassurance for patient care',
    industry: 'HealthTech & MedTech',
    filter: 'Health & MedTech',
    emotion: 'Empathetic, Gentle & Reassuring',
    characteristics: ['220ms decay', 'F3 Major Pentatonic', 'Triangle Wave', 'Warmth 0.90'],
    description: 'Designed to eliminate clinical alarm fatigue. Delivers warm, cushioned feedback that conveys vital status without triggering stress.',
    bgClass: 'bg-[#E8D5C8]',
    cardBg: '#E8D5C8',
    textColor: '#2D1F1A',
    playBtnBg: '#2D1F1A',
    playBtnIcon: '#E8D5C8',
    borderColor: '#D4C0B2',
    accentColor: '#D97768',
    secondaryColor: '#E8A598',
    auditionDegrees: [0, 1, 3],
    primitive: {
      scale: 'F3 major pentatonic',
      timbre: 'triangle',
      decayUnit: 0.220,
      warmth: 0.90,
      volumeBase: -22,
      reverbAmount: 0.20,
      attack: 0.025
    },
    semantics: {
      success: { degrees: [1, 3], durMult: 1.2, volOffset: 0, desc: 'Gentle heartbeat stabilization' },
      error: { degrees: [-1], durMult: 1.0, volOffset: 1, desc: 'Soft non-alarming pulse check' },
      neutral: { degrees: [0], durMult: 0.8, volOffset: -1, desc: 'Smooth vital baseline tap' },
      warning: { degrees: [2, 4], durMult: 1.1, volOffset: 2, desc: 'Cushioned attention prompt' },
      critical: { degrees: [0, 2, 4], durMult: 1.3, volOffset: 3, desc: 'Priority clinical attention chime' },
      ambient: { degrees: [-2], durMult: 2.2, volOffset: -6, desc: 'Calming respiratory backdrop' }
    }
  },
  {
    id: 'glass',
    num: '03',
    name: 'GLASS',
    tagline: 'Crystalline harmonics & refracted light transients',
    industry: 'Consumer Electronics & Mobile OS',
    filter: 'Productivity & Tools',
    emotion: 'Airy, Modern & Frictionless',
    characteristics: ['170ms decay', 'E4 Major Pentatonic', 'Sine Wave', 'Warmth 0.40'],
    description: 'Evokes lightweight ultra-thin OLED glass, diamond-cut bezels, and seamless gesture navigation with sparkling acoustic overtones.',
    bgClass: 'bg-[#C8DCE8]',
    cardBg: '#C8DCE8',
    textColor: '#1A2D38',
    playBtnBg: '#1A2D38',
    playBtnIcon: '#C8DCE8',
    borderColor: '#B2C9D6',
    accentColor: '#0284C7',
    secondaryColor: '#38BDF8',
    auditionDegrees: [1, 3, 5],
    primitive: {
      scale: 'E4 major pentatonic',
      timbre: 'sine',
      decayUnit: 0.170,
      warmth: 0.40,
      volumeBase: -19,
      reverbAmount: 0.22,
      attack: 0.003
    },
    semantics: {
      success: { degrees: [1, 3, 5], durMult: 1.0, volOffset: 0, desc: 'Prismatic crystal completion chime' },
      error: { degrees: [-1, 1], durMult: 0.9, volOffset: 1, desc: 'Damped glass edge knock' },
      neutral: { degrees: [0], durMult: 0.7, volOffset: -2, desc: 'Micro-glass screen tap' },
      warning: { degrees: [4, 6], durMult: 1.1, volOffset: 2, desc: 'High-frequency refractive glance' },
      critical: { degrees: [1, 3, 5, 7], durMult: 1.2, volOffset: 4, desc: 'Prism warning resonance' },
      ambient: { degrees: [2], durMult: 2.0, volOffset: -7, desc: 'Floating glass shimmer' }
    }
  },
  {
    id: 'arcade',
    num: '04',
    name: 'ARCADE',
    tagline: 'High-energy 8-bit pulse & nostalgic momentum',
    industry: 'Gaming & Interactive Entertainment',
    filter: 'Gaming & Mobile',
    emotion: 'Punchy, Euphoric & Dynamic',
    characteristics: ['85ms decay', 'G4 Major Pentatonic', 'Square Wave', 'Fast Attack'],
    description: 'Chiptune punch with zero latency. Built for fast reward loops, high score multipliers, and dopamine-rich micro-interactions.',
    bgClass: 'bg-[#2D1B6B]',
    cardBg: '#2D1B6B',
    textColor: '#E8E0FF',
    playBtnBg: '#E8E0FF',
    playBtnIcon: '#2D1B6B',
    borderColor: '#432E91',
    accentColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    auditionDegrees: [0, 2, 4, 7],
    primitive: {
      scale: 'G4 major pentatonic',
      timbre: 'square',
      decayUnit: 0.085,
      warmth: 0.30,
      volumeBase: -14,
      reverbAmount: 0.08,
      attack: 0.001
    },
    semantics: {
      success: { degrees: [0, 2, 4, 7], durMult: 1.1, volOffset: 1, desc: '8-bit coin multiplier cascade' },
      error: { degrees: [1, 0, -1], durMult: 1.0, volOffset: 2, desc: 'Classic buzz fail trigger' },
      neutral: { degrees: [0], durMult: 0.6, volOffset: -1, desc: 'Crisp arcade button blip' },
      warning: { degrees: [4, 4], durMult: 0.9, volOffset: 3, desc: 'Time-running-out double tick' },
      critical: { degrees: [0, 3, 6], durMult: 1.2, volOffset: 5, desc: 'Boss hazard siren' },
      ambient: { degrees: [0], durMult: 1.5, volOffset: -8, desc: 'Retro pixel scanline pulse' }
    }
  },
  {
    id: 'mechanical',
    num: '05',
    name: 'MECHANICAL',
    tagline: 'Horological precision & tactile haptic detents',
    industry: 'Industrial Robotics & Hardware',
    filter: 'Safety & Industrial',
    emotion: 'Solid, Tactile & Calibrated',
    characteristics: ['75ms decay', 'D3 Minor Pentatonic', 'Triangle Wave', 'Snappy Decay'],
    description: 'Inspired by precision Swiss watchmaking escapements and robotic actuators. Every sound delivers tangible, tactile weight.',
    bgClass: 'bg-[#2A2A2A]',
    cardBg: '#2A2A2A',
    textColor: '#E0E0E0',
    playBtnBg: '#E0E0E0',
    playBtnIcon: '#2A2A2A',
    borderColor: '#404040',
    accentColor: '#F97316',
    secondaryColor: '#71717A',
    auditionDegrees: [0, 1, 2],
    primitive: {
      scale: 'D3 minor pentatonic',
      timbre: 'triangle',
      decayUnit: 0.075,
      warmth: 0.50,
      volumeBase: -16,
      reverbAmount: 0.03,
      attack: 0.002
    },
    semantics: {
      success: { degrees: [1, 3], durMult: 0.9, volOffset: 0, desc: 'Precision gear engagement click' },
      error: { degrees: [-2], durMult: 0.8, volOffset: 2, desc: 'Mechanical clutch slip feedback' },
      neutral: { degrees: [0], durMult: 0.6, volOffset: -1, desc: 'Machined rotary detent' },
      warning: { degrees: [2], durMult: 1.0, volOffset: 2, desc: 'Limit switch warning ping' },
      critical: { degrees: [-1, 1, 3], durMult: 1.1, volOffset: 4, desc: 'Actuator torque threshold trip' },
      ambient: { degrees: [0], durMult: 1.6, volOffset: -7, desc: 'Motor idle hum' }
    }
  },
  {
    id: 'organic',
    num: '06',
    name: 'ORGANIC',
    tagline: 'Topographical flow & natural resonant fifths',
    industry: 'Cleantech, Sustainability & Ecology',
    filter: 'Wellness & Zen',
    emotion: 'Harmonic, Grounded & Serene',
    characteristics: ['240ms decay', 'A3 Minor Pentatonic', 'Triangle Wave', 'Warmth 0.85'],
    description: 'Echoes flowing riverbeds, botanical fibers, and living biomes. Perfect for regenerative technology and sustainable brand identities.',
    bgClass: 'bg-[#D4E8C8]',
    cardBg: '#D4E8C8',
    textColor: '#1A2D1A',
    playBtnBg: '#1A2D1A',
    playBtnIcon: '#D4E8C8',
    borderColor: '#BED4B0',
    accentColor: '#16A34A',
    secondaryColor: '#84CC16',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'A3 minor pentatonic',
      timbre: 'triangle',
      decayUnit: 0.240,
      warmth: 0.85,
      volumeBase: -21,
      reverbAmount: 0.22,
      attack: 0.015
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.2, volOffset: 0, desc: 'Flowing natural tri-tone blossom' },
      error: { degrees: [-1], durMult: 1.0, volOffset: 1, desc: 'Soft moss-covered leaf drop' },
      neutral: { degrees: [0], durMult: 0.8, volOffset: -1, desc: 'Pebble stream water ripple' },
      warning: { degrees: [3], durMult: 1.1, volOffset: 2, desc: 'Gentle rustle breeze alert' },
      critical: { degrees: [0, 2, 5], durMult: 1.3, volOffset: 3, desc: 'Forest canopy storm warning' },
      ambient: { degrees: [-2], durMult: 2.4, volOffset: -6, desc: 'Living forest dawn respiration' }
    }
  },
  {
    id: 'dreamy',
    num: '07',
    name: 'DREAMY',
    tagline: 'Celestial cloudscapes & weightless ambient reverb',
    industry: 'SleepTech, Audiobooks & Wellness',
    filter: 'Wellness & Zen',
    emotion: 'Ethereal, Floating & Poetic',
    characteristics: ['320ms decay', 'Eb4 Major Pentatonic', 'Sine Wave', 'Warmth 0.95'],
    description: 'Drifting cloud-soft tones designed for winding down, restorative sleep, and hypnagogic calm with expansive stereo reflections.',
    bgClass: 'bg-[#C8B4D4]',
    cardBg: '#C8B4D4',
    textColor: '#1A0A2D',
    playBtnBg: '#1A0A2D',
    playBtnIcon: '#C8B4D4',
    borderColor: '#B29EBE',
    accentColor: '#9333EA',
    secondaryColor: '#C084FC',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'Eb4 major pentatonic',
      timbre: 'sine',
      decayUnit: 0.320,
      warmth: 0.95,
      volumeBase: -24,
      reverbAmount: 0.35,
      attack: 0.040
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.3, volOffset: 0, desc: 'Ethereal chime bloom' },
      error: { degrees: [-1], durMult: 1.0, volOffset: 1, desc: 'Soft cloud dissipation' },
      neutral: { degrees: [0], durMult: 0.9, volOffset: -2, desc: 'Feather-light mist touch' },
      warning: { degrees: [2], durMult: 1.2, volOffset: 2, desc: 'Gently glowing twilight prompt' },
      critical: { degrees: [0, 3], durMult: 1.4, volOffset: 3, desc: 'Deep slumber boundary tone' },
      ambient: { degrees: [0], durMult: 2.5, volOffset: -7, desc: 'Subtle cosmic hum' }
    }
  },
  {
    id: 'scifi',
    num: '08',
    name: 'SCI-FI',
    tagline: 'Telemetric radar telemetry & orbital telemetry',
    industry: 'Aerospace, Defense & Space Exploration',
    filter: 'Safety & Industrial',
    emotion: 'Intelligent, Telemetric & Alert',
    characteristics: ['140ms decay', 'B3 Minor Pentatonic', 'Sawtooth Wave', 'Warmth 0.20'],
    description: 'Interplanetary command console telemetry, sensor pings, and trajectory targeting locks with razor-sharp transient precision.',
    bgClass: 'bg-[#0A1A2D]',
    cardBg: '#0A1A2D',
    textColor: '#80D4FF',
    playBtnBg: '#80D4FF',
    playBtnIcon: '#0A1A2D',
    borderColor: '#163554',
    accentColor: '#00D4FF',
    secondaryColor: '#38BDF8',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'B3 minor pentatonic',
      timbre: 'sawtooth',
      decayUnit: 0.140,
      warmth: 0.20,
      volumeBase: -17,
      reverbAmount: 0.12,
      attack: 0.002
    },
    semantics: {
      success: { degrees: [2, 4], durMult: 1.0, volOffset: 0, desc: 'Vector target lock acquire' },
      error: { degrees: [-2, 0], durMult: 0.9, volOffset: 2, desc: 'Telemetry abort blip' },
      neutral: { degrees: [0], durMult: 0.6, volOffset: -1, desc: 'Avionics button ping' },
      warning: { degrees: [3], durMult: 1.0, volOffset: 3, desc: 'Radar proximity warning' },
      critical: { degrees: [0, 3, 5], durMult: 1.2, volOffset: 5, desc: 'Orbital deviation hazard' },
      ambient: { degrees: [-1], durMult: 2.0, volOffset: -8, desc: 'Sub-space carrier frequency' }
    }
  },
  {
    id: 'rubber',
    num: '09',
    name: 'RUBBER',
    tagline: 'Bouncy pop-art elasticity & kinetic joy',
    industry: 'EdTech & Consumer Creator Apps',
    filter: 'Children & Education',
    emotion: 'Buoyant, Elastic & Joyful',
    characteristics: ['130ms decay', 'F4 Major Pentatonic', 'Triangle Wave', 'Warmth 0.70'],
    description: 'Springy, tactile, cartoon-like bouncing sound physics for creative exploration, canvas drawing, and playful learning interfaces.',
    bgClass: 'bg-[#F5C842]',
    cardBg: '#F5C842',
    textColor: '#2D2000',
    playBtnBg: '#2D2000',
    playBtnIcon: '#F5C842',
    borderColor: '#DEB230',
    accentColor: '#EAB308',
    secondaryColor: '#F97316',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'F4 major pentatonic',
      timbre: 'triangle',
      decayUnit: 0.130,
      warmth: 0.70,
      volumeBase: -16,
      reverbAmount: 0.10,
      attack: 0.004
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.1, volOffset: 1, desc: 'High bouncing trampoline pop' },
      error: { degrees: [-1, -2], durMult: 0.9, volOffset: 1, desc: 'Squishy comic boing' },
      neutral: { degrees: [0], durMult: 0.7, volOffset: -1, desc: 'Soft rubberized button pad' },
      warning: { degrees: [3], durMult: 1.0, volOffset: 2, desc: 'Spring tension stretch' },
      critical: { degrees: [0, 2, 4], durMult: 1.2, volOffset: 3, desc: 'Double rebound alert' },
      ambient: { degrees: [0], durMult: 1.6, volOffset: -7, desc: 'Bubbling toy idle' }
    }
  },
  {
    id: 'cinematic',
    num: '10',
    name: 'CINEMATIC',
    tagline: 'Deep widescreen presence & cinematic luxury',
    industry: 'Automotive EV & Luxury Mobility',
    filter: 'Automotive & Aerospace',
    emotion: 'Immersive, Dramatic & Prestigious',
    characteristics: ['280ms decay', 'D3 Minor Pentatonic', 'Sawtooth Wave', 'Warmth 0.60'],
    description: 'Dramatic low-end authority, EV signature drive tones, and flagship prestige acoustics tailored for premium cockpits.',
    bgClass: 'bg-[#0A0A14]',
    cardBg: '#0A0A14',
    textColor: '#C8B87A',
    playBtnBg: '#C8B87A',
    playBtnIcon: '#0A0A14',
    borderColor: '#202034',
    accentColor: '#D4AF37',
    secondaryColor: '#C8B87A',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'D3 minor pentatonic',
      timbre: 'sawtooth',
      decayUnit: 0.280,
      warmth: 0.60,
      volumeBase: -15,
      reverbAmount: 0.26,
      attack: 0.015
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.2, volOffset: 0, desc: 'Flagship EV ignition chime' },
      error: { degrees: [-2], durMult: 0.9, volOffset: 2, desc: 'Low dramatic rejection thud' },
      neutral: { degrees: [0], durMult: 0.7, volOffset: -1, desc: 'Haptic cockpit rotary tick' },
      warning: { degrees: [3], durMult: 1.1, volOffset: 3, desc: 'Widescreen hazard warning' },
      critical: { degrees: [-1, 2, 4], durMult: 1.3, volOffset: 4, desc: 'Autonomous takeover chime' },
      ambient: { degrees: [-2], durMult: 2.2, volOffset: -6, desc: 'EV acoustic pedestrian hum' }
    }
  },
  {
    id: 'studio',
    num: '11',
    name: 'STUDIO',
    tagline: 'Reference-grade monitoring & clinical acoustic accuracy',
    industry: 'Pro Audio, DAW & Streaming Hardware',
    filter: 'Fintech & Pro Audio',
    emotion: 'Precise, Objective & Linear',
    characteristics: ['120ms decay', 'A3 Minor Pentatonic', 'Sine Wave', 'Warmth 0.45'],
    description: 'Flat-response monitor calibration, zero coloration, and mastering-grade transient attack for audio engineering workflows.',
    bgClass: 'bg-[#1A1A1A]',
    cardBg: '#1A1A1A',
    textColor: '#FFFFFF',
    playBtnBg: '#FFFFFF',
    playBtnIcon: '#1A1A1A',
    borderColor: '#333333',
    accentColor: '#10B981',
    secondaryColor: '#34D399',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'A3 minor pentatonic',
      timbre: 'sine',
      decayUnit: 0.120,
      warmth: 0.45,
      volumeBase: -18,
      reverbAmount: 0.06,
      attack: 0.003
    },
    semantics: {
      success: { degrees: [2, 4], durMult: 1.0, volOffset: 0, desc: 'DAW export complete reference' },
      error: { degrees: [-1], durMult: 0.8, volOffset: 1, desc: 'Phase cancel warning tick' },
      neutral: { degrees: [0], durMult: 0.6, volOffset: -2, desc: 'Zero-crossing fader snap' },
      warning: { degrees: [3], durMult: 1.0, volOffset: 2, desc: 'Peak limiter headroom warning' },
      critical: { degrees: [0, 3, 5], durMult: 1.2, volOffset: 4, desc: 'Digital clip distortion spike' },
      ambient: { degrees: [0], durMult: 1.8, volOffset: -8, desc: 'Dither noise floor baseline' }
    }
  },
  {
    id: 'zen',
    num: '12',
    name: 'ZEN',
    tagline: 'Singing bowl resonance & acoustic spatial stillness',
    industry: 'Architecture, Hospitality & Mindfulness',
    filter: 'Wellness & Zen',
    emotion: 'Centered, Meditative & Serene',
    characteristics: ['300ms decay', 'C4 Major Pentatonic', 'Sine Wave', 'Warmth 0.92'],
    description: 'Tibetan singing bowl harmonics, breath pacing, and sanctuary acoustic architecture designed to center human attention.',
    bgClass: 'bg-[#E8E4DC]',
    cardBg: '#E8E4DC',
    textColor: '#2D2820',
    playBtnBg: '#2D2820',
    playBtnIcon: '#E8E4DC',
    borderColor: '#D4CEBE',
    accentColor: '#849688',
    secondaryColor: '#A8A29E',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'C4 major pentatonic',
      timbre: 'sine',
      decayUnit: 0.300,
      warmth: 0.92,
      volumeBase: -26,
      reverbAmount: 0.32,
      attack: 0.030
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.3, volOffset: 0, desc: 'Resonant temple bell blossom' },
      error: { degrees: [-1], durMult: 1.0, volOffset: 1, desc: 'Muffled meditation bowl ring' },
      neutral: { degrees: [0], durMult: 0.9, volOffset: -2, desc: 'Gentle bamboo water drip' },
      warning: { degrees: [2], durMult: 1.2, volOffset: 2, desc: 'Mindful transition chime' },
      critical: { degrees: [0, 2], durMult: 1.4, volOffset: 3, desc: 'Deep focus threshold gong' },
      ambient: { degrees: [0], durMult: 2.5, volOffset: -8, desc: 'Stillness meditation drone' }
    }
  },
  {
    id: 'cockpit',
    num: '13',
    name: 'COCKPIT',
    tagline: 'Avionics master caution & unambiguous pilot cues',
    industry: 'Aviation, Maritime & Mission-Critical HMI',
    filter: 'Safety & Industrial',
    emotion: 'Clinical, Unambiguous & Authoritative',
    characteristics: ['80ms decay', 'G4 Major Pentatonic', 'Sine Wave', 'Warmth 0.30'],
    description: 'Flight deck instrumentation designed to cut through engine noise with uncompromising clarity and distinct tonal separation.',
    bgClass: 'bg-[#0D1F0D]',
    cardBg: '#0D1F0D',
    textColor: '#40FF40',
    playBtnBg: '#40FF40',
    playBtnIcon: '#0D1F0D',
    borderColor: '#1A3F1A',
    accentColor: '#22C55E',
    secondaryColor: '#4ADE80',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'G4 major pentatonic',
      timbre: 'sine',
      decayUnit: 0.080,
      warmth: 0.30,
      volumeBase: -14,
      reverbAmount: 0.04,
      attack: 0.002
    },
    semantics: {
      success: { degrees: [2, 4], durMult: 0.9, volOffset: 0, desc: 'Autopilot engage confirmation' },
      error: { degrees: [-2, 0], durMult: 0.8, volOffset: 2, desc: 'System disconnect warning' },
      neutral: { degrees: [0], durMult: 0.6, volOffset: -1, desc: 'Flight computer bezel button' },
      warning: { degrees: [3, 3], durMult: 1.0, volOffset: 3, desc: 'Master caution warning chime' },
      critical: { degrees: [0, 3, 5], durMult: 1.1, volOffset: 5, desc: 'Terrain pull-up alert' },
      ambient: { degrees: [0], durMult: 1.5, volOffset: -8, desc: 'Avionics radar sweep idle' }
    }
  },
  {
    id: 'alert',
    num: '14',
    name: 'ALERT',
    tagline: 'High-visibility safety warnings & urgent escalation',
    industry: 'Emergency Systems & Safety HMI',
    filter: 'Safety & Industrial',
    emotion: 'Urgent, Distinct & Unmissable',
    characteristics: ['60ms decay', 'A4 Minor Pentatonic', 'Square Wave', 'Warmth 0.20'],
    description: 'Rapid acoustic strobe for industrial hazardous environments and emergency response where auditory recognition is vital.',
    bgClass: 'bg-[#2D0A00]',
    cardBg: '#2D0A00',
    textColor: '#FF8040',
    playBtnBg: '#FF8040',
    playBtnIcon: '#2D0A00',
    borderColor: '#521400',
    accentColor: '#EF4444',
    secondaryColor: '#FF8040',
    auditionDegrees: [0, 3, 5],
    primitive: {
      scale: 'A4 minor pentatonic',
      timbre: 'square',
      decayUnit: 0.060,
      warmth: 0.20,
      volumeBase: -10,
      reverbAmount: 0.02,
      attack: 0.001
    },
    semantics: {
      success: { degrees: [2, 4], durMult: 0.8, volOffset: 0, desc: 'Hazard cleared all-clear' },
      error: { degrees: [-2, 0], durMult: 0.8, volOffset: 2, desc: 'Emergency threshold breach' },
      neutral: { degrees: [0], durMult: 0.5, volOffset: 0, desc: 'System status tick' },
      warning: { degrees: [3], durMult: 0.9, volOffset: 3, desc: 'Safety boundary proximity' },
      critical: { degrees: [0, 3, 6], durMult: 1.1, volOffset: 6, desc: 'Evacuation klaxon burst' },
      ambient: { degrees: [0], durMult: 1.4, volOffset: -7, desc: 'Standby sentinel beat' }
    }
  },
  {
    id: 'commerce',
    num: '15',
    name: 'COMMERCE',
    tagline: 'Affirmative checkout chimes & point-of-sale delight',
    industry: 'Retail, E-commerce & Point of Sale',
    filter: 'Retail & Commerce',
    emotion: 'Rewarding, Friendly & Transactional',
    characteristics: ['110ms decay', 'C5 Major Pentatonic', 'Sine Wave', 'Warmth 0.65'],
    description: 'Tap-to-pay confirmation, cart rewards, and tactile cash register modernizations with bright customer satisfaction resonance.',
    bgClass: 'bg-[#F0EBE0]',
    cardBg: '#F0EBE0',
    textColor: '#2D1F00',
    playBtnBg: '#2D1F00',
    playBtnIcon: '#F0EBE0',
    borderColor: '#DDD5C4',
    accentColor: '#D97706',
    secondaryColor: '#F59E0B',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'C5 major pentatonic',
      timbre: 'sine',
      decayUnit: 0.110,
      warmth: 0.65,
      volumeBase: -17,
      reverbAmount: 0.08,
      attack: 0.003
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.0, volOffset: 0, desc: 'Tap-to-pay transaction complete' },
      error: { degrees: [-1, -3], durMult: 0.8, volOffset: 1, desc: 'Card declined gentle repulse' },
      neutral: { degrees: [0], durMult: 0.6, volOffset: -2, desc: 'Barcode scanner register blip' },
      warning: { degrees: [3], durMult: 0.9, volOffset: 2, desc: 'PIN entry reminder' },
      critical: { degrees: [0, 2, 5], durMult: 1.1, volOffset: 3, desc: 'POS connection lost warning' },
      ambient: { degrees: [0], durMult: 1.6, volOffset: -8, desc: 'Retail kiosk welcome aura' }
    }
  },
  {
    id: 'civic',
    num: '16',
    name: 'CIVIC',
    tagline: 'Public transit wayfinding & inclusive public infrastructure',
    industry: 'Transit, Government & Public Kiosks',
    filter: 'Retail & Commerce',
    emotion: 'Universal, Clear & Accessible',
    characteristics: ['150ms decay', 'F4 Major Pentatonic', 'Triangle Wave', 'Warmth 0.60'],
    description: 'High-intelligibility public announcements, ticket turnstiles, and accessible wayfinding across broad age and cognitive demographics.',
    bgClass: 'bg-[#E0E8F0]',
    cardBg: '#E0E8F0',
    textColor: '#0A1428',
    playBtnBg: '#0A1428',
    playBtnIcon: '#E0E8F0',
    borderColor: '#C4D4E2',
    accentColor: '#2563EB',
    secondaryColor: '#60A5FA',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'F4 major pentatonic',
      timbre: 'triangle',
      decayUnit: 0.150,
      warmth: 0.60,
      volumeBase: -18,
      reverbAmount: 0.14,
      attack: 0.008
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.1, volOffset: 0, desc: 'Transit card tap validated' },
      error: { degrees: [-1, -2], durMult: 0.9, volOffset: 1, desc: 'Gate entry rejected' },
      neutral: { degrees: [0], durMult: 0.7, volOffset: -1, desc: 'Kiosk screen selection' },
      warning: { degrees: [2, 4], durMult: 1.0, volOffset: 2, desc: 'Doors closing announcement' },
      critical: { degrees: [0, 2, 4], durMult: 1.2, volOffset: 3, desc: 'Emergency platform stop alert' },
      ambient: { degrees: [0], durMult: 2.0, volOffset: -7, desc: 'Transit hub info chime' }
    }
  },
  {
    id: 'performance',
    num: '17',
    name: 'PERFORMANCE',
    tagline: 'High-tempo cardio pacing & personal record surges',
    industry: 'Sports Tech, Fitness & Performance Analytics',
    filter: 'Gaming & Mobile',
    emotion: 'Energetic, Motivating & Competitive',
    characteristics: ['55ms decay', 'D5 Major Pentatonic', 'Square Wave', 'Warmth 0.25'],
    description: 'Sprint intervals, personal record celebrations, and biometric cadence pulses calibrated for high-intensity athletic focus.',
    bgClass: 'bg-[#0A1A00]',
    cardBg: '#0A1A00',
    textColor: '#80FF40',
    playBtnBg: '#80FF40',
    playBtnIcon: '#0A1A00',
    borderColor: '#1A3A00',
    accentColor: '#84CC16',
    secondaryColor: '#4ADE80',
    auditionDegrees: [0, 2, 4, 7],
    primitive: {
      scale: 'D5 major pentatonic',
      timbre: 'square',
      decayUnit: 0.055,
      warmth: 0.25,
      volumeBase: -13,
      reverbAmount: 0.05,
      attack: 0.001
    },
    semantics: {
      success: { degrees: [0, 2, 4, 7], durMult: 0.9, volOffset: 1, desc: 'Personal best record unlocked' },
      error: { degrees: [-1, 0], durMult: 0.7, volOffset: 1, desc: 'Cadence drop nudge' },
      neutral: { degrees: [0], durMult: 0.5, volOffset: -1, desc: 'Lap split timer click' },
      warning: { degrees: [4], durMult: 0.8, volOffset: 2, desc: 'Target heart rate threshold' },
      critical: { degrees: [0, 4, 7], durMult: 1.0, volOffset: 4, desc: 'Max exertion limit alert' },
      ambient: { degrees: [0], durMult: 1.3, volOffset: -7, desc: 'Metronome pacing pulse' }
    }
  },
  {
    id: 'playful',
    num: '18',
    name: 'PLAYFUL',
    tagline: 'Delightful discovery bells & encouraging gamification',
    industry: "Children's Apps & Early EdTech",
    filter: 'Children & Education',
    emotion: 'Joyful, Encouraging & Safe',
    characteristics: ['180ms decay', 'G5 Major Pentatonic', 'Triangle Wave', 'Warmth 0.80'],
    description: 'Gentle musical reward loops for young minds learning reading, mathematics, and creative problem solving.',
    bgClass: 'bg-[#FFE8F0]',
    cardBg: '#FFE8F0',
    textColor: '#2D001A',
    playBtnBg: '#2D001A',
    playBtnIcon: '#FFE8F0',
    borderColor: '#ECC6D6',
    accentColor: '#EC4899',
    secondaryColor: '#F472B6',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'G5 major pentatonic',
      timbre: 'triangle',
      decayUnit: 0.180,
      warmth: 0.80,
      volumeBase: -18,
      reverbAmount: 0.16,
      attack: 0.010
    },
    semantics: {
      success: { degrees: [0, 2, 4, 6], durMult: 1.2, volOffset: 1, desc: 'Sparkle star reward jingle' },
      error: { degrees: [-1], durMult: 0.9, volOffset: 0, desc: 'Gentle try-again wobble' },
      neutral: { degrees: [0], durMult: 0.7, volOffset: -1, desc: 'Giggle bubble tap' },
      warning: { degrees: [2], durMult: 1.0, volOffset: 1, desc: 'Friendly hint reminder' },
      critical: { degrees: [0, 2, 4], durMult: 1.2, volOffset: 2, desc: 'Bedtime session wrap-up chime' },
      ambient: { degrees: [0], durMult: 2.0, volOffset: -7, desc: 'Playful background lullaby' }
    }
  },
  {
    id: 'focus',
    num: '19',
    name: 'FOCUS',
    tagline: 'Deep work flow states & non-interruptive notifications',
    industry: 'Productivity Tools, SaaS & Developer Tools',
    filter: 'Productivity & Tools',
    emotion: 'Calm, Functional & Unobtrusive',
    characteristics: ['95ms decay', 'B3 Minor Pentatonic', 'Sine Wave', 'Warmth 0.55'],
    description: 'Zero-distraction micro-audio for code commits, ticket transitions, and deep engineering focus states.',
    bgClass: 'bg-[#F0F0F5]',
    cardBg: '#F0F0F5',
    textColor: '#14141E',
    playBtnBg: '#14141E',
    playBtnIcon: '#F0F0F5',
    borderColor: '#D9D9E3',
    accentColor: '#6366F1',
    secondaryColor: '#818CF8',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'B3 minor pentatonic',
      timbre: 'sine',
      decayUnit: 0.095,
      warmth: 0.55,
      volumeBase: -22,
      reverbAmount: 0.05,
      attack: 0.003
    },
    semantics: {
      success: { degrees: [2, 4], durMult: 0.9, volOffset: 0, desc: 'Git push & build passed' },
      error: { degrees: [-1], durMult: 0.8, volOffset: 1, desc: 'Linter syntax error blip' },
      neutral: { degrees: [0], durMult: 0.5, volOffset: -2, desc: 'Task check-off micro-tap' },
      warning: { degrees: [3], durMult: 0.9, volOffset: 2, desc: 'Pomodoro break reminder' },
      critical: { degrees: [-1, 2], durMult: 1.1, volOffset: 3, desc: 'Build pipeline failure alert' },
      ambient: { degrees: [0], durMult: 1.7, volOffset: -8, desc: 'Flow-state concentration hum' }
    }
  },
  {
    id: 'concierge',
    num: '20',
    name: 'CONCIERGE',
    tagline: 'Bespoke bellhop service & discreet luxury arrivals',
    industry: 'Hospitality, Travel & Luxury Service',
    filter: 'Retail & Commerce',
    emotion: 'Warm, Attentive & Unhurried',
    characteristics: ['260ms decay', 'D4 Major Pentatonic', 'Sine Wave', 'Warmth 0.88'],
    description: 'First-class airline cabins, grand hotel reception desks, and discreet personal service tailored to discerning guests.',
    bgClass: 'bg-[#2D1F0A]',
    cardBg: '#2D1F0A',
    textColor: '#F0E0C0',
    playBtnBg: '#F0E0C0',
    playBtnIcon: '#2D1F0A',
    borderColor: '#4A3414',
    accentColor: '#CA8A04',
    secondaryColor: '#EAB308',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'D4 major pentatonic',
      timbre: 'sine',
      decayUnit: 0.260,
      warmth: 0.88,
      volumeBase: -21,
      reverbAmount: 0.24,
      attack: 0.020
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.2, volOffset: 0, desc: 'Suite reservation confirmed' },
      error: { degrees: [-1], durMult: 1.0, volOffset: 1, desc: 'Polite adjustment required' },
      neutral: { degrees: [0], durMult: 0.8, volOffset: -1, desc: 'Discreet call bell chime' },
      warning: { degrees: [2], durMult: 1.1, volOffset: 2, desc: 'Boarding call final prompt' },
      critical: { degrees: [0, 2, 5], durMult: 1.3, volOffset: 3, desc: 'Priority concierge summon' },
      ambient: { degrees: [0], durMult: 2.3, volOffset: -7, desc: 'Luxury lounge acoustic veil' }
    }
  },
  {
    id: 'ambient-home',
    num: '21',
    name: 'AMBIENT HOME',
    tagline: 'Invisible domestic calm & calm technology notifications',
    industry: 'Smart Home, IoT & Ambient Computing',
    filter: 'Spatial & Ambient',
    emotion: 'Subtle, Spatial & Contextual',
    characteristics: ['350ms decay', 'C3 Major Pentatonic', 'Sine Wave', 'Warmth 0.90'],
    description: 'Seamless smart home background awareness that dissolves gracefully into domestic room acoustics.',
    bgClass: 'bg-[#1A1A2D]',
    cardBg: '#1A1A2D',
    textColor: '#C0C0E8',
    playBtnBg: '#C0C0E8',
    playBtnIcon: '#1A1A2D',
    borderColor: '#2D2D4A',
    accentColor: '#818CF8',
    secondaryColor: '#A5B4FC',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'C3 major pentatonic',
      timbre: 'sine',
      decayUnit: 0.350,
      warmth: 0.90,
      volumeBase: -26,
      reverbAmount: 0.30,
      attack: 0.035
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.3, volOffset: 0, desc: 'Scene lighting relaxed set' },
      error: { degrees: [-1], durMult: 1.0, volOffset: 1, desc: 'Smart lock jammed gentle cue' },
      neutral: { degrees: [0], durMult: 0.8, volOffset: -2, desc: 'Thermostat dial adjustment' },
      warning: { degrees: [2], durMult: 1.1, volOffset: 2, desc: 'Window open sensor notice' },
      critical: { degrees: [0, 3], durMult: 1.3, volOffset: 4, desc: 'Water leak sensor notification' },
      ambient: { degrees: [0], durMult: 2.6, volOffset: -8, desc: 'Whole-house presence aura' }
    }
  },
  {
    id: 'luxury-auto',
    num: '22',
    name: 'LUXURY AUTO',
    tagline: 'Gran tourer grand heritage & authoritative cabin acoustics',
    industry: 'Automotive Heritage & Premium Mobility',
    filter: 'Automotive & Aerospace',
    emotion: 'Warm, Precise & Confident',
    characteristics: ['200ms decay', 'E3 Minor Pentatonic', 'Sine Wave', 'Warmth 0.75'],
    description: 'Crafted mahogany accents, brushed alloy switches, and grand tourer cabin acoustic warmth with confident tonal presence.',
    bgClass: 'bg-[#1A1400]',
    cardBg: '#1A1400',
    textColor: '#D4C080',
    playBtnBg: '#D4C080',
    playBtnIcon: '#1A1400',
    borderColor: '#382B00',
    accentColor: '#C8A84E',
    secondaryColor: '#D4C080',
    auditionDegrees: [0, 2, 4],
    primitive: {
      scale: 'E3 minor pentatonic',
      timbre: 'sine',
      decayUnit: 0.200,
      warmth: 0.75,
      volumeBase: -19,
      reverbAmount: 0.18,
      attack: 0.012
    },
    semantics: {
      success: { degrees: [0, 2, 4], durMult: 1.1, volOffset: 0, desc: 'V12 start button sequence' },
      error: { degrees: [-1, -2], durMult: 0.9, volOffset: 1, desc: 'Drive mode unavailable chime' },
      neutral: { degrees: [0], durMult: 0.7, volOffset: -1, desc: 'Milled knurled dial click' },
      warning: { degrees: [2], durMult: 1.0, volOffset: 2, desc: 'Fuel range advisory' },
      critical: { degrees: [0, 2, 5], durMult: 1.2, volOffset: 4, desc: 'Tire pressure fault notification' },
      ambient: { degrees: [-2], durMult: 2.2, volOffset: -6, desc: 'Cabin acoustic insulation hush' }
    }
  }
];

export function PresetIllustration({ preset }: { preset: SonicPreset }) {
  const { num, cardBg, textColor } = preset;

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: cardBg }}
    >
      <svg
        viewBox="0 0 200 120"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {(() => {
          switch (num) {
            case '01': // MINIMAL: Simple horizontal lines, minimal
              return (
                <g>
                  <line
                    x1="36"
                    y1="52"
                    x2="164"
                    y2="52"
                    stroke={textColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <line
                    x1="68"
                    y1="68"
                    x2="132"
                    y2="68"
                    stroke={textColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.45"
                  />
                </g>
              );

            case '02': // SOFT: Soft overlapping rounded shapes
              return (
                <g>
                  <circle
                    cx="82"
                    cy="62"
                    r="34"
                    fill={textColor}
                    opacity="0.18"
                  />
                  <circle
                    cx="120"
                    cy="56"
                    r="28"
                    fill={textColor}
                    opacity="0.28"
                  />
                </g>
              );

            case '03': // GLASS: Geometric faceted polygon shapes
              return (
                <g>
                  <polygon
                    points="40,25 110,18 85,95 32,82"
                    fill={textColor}
                    opacity="0.20"
                    stroke={textColor}
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                  <polygon
                    points="110,18 162,45 138,102 85,95"
                    fill={textColor}
                    opacity="0.32"
                    stroke={textColor}
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                </g>
              );

            case '04': // ARCADE: Pixel/grid pattern, bright tiles
              return (
                <g>
                  <rect
                    x="46"
                    y="36"
                    width="30"
                    height="30"
                    rx="3"
                    fill={textColor}
                    opacity="0.90"
                  />
                  <rect
                    x="85"
                    y="52"
                    width="30"
                    height="30"
                    rx="3"
                    fill={textColor}
                    opacity="0.55"
                  />
                  <rect
                    x="124"
                    y="32"
                    width="30"
                    height="30"
                    rx="3"
                    fill={textColor}
                    opacity="0.28"
                  />
                </g>
              );

            case '05': // MECHANICAL: Gear/cog abstract technical shapes
              return (
                <g>
                  <circle
                    cx="82"
                    cy="60"
                    r="32"
                    stroke={textColor}
                    strokeWidth="4"
                    strokeDasharray="10 5"
                    fill="none"
                    opacity="0.85"
                  />
                  <circle
                    cx="134"
                    cy="60"
                    r="20"
                    stroke={textColor}
                    strokeWidth="3"
                    strokeDasharray="7 4"
                    fill="none"
                    opacity="0.50"
                  />
                </g>
              );

            case '06': // ORGANIC: Flowing hills, natural wave forms
              return (
                <g>
                  <path
                    d="M0,72 Q50,42 100,65 T200,55 L200,120 L0,120 Z"
                    fill={textColor}
                    opacity="0.20"
                  />
                  <path
                    d="M0,86 Q60,62 120,82 T200,74 L200,120 L0,120 Z"
                    fill={textColor}
                    opacity="0.35"
                  />
                </g>
              );

            case '07': // DREAMY: Soft gradient orb, floating circles
              return (
                <g>
                  <circle
                    cx="95"
                    cy="58"
                    r="38"
                    fill={textColor}
                    opacity="0.26"
                  />
                  <circle
                    cx="145"
                    cy="42"
                    r="12"
                    fill={textColor}
                    opacity="0.18"
                  />
                </g>
              );

            case '08': // SCI-FI: Crosshair/targeting circle diagram
              return (
                <g>
                  <circle
                    cx="100"
                    cy="60"
                    r="35"
                    stroke={textColor}
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    fill="none"
                    opacity="0.85"
                  />
                  <line
                    x1="52"
                    y1="60"
                    x2="148"
                    y2="60"
                    stroke={textColor}
                    strokeWidth="1.2"
                    opacity="0.70"
                  />
                  <line
                    x1="100"
                    y1="18"
                    x2="100"
                    y2="102"
                    stroke={textColor}
                    strokeWidth="1.2"
                    opacity="0.70"
                  />
                </g>
              );

            case '09': // RUBBER: Bouncing blob, elastic shape
              return (
                <g>
                  <ellipse
                    cx="100"
                    cy="65"
                    rx="44"
                    ry="28"
                    fill={textColor}
                    opacity="0.75"
                    transform="rotate(-6 100 65)"
                  />
                  <ellipse
                    cx="86"
                    cy="55"
                    rx="14"
                    ry="7"
                    fill="#FFFFFF"
                    opacity="0.45"
                    transform="rotate(-12 86 55)"
                  />
                </g>
              );

            case '10': // CINEMATIC: Orbital rings, planet abstraction
              return (
                <g>
                  <ellipse
                    cx="100"
                    cy="60"
                    rx="66"
                    ry="18"
                    stroke={textColor}
                    strokeWidth="1.5"
                    fill="none"
                    transform="rotate(-20 100 60)"
                    opacity="0.75"
                  />
                  <circle
                    cx="100"
                    cy="60"
                    r="25"
                    fill={textColor}
                    opacity="0.90"
                  />
                </g>
              );

            case '11': // STUDIO: Audio waveform bars, VU meter
              return (
                <g>
                  <rect
                    x="68"
                    y="34"
                    width="12"
                    height="52"
                    rx="3"
                    fill={textColor}
                    opacity="0.60"
                  />
                  <rect
                    x="94"
                    y="20"
                    width="12"
                    height="80"
                    rx="3"
                    fill={textColor}
                    opacity="0.95"
                  />
                  <rect
                    x="120"
                    y="44"
                    width="12"
                    height="32"
                    rx="3"
                    fill={textColor}
                    opacity="0.70"
                  />
                </g>
              );

            case '12': // ZEN: Minimal circle, single arc
              return (
                <g>
                  <circle
                    cx="82"
                    cy="60"
                    r="32"
                    stroke={textColor}
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="160 30"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <path
                    d="M110,38 Q146,60 128,88"
                    stroke={textColor}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.50"
                  />
                </g>
              );

            case '13': // COCKPIT: Altimeter/instrument dial abstraction
              return (
                <g>
                  <path
                    d="M58,74 A44,44 0 1,1 142,74"
                    stroke={textColor}
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray="6 3"
                    opacity="0.80"
                  />
                  <line
                    x1="100"
                    y1="60"
                    x2="126"
                    y2="40"
                    stroke={textColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="100"
                    cy="60"
                    r="4.5"
                    fill={textColor}
                  />
                </g>
              );

            case '14': // ALERT: Warning triangle, concentric rings
              return (
                <g>
                  <polygon
                    points="100,24 146,94 54,94"
                    stroke={textColor}
                    strokeWidth="3"
                    fill="none"
                    strokeLinejoin="round"
                    opacity="0.90"
                  />
                  <circle
                    cx="100"
                    cy="64"
                    r="16"
                    stroke={textColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    fill="none"
                    opacity="0.60"
                  />
                </g>
              );

            case '15': // COMMERCE: Shopping bag, coin stack abstract
              return (
                <g>
                  <path
                    d="M68,48 V88 H108 V48 Z M78,48 A10,10 0 0,1 98,48"
                    stroke={textColor}
                    strokeWidth="2"
                    fill={textColor}
                    fillOpacity="0.20"
                    opacity="0.85"
                  />
                  <ellipse
                    cx="138"
                    cy="68"
                    rx="16"
                    ry="6"
                    fill={textColor}
                    opacity="0.60"
                  />
                </g>
              );

            case '16': // CIVIC: Map pin, wayfinding arrow grid
              return (
                <g>
                  <path
                    d="M85,34 A18,18 0 0,0 67,52 C67,66 85,84 85,84 C85,84 103,66 103,52 A18,18 0 0,0 85,34 Z"
                    fill={textColor}
                    opacity="0.35"
                  />
                  <path
                    d="M120,54 L142,54 M134,46 L142,54 L134,62"
                    stroke={textColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.60"
                  />
                </g>
              );

            case '17': // PERFORMANCE: Speed lines, graph spike upward
              return (
                <g>
                  <polyline
                    points="45,86 78,68 108,76 138,36 165,24"
                    stroke={textColor}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="32"
                    y1="40"
                    x2="72"
                    y2="40"
                    stroke={textColor}
                    strokeWidth="1.5"
                    strokeDasharray="8 4"
                    opacity="0.50"
                  />
                </g>
              );

            case '18': // PLAYFUL: Stars, sparkles, rounded star shapes
              return (
                <g>
                  <path
                    d="M92,30 Q92,54 68,54 Q92,54 92,78 Q92,54 116,54 Q92,54 92,30 Z"
                    fill={textColor}
                    opacity="0.35"
                  />
                  <path
                    d="M136,46 Q136,60 122,60 Q136,60 136,74 Q136,60 150,60 Q136,60 136,46 Z"
                    fill={textColor}
                    opacity="0.22"
                  />
                </g>
              );

            case '19': // FOCUS: Clean grid, minimal dot matrix
              return (
                <g>
                  <rect
                    x="52"
                    y="30"
                    width="96"
                    height="60"
                    rx="6"
                    stroke={textColor}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    fill="none"
                    opacity="0.40"
                  />
                  <g fill={textColor}>
                    <circle cx="84" cy="50" r="3" opacity="0.30" />
                    <circle cx="100" cy="50" r="3" opacity="0.30" />
                    <circle cx="116" cy="50" r="3" opacity="0.30" />
                    <circle cx="84" cy="70" r="3" opacity="0.30" />
                    <circle cx="100" cy="70" r="4.5" opacity="0.90" />
                    <circle cx="116" cy="70" r="3" opacity="0.30" />
                  </g>
                </g>
              );

            case '20': // CONCIERGE: Soft arc, bell silhouette abstract
              return (
                <g>
                  <path
                    d="M78,74 C78,52 86,44 100,44 C114,44 122,52 122,74 Z"
                    fill={textColor}
                    opacity="0.40"
                  />
                  <path
                    d="M54,90 Q100,24 146,90"
                    stroke={textColor}
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="4 4"
                    opacity="0.35"
                  />
                </g>
              );

            case '21': // AMBIENT HOME: Home outline, signal ripple waves
              return (
                <g>
                  <path
                    d="M74,78 V58 L100,38 L126,58 V78 Z"
                    stroke={textColor}
                    strokeWidth="2"
                    fill="none"
                    opacity="0.65"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M84,30 A24,24 0 0,1 116,30"
                    stroke={textColor}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.45"
                  />
                </g>
              );

            case '22': // LUXURY AUTO: Speedometer arc, precision dial
              return (
                <g>
                  <path
                    d="M62,80 A48,48 0 1,1 138,80"
                    stroke={textColor}
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                  <line
                    x1="100"
                    y1="62"
                    x2="128"
                    y2="44"
                    stroke={textColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.90"
                  />
                </g>
              );

            default:
              return null;
          }
        })()}
      </svg>
    </div>
  );
}
