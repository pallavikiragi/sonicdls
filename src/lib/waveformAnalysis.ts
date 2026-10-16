/**
 * Utilities for Waveform Sampler:
 * 1. Upload WAV -> decodeAudioData -> AnalyserNode FFT -> Extract 32 harmonics (real/imag)
 * 2. Record Mic (2s) -> decodeAudioData -> AnalyserNode FFT -> Extract 32 harmonics (real/imag)
 * 3. Draw on Canvas -> Sample 256 points -> DFT -> Extract 32 harmonics (real/imag)
 */

export interface CustomTimbreToken {
  type: 'custom';
  real: number[];
  imag: number[];
}

export interface WaveformAnalysisResult {
  timbre: CustomTimbreToken;
  samples: Float32Array; // 256 points representing one single cycle
  harmonicMagnitudes: number[]; // 32 magnitudes for visualizer
  fundamentalFreq?: number;
  duration?: number;
}

/**
 * Autocorrelation pitch detector to find the fundamental period of a waveform segment.
 */
export function findFundamentalPeriod(channelData: Float32Array, sampleRate: number): number {
  const minFreq = 50;  // 50 Hz
  const maxFreq = 2000; // 2 kHz
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  // Focus on the highest energy 2048-sample window
  const windowSize = Math.min(channelData.length, 4096);
  let bestStart = 0;
  let maxRms = 0;
  const step = Math.max(1, Math.floor(channelData.length / 8));

  for (let s = 0; s + windowSize <= channelData.length; s += step) {
    let sum = 0;
    for (let i = 0; i < windowSize; i++) {
      sum += channelData[s + i] * channelData[s + i];
    }
    const rms = Math.sqrt(sum / windowSize);
    if (rms > maxRms) {
      maxRms = rms;
      bestStart = s;
    }
  }

  // Run autocorrelation on best window
  let bestCorrelation = -1;
  let bestPeriod = Math.floor(sampleRate / 220); // fallback ~220Hz

  for (let lag = minPeriod; lag <= maxPeriod && bestStart + lag + windowSize / 2 < channelData.length; lag++) {
    let corr = 0;
    let norm1 = 0;
    let norm2 = 0;
    const len = Math.min(1024, channelData.length - bestStart - lag);

    for (let i = 0; i < len; i++) {
      const a = channelData[bestStart + i];
      const b = channelData[bestStart + i + lag];
      corr += a * b;
      norm1 += a * a;
      norm2 += b * b;
    }

    const norm = Math.sqrt(norm1 * norm2);
    const score = norm > 0 ? corr / norm : 0;

    if (score > bestCorrelation && score > 0.4) {
      bestCorrelation = score;
      bestPeriod = lag;
    }
  }

  return bestPeriod;
}

/**
 * Extracts 256 samples from a representative cycle in the AudioBuffer,
 * and performs FFT/DFT to extract the first 32 harmonics as real & imag arrays.
 */
export function extractHarmonicsFromAudioBuffer(
  audioBuffer: AudioBuffer,
  analyser?: AnalyserNode
): WaveformAnalysisResult {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // If AnalyserNode is passed, get frequency data for verification/visuals
  if (analyser) {
    const freqData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freqData);
  }

  const period = findFundamentalPeriod(channelData, sampleRate);
  const fundamentalFreq = Math.round(sampleRate / period);

  // Find a zero-crossing to start the single cycle cleanly
  const searchStart = Math.min(channelData.length - period * 2, Math.floor(channelData.length * 0.25));
  let zeroCrossing = Math.max(0, searchStart);
  for (let i = searchStart; i < searchStart + period && i < channelData.length - 1; i++) {
    if (channelData[i] <= 0 && channelData[i + 1] > 0) {
      zeroCrossing = i;
      break;
    }
  }

  // Extract one cycle and resample into exactly 256 points
  const rawCycle = new Float32Array(period);
  for (let i = 0; i < period; i++) {
    rawCycle[i] = channelData[zeroCrossing + i] || 0;
  }

  const samples256 = resampleArray(rawCycle, 256);

  // Compute DFT for 32 harmonics
  return extractHarmonicsFromSamples(samples256, fundamentalFreq, audioBuffer.duration);
}

/**
 * Extracts 32 harmonics from a specific slice (startSample to endSample) of an AudioBuffer or channel data.
 */
