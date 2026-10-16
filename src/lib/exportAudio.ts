import * as Tone from 'tone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BrandTokens, COMPONENT_DEFS, SEMANTIC_DEFS, resolveNotes } from './audio';
import { CustomTimbreToken } from './waveformAnalysis';

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * (bitDepth / 8);
  const arrayBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(arrayBuffer);
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, 'WAVE');
  
  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  
  // Data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength, true);
  
  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([view], { type: 'audio/wav' });
}

function interleave(leftChannel: Float32Array, rightChannel: Float32Array): Float32Array {
  const length = leftChannel.length + rightChannel.length;
  const result = new Float32Array(length);
  let inputIndex = 0;
  for (let index = 0; index < length; ) {
    result[index++] = leftChannel[inputIndex];
    result[index++] = rightChannel[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function exportAllWavs(brand: BrandTokens) {
  const zip = new JSZip();
  
  for (const [componentId, def] of Object.entries(COMPONENT_DEFS)) {
    const semanticKey = def.semantic;
    const overrides = def.overrides || {};
    
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
    
    let totalDur = dur;
    if (overrides.arpeggio) {
       totalDur += (freqs.length * (overrides.arpRate || 0.1));
    } else if (overrides.loop) {
       const rate = overrides.loopRate || 1.0;
       totalDur = rate * 3; // Render 3 cycles for looped sounds
    } else if (overrides.repeat) {
       totalDur += ((overrides.repeat - 1) * (overrides.repeatRate || dur * 1.5));
    }
    
    const renderDur = totalDur + 2.0; // 2 seconds tail for reverb
    
    const buffer = await Tone.Offline(({ transport }) => {
      const masterVol = new Tone.Volume(brand.volumeBase).toDestination();
      const reverb = new Tone.Freeverb({ roomSize: 0.8, dampening: 3000 }).connect(masterVol);
      reverb.wet.value = brand.reverbAmount;
      const cutoff = 15000 - (brand.warmth * 14200);
      const filter = new Tone.Filter(Math.max(800, cutoff), 'lowpass').connect(reverb);
      const panner = new Tone.Panner(pan).connect(filter);
      
      const isCustom = typeof brand.timbre === 'object' && brand.timbre !== null && brand.timbre.type === 'custom';
      const customTimbre = isCustom ? (brand.timbre as CustomTimbreToken) : null;
      const rawCtx = isCustom ? (Tone.getContext().rawContext as OfflineAudioContext) : null;
      let periodicWave: PeriodicWave | null = null;
      if (customTimbre && rawCtx) {
        const realArr = new Float32Array(customTimbre.real);
        const imagArr = new Float32Array(customTimbre.imag);
        periodicWave = rawCtx.createPeriodicWave(realArr, imagArr, { disableNormalization: false });
      }

      const playVoice = (freq: number, startTime: number) => {
        if (isCustom && rawCtx && periodicWave) {
          const osc = rawCtx.createOscillator();
          osc.setPeriodicWave(periodicWave);
          osc.frequency.setValueAtTime(freq, startTime);

          const gainNode = rawCtx.createGain();
          const targetGain = Tone.dbToGain(vol);
          const atk = Math.max(0.002, brand.attack);
          const rel = dur * 0.5;

          gainNode.gain.setValueAtTime(0.00001, startTime);
          gainNode.gain.linearRampToValueAtTime(targetGain, startTime + atk);
          gainNode.gain.setValueAtTime(targetGain, startTime + atk);
          gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + atk + dur + rel);

          osc.connect(gainNode);
          Tone.connect(gainNode, panner);

          osc.start(startTime);
          osc.stop(startTime + atk + dur + rel + 0.05);
        } else {
          const oscType = typeof brand.timbre === 'string' ? brand.timbre : 'sine';
          const synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: oscType as any },
            envelope: { attack: brand.attack, decay: dur, sustain: 0, release: dur * 0.5 }
          }).connect(panner);
          synth.volume.value = vol;
          synth.triggerAttackRelease([freq], dur, startTime);
        }
      };

      const playNote = (timeOffset: number = 0) => {
        if (overrides.arpeggio) {
          const rate = overrides.arpRate || 0.1;
          freqs.forEach((f, idx) => {
            playVoice(f, timeOffset + (idx * rate));
          });
        } else {
          freqs.forEach(f => {
            playVoice(f, timeOffset);
          });
        }
      };

      if (overrides.loop) {
        const rate = overrides.loopRate || 1.0;
        const pattern = overrides.pattern || [0];
        for (let cycle = 0; cycle < 3; cycle++) {
          pattern.forEach((p: number) => {
            freqs.forEach(f => {
              playVoice(f, cycle * rate + p);
            });
          });
        }
      } else {
        const repeat = overrides.repeat || 1;
        const rate = overrides.repeatRate || dur * 1.5;
        for (let i = 0; i < repeat; i++) {
          playNote(i * rate);
        }
      }
    }, renderDur, 2, 44100);
    
    const nativeAudioBuffer = (buffer as any).get ? (buffer as any).get() : (buffer as unknown as AudioBuffer);
    const wavBlob = audioBufferToWav(nativeAudioBuffer);
    zip.file(`${componentId}.wav`, wavBlob);
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'sonic_brand_export.zip');
}

