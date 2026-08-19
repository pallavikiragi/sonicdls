import * as Tone from 'tone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BrandTokens, COMPONENT_DEFS, SEMANTIC_DEFS, resolveNotes } from './audio';

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
      
      const playNote = (timeOffset: number = 0) => {
        if (overrides.arpeggio) {
           const rate = overrides.arpRate || 0.1;
           freqs.forEach((f, idx) => {
             const synth = new Tone.PolySynth(Tone.Synth, {
               oscillator: { type: brand.timbre as any },
               envelope: { attack: brand.attack, decay: dur, sustain: 0, release: dur * 0.5 }
             }).connect(panner);
             synth.volume.value = vol;
             synth.triggerAttackRelease([f], dur, timeOffset + (idx * rate));
           });
        } else {
           const synth = new Tone.PolySynth(Tone.Synth, {
             oscillator: { type: brand.timbre as any },
             envelope: { attack: brand.attack, decay: dur, sustain: 0, release: dur * 0.5 }
           }).connect(panner);
           synth.volume.value = vol;
           synth.triggerAttackRelease(freqs, dur, timeOffset);
        }
      };

      if (overrides.loop) {
         const rate = overrides.loopRate || 1.0;
         const pattern = overrides.pattern || [0];
         for (let cycle = 0; cycle < 3; cycle++) {
           pattern.forEach((p: number) => {
             const synth = new Tone.PolySynth(Tone.Synth, {
               oscillator: { type: brand.timbre as any },
               envelope: { attack: brand.attack, decay: dur, sustain: 0, release: dur * 0.5 }
             }).connect(panner);
             synth.volume.value = vol;
             synth.triggerAttackRelease(freqs, dur, cycle * rate + p);
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
    
    const wavBlob = audioBufferToWav(buffer);
    zip.file(`${componentId}.wav`, wavBlob);
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'sonic_brand_export.zip');
}
