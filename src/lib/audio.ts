import * as Tone from 'tone';
import { Scale, Note } from '@tonaljs/tonal';

export interface BrandTokens {
  scale: string;
  timbre: Tone.ToneOscillatorType;
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

export const COMPONENT_DEFS: Record<string, { category: string, semantic: keyof typeof SEMANTIC_DEFS, overrides?: any, desc: string }> = {
  // UI Interactions
  'ui.button.confirm': { category: 'UI Interactions', semantic: 'success', overrides: { durMult: 0.5 }, desc: 'Confirm action' },
  'ui.button.cancel':  { category: 'UI Interactions', semantic: 'neutral', overrides: { durMult: 0.5 }, desc: 'Cancel action' },
  'ui.button.danger':  { category: 'UI Interactions', semantic: 'error', overrides: { durMult: 0.5 }, desc: 'Destructive action' },
  'ui.knob.rotate':    { category: 'UI Interactions', semantic: 'neutral', overrides: { volOffset: -10 }, desc: 'Rotary encoder tick' },
  'ui.tab.switch':     { category: 'UI Interactions', semantic: 'neutral', overrides: { durMult: 0.5 }, desc: 'View change' },
  'ui.toggle.on':      { category: 'UI Interactions', semantic: 'success', overrides: { volOffset: -3 }, desc: 'Switch enabled' },
  'ui.toggle.off':     { category: 'UI Interactions', semantic: 'neutral', overrides: { volOffset: -6 }, desc: 'Switch disabled' },
  
  // Alerts
  'alert.collision':      { category: 'Alerts', semantic: 'critical', overrides: { volOverride: 0, interrupt: true, repeat: 4, repeatRate: 0.2 }, desc: 'Imminent crash' },
  'alert.lane.departure': { category: 'Alerts', semantic: 'warning', overrides: { durMult: 0.5, repeat: 3, repeatRate: 0.15 }, desc: 'Drifting from lane' },
  'alert.blind.spot':     { category: 'Alerts', semantic: 'warning', overrides: { pan: 1 }, desc: 'Object in blind spot' },
  'alert.fuel.low':       { category: 'Alerts', semantic: 'warning', overrides: { durMult: 1.5, volOffset: -3 }, desc: 'Low fuel warning' },
  
  // Voice Assistant
  'voice.wake':       { category: 'Voice Assistant', semantic: 'ambient', overrides: { arpeggio: [-3, -1, 1], arpRate: 0.1, stopLoops: true }, desc: 'Assistant activated' },
  'voice.listening':  { category: 'Voice Assistant', semantic: 'ambient', overrides: { loop: true, loopRate: 1.0 }, desc: 'Mic open' },
  'voice.processing': { category: 'Voice Assistant', semantic: 'neutral', overrides: { loop: true, loopRate: 0.5 }, desc: 'Thinking' },
  'voice.success':    { category: 'Voice Assistant', semantic: 'success', overrides: { stopLoops: true }, desc: 'Action completed' },
  'voice.error':      { category: 'Voice Assistant', semantic: 'error', overrides: { durMult: 1.5, stopLoops: true }, desc: 'Did not understand' },
  
  // Media & Comms
  'media.track.next':     { category: 'Media & Comms', semantic: 'neutral', overrides: { durMult: 0.5 }, desc: 'Next track' },
  'comms.call.incoming':  { category: 'Media & Comms', semantic: 'neutral', overrides: { loop: true, loopRate: 2.0, pattern: [0, 0.2] }, desc: 'Incoming call ring' },
  'comms.call.connected': { category: 'Media & Comms', semantic: 'success', overrides: {}, desc: 'Call established' },
  'comms.message':        { category: 'Media & Comms', semantic: 'neutral', overrides: { volOffset: -8 }, desc: 'New message' },
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

class Engine {
  masterVol: Tone.Volume;
  reverb: Tone.Freeverb;
  filter: Tone.Filter;
  panner: Tone.Panner;
  activeSynths: Set<Tone.PolySynth> = new Set();
  loops: Tone.Loop[] = [];
  transportStarted = false;

  constructor() {
    this.masterVol = new Tone.Volume(0).toDestination();
    this.reverb = new Tone.Freeverb({ roomSize: 0.8, dampening: 3000 }).connect(this.masterVol);
    this.filter = new Tone.Filter(10000, 'lowpass').connect(this.reverb);
    this.panner = new Tone.Panner(0).connect(this.filter);
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

  stopAll() {
    this.activeSynths.forEach(s => {
      s.releaseAll();
      setTimeout(() => s.dispose(), 1000);
    });
    this.activeSynths.clear();
    this.stopLoops();
  }

  stopLoops() {
    this.loops.forEach(l => {
      l.stop();
      l.dispose();
    });
    this.loops = [];
  }

  play(componentId: string, semanticKey: keyof typeof SEMANTIC_DEFS, brand: BrandTokens, overrides: any = {}) {
    if (!this.transportStarted) return;

    if (overrides.interrupt) {
      this.stopAll();
    }
    if (overrides.stopLoops) {
      this.stopLoops();
    }

    const semDef = SEMANTIC_DEFS[semanticKey];
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

    const playNote = (timeOffset: number = 0) => {
      if (overrides.arpeggio) {
         // Arpeggio: play notes sequentially
         const rate = overrides.arpRate || 0.1;
         freqs.forEach((f, idx) => {
           const synth = new Tone.PolySynth(Tone.Synth, {
             oscillator: { type: brand.timbre as any },
             envelope: { attack: brand.attack, decay: dur, sustain: 0, release: dur * 0.5 }
           }).connect(this.panner);
           this.panner.pan.value = pan;
           synth.volume.value = vol;
           const now = Tone.now() + timeOffset + (idx * rate);
           synth.triggerAttackRelease([f], dur, now);
           this.activeSynths.add(synth);
           setTimeout(() => {
             synth.dispose();
             this.activeSynths.delete(synth);
           }, (timeOffset + (idx * rate) + dur + 1) * 1000);
         });
      } else {
         // Chord: play all notes together
         const synth = new Tone.PolySynth(Tone.Synth, {
           oscillator: { type: brand.timbre as any },
           envelope: { attack: brand.attack, decay: dur, sustain: 0, release: dur * 0.5 }
         }).connect(this.panner);
         this.panner.pan.value = pan;
         synth.volume.value = vol;
         const now = Tone.now() + timeOffset;
         synth.triggerAttackRelease(freqs, dur, now);
         this.activeSynths.add(synth);
         setTimeout(() => {
           synth.dispose();
           this.activeSynths.delete(synth);
         }, (timeOffset + dur + 1) * 1000);
      }
    };

    if (overrides.loop) {
       const rate = overrides.loopRate || 1.0;
       const pattern = overrides.pattern || [0];
       const loop = new Tone.Loop(time => {
          pattern.forEach((p: number) => {
             const synth = new Tone.PolySynth(Tone.Synth, {
               oscillator: { type: brand.timbre as any },
               envelope: { attack: brand.attack, decay: dur, sustain: 0, release: dur * 0.5 }
             }).connect(this.panner);
             synth.volume.value = vol;
             synth.triggerAttackRelease(freqs, dur, time + p);
             setTimeout(() => synth.dispose(), (dur + p + 1) * 1000);
          });
       }, rate).start(0);
       this.loops.push(loop);
    } else {
       const repeat = overrides.repeat || 1;
       const rate = overrides.repeatRate || dur * 1.5;
       for (let i = 0; i < repeat; i++) {
          playNote(i * rate);
       }
    }
  }
}

export const audioEngine = new Engine();
