import * as Tone from 'tone';
import { Scale, Note } from '@tonaljs/tonal';
import { CustomTimbreToken } from './waveformAnalysis';

export type TimbreToken = Tone.ToneOscillatorType | CustomTimbreToken;

export interface BrandTokens {
  scale: string;
  timbre: TimbreToken;
  decayUnit: number;
  warmth: number;
  volumeBase: number;
  reverbAmount: number;
  attack: number;
}

export const SEMANTIC_DEFS = {
  success: { degrees: [2], durMult: 1.0, volOffset: 0 },
  error:   { degrees: [-1], durMult: 1.0, volOffset: 0 },
  neutral: { degrees: [0],  durMult: 0.75, volOffset: 0 },
  warning: { degrees: [4],  durMult: 1.0, volOffset: 3 },
  critical:{ degrees: [0, 1, 2, 4], durMult: 1.0, volOffset: 6 }, // stacked chord
  ambient: { degrees: [-3],  durMult: 2.0, volOffset: -6 }
};

export type InteractionType = 
  | 'Input'
  | 'Navigation'
  | 'Confirmation'
  | 'Error'
  | 'Alert'
  | 'Ambient'
  | 'Voice';

export type CategoryType = 
  | 'UI Interactions'
  | 'Navigation'
  | 'Alerts'
  | 'Voice Assistant'
  | 'Media & Comms';

export interface InteractionMetadata {
  label: InteractionType;
  desc: string;
  badge: string;
}

export const INTERACTION_GROUPS: Record<InteractionType, InteractionMetadata> = {
  'Input': {
    label: 'Input',
    desc: 'knobs, sliders, toggles, text entry',
    badge: 'tactile'
  },
  'Navigation': {
    label: 'Navigation',
    desc: 'tabs, back, forward, page transitions',
    badge: 'spatial'
  },
  'Confirmation': {
    label: 'Confirmation',
    desc: 'success, complete, accepted, saved',
    badge: 'affirmative'
  },
  'Error': {
    label: 'Error',
    desc: 'failure, rejected, invalid, timeout',
    badge: 'negative'
  },
  'Alert': {
    label: 'Alert',
    desc: 'warning, urgent, safety-critical',
    badge: 'attention'
  },
  'Ambient': {
    label: 'Ambient',
    desc: 'background, processing, listening states',
    badge: 'status'
  },
  'Voice': {
    label: 'Voice',
    desc: 'wake, thinking, response, error',
    badge: 'dialogue'
  }
};

export const CATEGORY_GROUPS: Record<CategoryType, { label: CategoryType; desc: string }> = {
  'UI Interactions': {
    label: 'UI Interactions',
    desc: 'Primary tactile controls, toggles, rotary knobs, and buttons'
  },
  'Navigation': {
    label: 'Navigation',
    desc: 'Wayfinding, destination arrival chimes, and view transitions'
  },
  'Alerts': {
    label: 'Alerts',
    desc: 'Safety-critical warnings and vehicle telemetry notifications'
  },
  'Voice Assistant': {
    label: 'Voice Assistant',
    desc: 'Conversational assistant wake, listening, thinking, and reply feedback'
  },
  'Media & Comms': {
    label: 'Media & Comms',
    desc: 'Infotainment media transport, call alerts, and message chimes'
  }
};

export interface ComponentDef {
  category: CategoryType | string;
  interaction: InteractionType;
  interactions?: InteractionType[];
  semantic: keyof typeof SEMANTIC_DEFS;
  overrides?: any;
  desc: string;
}