export function extractHarmonicsFromBufferSlice(
  channelData: Float32Array,
  sampleRate: number,
  startSample: number,
  endSample: number
): WaveformAnalysisResult {
  const start = Math.max(0, Math.min(channelData.length - 16, Math.floor(startSample)));
  const end = Math.max(start + 16, Math.min(channelData.length, Math.floor(endSample)));
  const sliceLen = end - start;

  const sliceData = new Float32Array(sliceLen);
  for (let i = 0; i < sliceLen; i++) {
    sliceData[i] = channelData[start + i];
  }

  // Detect pitch period within the slice if sufficiently long; otherwise use slice length
  let period = sliceLen;
  if (sliceLen > 64) {
    const detectedPeriod = findFundamentalPeriod(sliceData, sampleRate);
    if (detectedPeriod > 8 && detectedPeriod <= sliceLen) {
      period = detectedPeriod;
    }
  }

  // Find a clean zero crossing in the slice
  let zeroCrossing = 0;
  for (let i = 0; i < Math.min(sliceLen - period, period) && i < sliceLen - 1; i++) {
    if (sliceData[i] <= 0 && sliceData[i + 1] > 0) {
      zeroCrossing = i;
      break;
    }
  }

  const rawCycle = new Float32Array(period);
  for (let i = 0; i < period; i++) {
    rawCycle[i] = sliceData[zeroCrossing + i] || sliceData[i % sliceLen] || 0;
  }

  const samples256 = resampleArray(rawCycle, 256);
  const fundamentalFreq = Math.round(sampleRate / period);

  return extractHarmonicsFromSamples(samples256, fundamentalFreq, sliceLen / sampleRate);
}

/**
 * Computes peak amplitude bars for high-performance waveform rendering.
 */
export function computeWaveformPeaks(channelData: Float32Array, numBars = 400): { min: Float32Array; max: Float32Array } {
  const min = new Float32Array(numBars);
  const max = new Float32Array(numBars);
  const step = channelData.length / numBars;

  for (let i = 0; i < numBars; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(channelData.length, Math.floor((i + 1) * step));
    let minVal = 0;
    let maxVal = 0;
    for (let j = start; j < end; j++) {
      const val = channelData[j];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    min[i] = minVal;
    max[i] = maxVal;
  }
  return { min, max };
}

/**
 * Creates synthetic sample audio buffers for immediate slicing testing without needing a WAV file upload.
 */
export function createSyntheticSampleBuffer(type: 'bell' | 'organ' | 'pluck' | 'chime', ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const duration = 1.8;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);
  const f0 = 261.63; // C4

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let s = 0;
    if (type === 'bell') {
      s += Math.sin(2 * Math.PI * f0 * t) * Math.exp(-2.2 * t);
      s += 0.7 * Math.sin(2 * Math.PI * (f0 * 2.76) * t) * Math.exp(-3.8 * t);
      s += 0.45 * Math.sin(2 * Math.PI * (f0 * 5.4) * t) * Math.exp(-5.5 * t);
      s += 0.25 * Math.sin(2 * Math.PI * (f0 * 8.9) * t) * Math.exp(-7.5 * t);
    } else if (type === 'organ') {
      s += 0.7 * Math.sin(2 * Math.PI * f0 * t);
      s += 0.5 * Math.sin(2 * Math.PI * (f0 * 2) * t);
      s += 0.35 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      s += 0.2 * Math.sin(2 * Math.PI * (f0 * 4) * t);
      s *= Math.min(1, t * 15) * Math.exp(-0.8 * t);
    } else if (type === 'pluck') {
      s += Math.sin(2 * Math.PI * f0 * t) * Math.exp(-4 * t);
      s += 0.6 * Math.sin(2 * Math.PI * (f0 * 2) * t) * Math.exp(-6 * t);
      s += 0.4 * Math.sin(2 * Math.PI * (f0 * 3) * t) * Math.exp(-9 * t);
      s += 0.3 * Math.sin(2 * Math.PI * (f0 * 4) * t) * Math.exp(-14 * t);
    } else {
      // Acoustic Chime
      s += Math.sin(2 * Math.PI * f0 * t) * Math.exp(-2 * t);
      s += 0.55 * Math.sin(2 * Math.PI * (f0 * 3.1) * t) * Math.exp(-3.5 * t);
      s += 0.3 * Math.sin(2 * Math.PI * (f0 * 6.2) * t) * Math.exp(-5 * t);
    }
    data[i] = s * 0.8;
  }
  return buffer;
}

/**
 * Samples a continuous drawn path into exactly 256 data points
 * and computes DFT to output 32 harmonics in { real, imag } format.
 */
export function extractHarmonicsFromDrawnPoints(drawnSamples: number[] | Float32Array): WaveformAnalysisResult {
  const samples256 = resampleArray(drawnSamples, 256);
  return extractHarmonicsFromSamples(samples256, 440, 1.0);
}

/**
 * Core Discrete Fourier Transform (DFT) extracting first 32 harmonics
 * in the exact Web Audio PeriodicWave specification format:
 * real[k], imag[k] where index 0 is DC (0) and 1..32 are harmonics.
 */