/**
 * 16-bit mono WAV encoder adhering exactly to the spec
 */
export function encodeWAV(samples: Float32Array | number[], sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++)
      view.setUint8(o + i, s.charCodeAt(i));
  };
  ws(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true);
  ws(8, 'WAVE'); ws(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ws(36, 'data'); view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    off += 2;
  }
  return buffer;
}

/**
 * Downloads a single token as WAV using OfflineAudioContext at 44100Hz
 * Duration: token's resolved duration + 300ms silence
 * Filename: dots replaced with hyphens (e.g. ui.button.confirm -> ui-button-confirm.wav)
 */
export async function downloadTokenWav(
  componentId: string,
  brand: BrandTokens,
  tokenDef?: any
) {
  const def = tokenDef || COMPONENT_DEFS[componentId];
  if (!def) return;

  const semanticKey = def.semantic;
  const overrides = def.overrides || {};
  const semDef = SEMANTIC_DEFS[semanticKey] || { degrees: [0], durMult: 1, volOffset: 0 };
  const degrees = overrides.arpeggio || semDef.degrees;
  const resolved = resolveNotes(brand.scale, degrees);
  const freqs = resolved.map(r => r.freq);

  let dur = brand.decayUnit * semDef.durMult;
  if (overrides.durMult) dur *= overrides.durMult;
  if (componentId === 'nav.arrived') dur = Math.min(dur, 0.8);
  else dur = Math.min(dur, 0.5);

  let vol = brand.volumeBase + semDef.volOffset;
  if (overrides.volOffset !== undefined) vol += overrides.volOffset;
  if (overrides.volOverride !== undefined) vol = overrides.volOverride;

  const arpRate = overrides.arpRate || 0.1;
  const arpExtra = overrides.arpeggio ? (freqs.length - 1) * arpRate : 0;
  const resolvedDuration = dur + arpExtra;

  // Duration: token's resolved duration + 300ms silence
  const totalDuration = resolvedDuration + 0.3;
  const sampleRate = 44100;
  const totalSamples = Math.max(128, Math.ceil(totalDuration * sampleRate));

  const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

  // Lowpass filter for warmth
  const cutoff = 15000 - (brand.warmth * 14200);
  const filter = offlineCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.max(800, cutoff), 0);
  filter.connect(offlineCtx.destination);

  // Master Gain
  const masterGain = offlineCtx.createGain();
  const gainVal = Tone.dbToGain(vol);
  masterGain.gain.setValueAtTime(gainVal, 0);
  masterGain.connect(filter);

  // Periodic Wave or standard oscillator
  const isCustom = typeof brand.timbre === 'object' && brand.timbre !== null && brand.timbre.type === 'custom';
  const custom = isCustom ? (brand.timbre as CustomTimbreToken) : null;
  let periodicWave: PeriodicWave | null = null;
  if (custom && custom.real && custom.imag) {
    periodicWave = offlineCtx.createPeriodicWave(
      new Float32Array(custom.real),
      new Float32Array(custom.imag),
      { disableNormalization: false }
    );
  }

  const playVoice = (freq: number, startTime: number) => {
    const osc = offlineCtx.createOscillator();
    if (periodicWave) {
      osc.setPeriodicWave(periodicWave);
    } else {
      osc.type = (typeof brand.timbre === 'string' ? brand.timbre : 'sine') as OscillatorType;
    }
    osc.frequency.setValueAtTime(freq, startTime);

    const voiceGain = offlineCtx.createGain();
    const atk = Math.max(0.002, brand.attack);
    const rel = dur * 0.5;

    voiceGain.gain.setValueAtTime(0.00001, startTime);
    voiceGain.gain.linearRampToValueAtTime(1.0, startTime + atk);
    voiceGain.gain.setValueAtTime(1.0, startTime + atk);
    voiceGain.gain.exponentialRampToValueAtTime(0.00001, startTime + atk + dur + rel);

    osc.connect(voiceGain);
    voiceGain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + atk + dur + rel + 0.05);
  };

  if (overrides.arpeggio) {
    freqs.forEach((f, idx) => {
      playVoice(f, idx * arpRate);
    });
  } else {
    freqs.forEach(f => {
      playVoice(f, 0);
    });
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);
  const wavBuffer = encodeWAV(channelData, sampleRate);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });

  // Filename: dots replaced with hyphens (e.g. ui.button.confirm -> ui-button-confirm.wav)
  const filename = `${componentId.replace(/\./g, '-')}.wav`;
  saveAs(blob, filename);
}