export const COMPONENT_DEFS: Record<string, ComponentDef> = {
  // UI Interactions / Input
  'ui.knob.rotate': { 
    category: 'UI Interactions', 
    interaction: 'Input',
    interactions: ['Input'],
    semantic: 'neutral', 
    overrides: { volOffset: -10 }, 
    desc: 'Rotary encoder tick' 
  },
  'ui.toggle.on': { 
    category: 'UI Interactions', 
    interaction: 'Input',
    interactions: ['Input'],
    semantic: 'success', 
    overrides: { volOffset: -3 }, 
    desc: 'Switch enabled' 
  },
  'ui.toggle.off': { 
    category: 'UI Interactions', 
    interaction: 'Input',
    interactions: ['Input'],
    semantic: 'neutral', 
    overrides: { volOffset: -6 }, 
    desc: 'Switch disabled' 
  },
  'ui.button.cancel': { 
    category: 'UI Interactions', 
    interaction: 'Input',
    interactions: ['Input', 'Error'],
    semantic: 'neutral', 
    overrides: { durMult: 0.5 }, 
    desc: 'Cancel action' 
  },

  // Confirmation
  'ui.button.confirm': { 
    category: 'UI Interactions', 
    interaction: 'Confirmation',
    interactions: ['Confirmation'],
    semantic: 'success', 
    overrides: { durMult: 0.5 }, 
    desc: 'Confirm action' 
  },

  // Error
  'ui.button.danger': { 
    category: 'UI Interactions', 
    interaction: 'Error',
    interactions: ['Error'],
    semantic: 'error', 
    overrides: { durMult: 0.5 }, 
    desc: 'Destructive action' 
  },

  // Navigation
  'ui.tab.switch': { 
    category: 'Navigation', 
    interaction: 'Navigation',
    interactions: ['Navigation'],
    semantic: 'neutral', 
    overrides: { durMult: 0.5 }, 
    desc: 'View / tab switch' 
  },
  'nav.arrived': { 
    category: 'Navigation', 
    interaction: 'Navigation',
    interactions: ['Navigation', 'Confirmation'],
    semantic: 'success', 
    overrides: { arpeggio: [0, 2, 4], arpRate: 0.12 }, 
    desc: 'Destination arrived' 
  },
  
  // Alerts
  'alert.collision': { 
    category: 'Alerts', 
    interaction: 'Alert',
    interactions: ['Alert'],
    semantic: 'critical', 
    overrides: { volOverride: 0, interrupt: true, repeat: 4, repeatRate: 0.2 }, 
    desc: 'Imminent crash' 
  },
  'alert.lane.departure': { 
    category: 'Alerts', 
    interaction: 'Alert',
    interactions: ['Alert'],
    semantic: 'warning', 
    overrides: { durMult: 0.5, repeat: 3, repeatRate: 0.15 }, 
    desc: 'Drifting from lane' 
  },
  'alert.blind.spot': { 
    category: 'Alerts', 
    interaction: 'Alert',
    interactions: ['Alert'],
    semantic: 'warning', 
    overrides: { pan: 1 }, 
    desc: 'Object in blind spot' 
  },
  'alert.fuel.low': { 
    category: 'Alerts', 
    interaction: 'Alert',
    interactions: ['Alert'],
    semantic: 'warning', 
    overrides: { durMult: 1.5, volOffset: -3 }, 
    desc: 'Low fuel warning' 
  },
  
  // Voice Assistant
  'voice.wake': { 
    category: 'Voice Assistant', 
    interaction: 'Voice',
    interactions: ['Voice'],
    semantic: 'ambient', 
    overrides: { arpeggio: [-3, -1, 1], arpRate: 0.1, stopLoops: true }, 
    desc: 'Assistant activated' 
  },
  'voice.listening': { 
    category: 'Voice Assistant', 
    interaction: 'Ambient',
    interactions: ['Ambient', 'Voice'],
    semantic: 'ambient', 
    overrides: { loop: true, loopRate: 1.0 }, 
    desc: 'Mic open' 
  },
  'voice.processing': { 
    category: 'Voice Assistant', 
    interaction: 'Ambient',
    interactions: ['Ambient', 'Voice'],
    semantic: 'neutral', 
    overrides: { loop: true, loopRate: 0.5 }, 
    desc: 'Thinking' 
  },
  'voice.success': { 
    category: 'Voice Assistant', 
    interaction: 'Voice',
    interactions: ['Voice', 'Confirmation'],
    semantic: 'success', 
    overrides: { stopLoops: true }, 
    desc: 'Action completed' 
  },
  'voice.error': { 
    category: 'Voice Assistant', 
    interaction: 'Voice',
    interactions: ['Voice', 'Error'],
    semantic: 'error', 
    overrides: { durMult: 1.5, stopLoops: true }, 
    desc: 'Did not understand' 
  },
  
  // Media & Comms
  'media.track.next': { 
    category: 'Media & Comms', 
    interaction: 'Navigation',
    interactions: ['Navigation'],
    semantic: 'neutral', 
    overrides: { durMult: 0.5 }, 
    desc: 'Next track' 
  },
  'comms.call.incoming': { 
    category: 'Media & Comms', 
    interaction: 'Alert',
    interactions: ['Alert'],
    semantic: 'neutral', 
    overrides: { loop: true, loopRate: 2.0, pattern: [0, 0.2] }, 
    desc: 'Incoming call ring' 
  },
  'comms.call.connected': { 
    category: 'Media & Comms', 
    interaction: 'Confirmation',
    interactions: ['Confirmation'],
    semantic: 'success', 
    overrides: {}, 
    desc: 'Call established' 
  },
  'comms.message': { 
    category: 'Media & Comms', 
    interaction: 'Ambient',
    interactions: ['Ambient', 'Alert'],
    semantic: 'neutral', 
    overrides: { volOffset: -8 }, 
    desc: 'New message' 
  },
};