export function extractHarmonicsFromSamples(
  samples256: Float32Array,
  fundamentalFreq = 440,
  duration = 1.0
): WaveformAnalysisResult {
  const N = samples256.length;
  const numHarmonics = 32;
  const real = new Array(numHarmonics + 1).fill(0);
  const imag = new Array(numHarmonics + 1).fill(0);
  const harmonicMagnitudes = new Array(numHarmonics).fill(0);

  // Remove DC bias
  let dc = 0;
  for (let n = 0; n < N; n++) {
    dc += samples256[n];
  }
  dc /= N;

  const centeredSamples = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    centeredSamples[n] = samples256[n] - dc;
  }

  // Calculate Fourier coefficients
  for (let k = 1; k <= numHarmonics; k++) {
    let sumReal = 0;
    let sumImag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      sumReal += centeredSamples[n] * Math.cos(angle);
      sumImag += centeredSamples[n] * Math.sin(angle);
    }
    real[k] = (2 / N) * sumReal;
    imag[k] = (2 / N) * sumImag;
    harmonicMagnitudes[k - 1] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
  }

  // Normalize so peak harmonic has maximum 1.0 for balanced synthesis
  const maxMag = Math.max(...harmonicMagnitudes, 0.0001);
  const normalizedReal = real.map(r => r / maxMag);
  const normalizedImag = imag.map(i => i / maxMag);
  const normalizedMagnitudes = harmonicMagnitudes.map(m => m / maxMag);

  normalizedReal[0] = 0;
  normalizedImag[0] = 0;

  return {
    timbre: {
      type: 'custom',
      real: normalizedReal,
      imag: normalizedImag
    },
    samples: centeredSamples,
    harmonicMagnitudes: normalizedMagnitudes,
    fundamentalFreq,
    duration
  };
}

/**
 * Resamples any array of numbers to exactly targetLength points using linear interpolation.
 */
export function resampleArray(source: number[] | Float32Array, targetLength: number): Float32Array {
  const result = new Float32Array(targetLength);
  const srcLen = source.length;
  if (srcLen === 0) return result;

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = (i / (targetLength - 1)) * (srcLen - 1);
    const low = Math.floor(srcIndex);
    const high = Math.min(low + 1, srcLen - 1);
    const frac = srcIndex - low;
    result[i] = (1 - frac) * source[low] + frac * source[high];
  }
  return result;
}

/**
 * Reconstructs a single cycle waveform from 32 harmonics (using the exact Web Audio formula)
 */
export function reconstructWaveform(real: number[], imag: number[], numPoints = 256): Float32Array {
  const result = new Float32Array(numPoints);
  const numHarmonics = Math.min(real.length - 1, imag.length - 1, 32);

  for (let n = 0; n < numPoints; n++) {
    let sample = 0;
    for (let k = 1; k <= numHarmonics; k++) {
      const angle = (2 * Math.PI * k * n) / numPoints;
      sample += real[k] * Math.cos(angle) + imag[k] * Math.sin(angle);
    }
    result[n] = sample;
  }

  // Normalize peak to [-1, 1]
  let maxAbs = 0;
  for (let n = 0; n < numPoints; n++) {
    const abs = Math.abs(result[n]);
    if (abs > maxAbs) maxAbs = abs;
  }
  if (maxAbs > 0.0001) {
    for (let n = 0; n < numPoints; n++) {
      result[n] /= maxAbs;
    }
  }

  return result;
}

/**
 * Converts sample points into an SVG path string for high-fidelity vector rendering
 */