export function resolveNotes(scaleName: string, degrees: number[]) {
  const scale = Scale.get(scaleName);
  if (!scale || !scale.notes.length) return degrees.map(() => ({ note: 'C4', freq: 261.63, degree: 0 }));
  const notes = scale.notes;
  
  return degrees.map(index => {
    const octaveShift = Math.floor(index / notes.length);
    const noteInOctave = notes[((index % notes.length) + notes.length) % notes.length];
    
    const p = Note.pitchClass(noteInOctave);
    const baseOct = Note.octave(noteInOctave) || 4;
    const finalNote = p + (baseOct + octaveShift);
    return {
      note: finalNote,
      freq: Note.freq(finalNote) || 440,
      degree: index
    };
  });
}

export interface ComponentActivePlayback {
  synths: Set<Tone.PolySynth>;
  customNodes: Set<{ osc: OscillatorNode; gain: GainNode }>;
  loops: Tone.Loop[];
  timerIds: any[];
}

class Engine {
  masterVol: Tone.Volume;
  reverb: Tone.Freeverb;
  filter: Tone.Filter;
  panner: Tone.Panner;
  activeSynths: Set<Tone.PolySynth> = new Set();
  activeCustomNodes: Set<{ osc: OscillatorNode; gain: GainNode }> = new Set();
  loops: Tone.Loop[] = [];
  transportStarted = false;
  private activeComponents = new Map<string, ComponentActivePlayback>();
  private onPlaybackStateChangeListeners: Set<(componentId: string, isPlaying: boolean) => void> = new Set();

  constructor() {
    this.masterVol = new Tone.Volume(0).toDestination();
    this.reverb = new Tone.Freeverb({ roomSize: 0.8, dampening: 3000 }).connect(this.masterVol);
    this.filter = new Tone.Filter(10000, 'lowpass').connect(this.reverb);
    this.panner = new Tone.Panner(0).connect(this.filter);
  }

  onPlaybackChange(callback: (componentId: string, isPlaying: boolean) => void) {
    this.onPlaybackStateChangeListeners.add(callback);
    return () => this.onPlaybackStateChangeListeners.delete(callback);
  }

  private notifyPlayback(componentId: string, isPlaying: boolean) {
    this.onPlaybackStateChangeListeners.forEach(cb => {
      try { cb(componentId, isPlaying); } catch (e) {}
    });
  }

  isPlaying(componentId: string): boolean {
    return this.activeComponents.has(componentId);
  }

  getPlayingComponents(): string[] {
    return Array.from(this.activeComponents.keys());
  }

  async init() {
    if (!this.transportStarted) {
      await Tone.start();
      Tone.Transport.start();
      this.transportStarted = true;
      console.log('Audio engine started');
    }
  }

  updateBrand(brand: BrandTokens) {
    if (Tone.context.state === 'running') {
      this.masterVol.volume.rampTo(brand.volumeBase, 0.1);
      const cutoff = 15000 - (brand.warmth * 14200);
      this.filter.frequency.rampTo(Math.max(800, cutoff), 0.1);
    } else {
      this.masterVol.volume.value = brand.volumeBase;
      const cutoff = 15000 - (brand.warmth * 14200);
      this.filter.frequency.value = Math.max(800, cutoff);
    }
    this.reverb.wet.value = brand.reverbAmount;
  }

  pause(componentId: string) {
    this.stop(componentId);
  }

  stop(componentId: string) {
    const record = this.activeComponents.get(componentId);
    if (!record) return;

    record.synths.forEach(s => {
      try {
        s.releaseAll();
        setTimeout(() => s.dispose(), 200);
      } catch (e) {}
      this.activeSynths.delete(s);
    });

    record.customNodes.forEach(n => {
      try {
        n.gain.gain.cancelScheduledValues(Tone.now());
        n.gain.gain.setValueAtTime(0, Tone.now());
        n.osc.stop();
        n.osc.disconnect();
        n.gain.disconnect();
      } catch (e) {}
      this.activeCustomNodes.delete(n);
    });

    record.loops.forEach(l => {
      try {
        l.stop();
        l.dispose();
      } catch (e) {}
      const idx = this.loops.indexOf(l);
      if (idx !== -1) this.loops.splice(idx, 1);
    });

    record.timerIds.forEach(t => clearTimeout(t));

    this.activeComponents.delete(componentId);
    this.notifyPlayback(componentId, false);
  }

  stopAll() {
    const activeIds = Array.from(this.activeComponents.keys());
    activeIds.forEach(id => this.stop(id));

    this.activeSynths.forEach(s => {
      s.releaseAll();
      setTimeout(() => s.dispose(), 1000);
    });
    this.activeSynths.clear();

    this.activeCustomNodes.forEach(n => {
      try {
        n.gain.gain.setValueAtTime(0, Tone.now());
        n.osc.stop();
        n.osc.disconnect();
        n.gain.disconnect();
      } catch (e) {}
    });
    this.activeCustomNodes.clear();

    this.stopLoops();
  }

  stopLoops() {
    this.loops.forEach(l => {
      l.stop();
      l.dispose();
    });
    this.loops = [];
  }