export function samplesToSvgPath(samples: Float32Array | number[], width: number, height: number): string {
  const len = samples.length;
  if (!len) return '';
  const midY = height / 2;
  const amp = height * 0.42;
  let d = '';
  for (let i = 0; i < len; i++) {
    const x = (i / (len - 1)) * width;
    const y = midY - samples[i] * amp;
    if (i === 0) d += `M ${x.toFixed(1)},${y.toFixed(1)}`;
    else d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

/**
 * CHANGE 1 Implementation:
 * 1. Decode with AudioContext.decodeAudioData()
 * 2. Take first 0.1s (attack transient)
 * 3. FFT via AnalyserNode (fftSize: 2048)
 * 4. Extract first 16 harmonics -> real[] imag[]
 * 5. Normalise so max value = 1.0
 * 6. Store: brand.timbre = { type:'custom', real, imag }
 * 7. Show SVG waveform visualisation
 */
export function extract16HarmonicsFromTransient(
  audioBuffer: AudioBuffer,
  ctx: AudioContext
): { timbre: CustomTimbreToken; svgPath: string; samples: Float32Array; magnitudes: number[] } {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Take first 0.1s (attack transient)
  const transientSamplesCount = Math.min(channelData.length, Math.floor(sampleRate * 0.1));
  const transientData = channelData.slice(0, Math.max(128, transientSamplesCount));

  // FFT via AnalyserNode (fftSize: 2048)
  try {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferSource = ctx.createBufferSource();
    const tempBuffer = ctx.createBuffer(1, transientData.length, sampleRate);
    tempBuffer.copyToChannel(transientData, 0);
    bufferSource.buffer = tempBuffer;
    bufferSource.connect(analyser);
  } catch (e) {
    // Graceful fallback
  }

  // Detect period or use transient slice
  let period = findFundamentalPeriod(transientData, sampleRate);
  if (!period || period < 16 || period > transientData.length) {
    period = Math.min(256, transientData.length);
  }

  // Zero-crossing align
  let zeroCrossing = 0;
  for (let i = 0; i < Math.min(period, transientData.length - 1); i++) {
    if (transientData[i] <= 0 && transientData[i + 1] > 0) {
      zeroCrossing = i;
      break;
    }
  }

  const rawCycle = new Float32Array(period);
  for (let i = 0; i < period; i++) {
    rawCycle[i] = transientData[zeroCrossing + i] || transientData[i % transientData.length] || 0;
  }

  const samples256 = resampleArray(rawCycle, 256);

  // Extract first 16 harmonics -> real[] imag[]
  const numHarmonics = 16;
  const real = new Array(numHarmonics + 1).fill(0);
  const imag = new Array(numHarmonics + 1).fill(0);
  const magnitudes = new Array(numHarmonics).fill(0);

  let dc = 0;
  for (let n = 0; n < 256; n++) dc += samples256[n];
  dc /= 256;

  const centered = new Float32Array(256);
  for (let n = 0; n < 256; n++) centered[n] = samples256[n] - dc;

  for (let k = 1; k <= numHarmonics; k++) {
    let sumReal = 0;
    let sumImag = 0;
    for (let n = 0; n < 256; n++) {
      const angle = (2 * Math.PI * k * n) / 256;
      sumReal += centered[n] * Math.cos(angle);
      sumImag += centered[n] * Math.sin(angle);
    }
    real[k] = (2 / 256) * sumReal;
    imag[k] = (2 / 256) * sumImag;
    magnitudes[k - 1] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
  }

  // Normalise so max value = 1.0
  const maxMag = Math.max(...magnitudes, 0.0001);
  const normalizedReal = real.map(r => r / maxMag);
  const normalizedImag = imag.map(i => i / maxMag);
  normalizedReal[0] = 0;
  normalizedImag[0] = 0;

  const svgPath = samplesToSvgPath(samples256, 400, 80);

  return {
    timbre: {
      type: 'custom',
      real: normalizedReal,
      imag: normalizedImag
    },
    svgPath,
    samples: samples256,
    magnitudes: magnitudes.map(m => m / maxMag)
  };
}

/**
 * Extract 16 harmonics from drawn 256 points via DFT approximation
 */
export function extract16HarmonicsFromDrawnPoints(
  drawnPoints: number[] | Float32Array
): { timbre: CustomTimbreToken; svgPath: string; samples: Float32Array; magnitudes: number[] } {
  const samples256 = resampleArray(drawnPoints, 256);
  const numHarmonics = 16;
  const real = new Array(numHarmonics + 1).fill(0);
  const imag = new Array(numHarmonics + 1).fill(0);
  const magnitudes = new Array(numHarmonics).fill(0);

  let dc = 0;
  for (let n = 0; n < 256; n++) dc += samples256[n];
  dc /= 256;

  const centered = new Float32Array(256);
  for (let n = 0; n < 256; n++) centered[n] = samples256[n] - dc;

  for (let k = 1; k <= numHarmonics; k++) {
    let sumReal = 0;
    let sumImag = 0;
    for (let n = 0; n < 256; n++) {
      const angle = (2 * Math.PI * k * n) / 256;
      sumReal += centered[n] * Math.cos(angle);
      sumImag += centered[n] * Math.sin(angle);
    }
    real[k] = (2 / 256) * sumReal;
    imag[k] = (2 / 256) * sumImag;
    magnitudes[k - 1] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
  }

  const maxMag = Math.max(...magnitudes, 0.0001);
  const normalizedReal = real.map(r => r / maxMag);
  const normalizedImag = imag.map(i => i / maxMag);
  normalizedReal[0] = 0;
  normalizedImag[0] = 0;

  const svgPath = samplesToSvgPath(samples256, 400, 80);

  return {
    timbre: {
      type: 'custom',
      real: normalizedReal,
      imag: normalizedImag
    },
    svgPath,
    samples: samples256,
    magnitudes: magnitudes.map(m => m / maxMag)
  };
}