  private synthesizeVoice(
    freq: number,
    duration: number,
    startTime: number,
    volOffset: number,
    panOffset: number,
    timbreToUse: TimbreToken,
    brand: BrandTokens,
    currentPlayback?: ComponentActivePlayback
  ) {
    this.panner.pan.value = panOffset;
    const isCustom = typeof timbreToUse === 'object' && timbreToUse?.type === 'custom';

    if (isCustom && (timbreToUse as CustomTimbreToken).real && (timbreToUse as CustomTimbreToken).imag) {
      const rawCtx = (Tone.getContext().rawContext as AudioContext);
      const custom = timbreToUse as CustomTimbreToken;
      const realArr = new Float32Array(custom.real);
      const imagArr = new Float32Array(custom.imag);

      const periodicWave = rawCtx.createPeriodicWave(realArr, imagArr, { disableNormalization: false });
      const osc = rawCtx.createOscillator();
      osc.setPeriodicWave(periodicWave);
      osc.frequency.setValueAtTime(freq, startTime);

      const gainNode = rawCtx.createGain();
      const targetGain = Tone.dbToGain(volOffset);
      const atk = Math.max(0.002, brand.attack);
      const rel = duration * 0.5;

      gainNode.gain.setValueAtTime(0.00001, startTime);
      gainNode.gain.linearRampToValueAtTime(targetGain, startTime + atk);
      gainNode.gain.setValueAtTime(targetGain, startTime + atk);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + atk + duration + rel);

      osc.connect(gainNode);
      Tone.connect(gainNode, this.panner);

      osc.start(startTime);
      osc.stop(startTime + atk + duration + rel + 0.05);

      const nodeRecord = { osc, gain: gainNode };
      this.activeCustomNodes.add(nodeRecord);
      currentPlayback?.customNodes.add(nodeRecord);

      const waitMs = Math.max(10, (startTime - Tone.now() + atk + duration + rel + 0.2) * 1000);
      const timer = setTimeout(() => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch (e) {}
        this.activeCustomNodes.delete(nodeRecord);
        currentPlayback?.customNodes.delete(nodeRecord);
      }, waitMs);
      currentPlayback?.timerIds.push(timer);
    } else {
      const oscType = typeof timbreToUse === 'string' ? timbreToUse : 'sine';
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: oscType as any },
        envelope: { attack: brand.attack, decay: duration, sustain: 0, release: duration * 0.5 }
      }).connect(this.panner);
      synth.volume.value = volOffset;
      synth.triggerAttackRelease([freq], duration, startTime);
      this.activeSynths.add(synth);
      currentPlayback?.synths.add(synth);

      const synthTimer = setTimeout(() => {
        synth.dispose();
        this.activeSynths.delete(synth);
        currentPlayback?.synths.delete(synth);
      }, (duration + 1) * 1000);
      currentPlayback?.timerIds.push(synthTimer);
    }
  }

  play(
    componentId: string, 
    semanticKey: string, 
    brand: BrandTokens, 
    overrides: any = {}, 
    timbreOverride?: TimbreToken,
    semanticDefsMap?: Record<string, { degrees: number[]; durMult: number; volOffset: number }>
  ) {
    if (!this.transportStarted) return;

    if (overrides.interrupt) {
      this.stopAll();
    }
    if (overrides.stopLoops) {
      this.stopLoops();
    }

    // Stop previous instance of this component if running
    this.stop(componentId);

    const currentRecord: ComponentActivePlayback = {
      synths: new Set(),
      customNodes: new Set(),
      loops: [],
      timerIds: []
    };
    this.activeComponents.set(componentId, currentRecord);
    this.notifyPlayback(componentId, true);

    const semDef = (semanticDefsMap && semanticDefsMap[semanticKey]) || 
                   (SEMANTIC_DEFS as any)[semanticKey] || 
                   SEMANTIC_DEFS.neutral;
    const degrees = overrides.arpeggio || semDef.degrees;
    
    const resolved = resolveNotes(brand.scale, degrees);
    const freqs = resolved.map(r => r.freq);
    
    let dur = brand.decayUnit * semDef.durMult;
    if (overrides.durMult) dur *= overrides.durMult;
    if (componentId === 'nav.arrived') dur = Math.min(dur, 0.8);
    else dur = Math.min(dur, 0.5);

    let vol = semDef.volOffset;
    if (overrides.volOffset !== undefined) vol += overrides.volOffset;
    if (overrides.volOverride !== undefined) vol = overrides.volOverride - brand.volumeBase;

    const pan = overrides.pan || 0;
    const timbreToUse = timbreOverride || brand.timbre;

    const playNote = (timeOffset: number = 0) => {
      const now = Tone.now() + timeOffset;
      if (overrides.arpeggio) {
        const rate = overrides.arpRate || 0.1;
        freqs.forEach((f, idx) => {
          this.synthesizeVoice(f, dur, now + (idx * rate), vol, pan, timbreToUse, brand, currentRecord);
        });
      } else {
        freqs.forEach(f => {
          this.synthesizeVoice(f, dur, now, vol, pan, timbreToUse, brand, currentRecord);
        });
      }
    };

    if (overrides.loop) {
      const rate = overrides.loopRate || 1.0;
      const pattern = overrides.pattern || [0];
      const loop = new Tone.Loop(time => {
        pattern.forEach((p: number) => {
          freqs.forEach(f => {
            this.synthesizeVoice(f, dur, time + p, vol, pan, timbreToUse, brand, currentRecord);
          });
        });
      }, rate).start(0);
      this.loops.push(loop);
      currentRecord.loops.push(loop);
    } else {
      const repeat = overrides.repeat || 1;
      const rate = overrides.repeatRate || dur * 1.5;
      for (let i = 0; i < repeat; i++) {
        playNote(i * rate);
      }
      const arpExtra = overrides.arpeggio ? (freqs.length - 1) * (overrides.arpRate || 0.1) : 0;
      const totalDuration = ((repeat - 1) * rate) + dur + arpExtra + brand.attack + 0.1;
      const timer = setTimeout(() => {
        this.stop(componentId);
      }, Math.max(150, Math.round(totalDuration * 1000)));
      currentRecord.timerIds.push(timer);
    }
  }

  async previewRootTimbre(brand: BrandTokens) {
    await this.init();
    this.stop('preview-root-timbre');
    const resolved = resolveNotes(brand.scale, [0]);
    const rootFreq = resolved[0]?.freq || 440;
    const dur = Math.max(0.3, brand.decayUnit * 2);
    const now = Tone.now() + 0.05;
    const currentRecord: ComponentActivePlayback = {
      synths: new Set(),
      customNodes: new Set(),
      loops: [],
      timerIds: []
    };
    this.activeComponents.set('preview-root-timbre', currentRecord);
    this.notifyPlayback('preview-root-timbre', true);
    this.synthesizeVoice(rootFreq, dur, now, -6, 0, brand.timbre, brand, currentRecord);
    const timer = setTimeout(() => {
      this.stop('preview-root-timbre');
    }, Math.round((dur + brand.attack + 0.2) * 1000));
    currentRecord.timerIds.push(timer);
  }

  async previewSemantic(
    name: string,
    semDef: { degrees: number[]; durMult: number; volOffset: number },
    brand: BrandTokens
  ) {
    await this.init();
    const compId = `semantic.${name}`;
    this.stop(compId);
    const resolved = resolveNotes(brand.scale, semDef.degrees);
    const freqs = resolved.map(r => r.freq);
    const dur = brand.decayUnit * (semDef.durMult || 1.0);
    const vol = semDef.volOffset || 0;
    const now = Tone.now() + 0.05;
    
    const currentRecord: ComponentActivePlayback = {
      synths: new Set(),
      customNodes: new Set(),
      loops: [],
      timerIds: []
    };
    this.activeComponents.set(compId, currentRecord);
    this.notifyPlayback(compId, true);

    const isChord = semDef.degrees.length > 2 && semDef.degrees[0] === 0;
    if (isChord) {
      freqs.forEach(f => {
        this.synthesizeVoice(f, dur, now, vol - 3, 0, brand.timbre, brand, currentRecord);
      });
    } else {
      freqs.forEach((f, i) => {
        this.synthesizeVoice(f, dur, now + i * 0.08, vol, 0, brand.timbre, brand, currentRecord);
      });
    }

    const totalDur = dur + (freqs.length - 1) * 0.08 + brand.attack + 0.2;
    const timer = setTimeout(() => {
      this.stop(compId);
    }, Math.max(150, Math.round(totalDur * 1000)));
    currentRecord.timerIds.push(timer);
  }
}

export const audioEngine = new Engine();
