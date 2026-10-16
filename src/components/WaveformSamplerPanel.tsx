import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { 
  Upload, Mic, PenTool, Play, Check, RefreshCw, Volume2, 
  Sparkles, Layers, Sliders, ArrowRight, Music2, AlertCircle, FileAudio,
  Scissors, PlayCircle, StopCircle, Disc
} from 'lucide-react';
import { BrandTokens, audioEngine, COMPONENT_DEFS, resolveNotes } from '../lib/audio';
import { 
  CustomTimbreToken, 
  WaveformAnalysisResult,
  extractHarmonicsFromAudioBuffer,
  extractHarmonicsFromBufferSlice,
  extractHarmonicsFromDrawnPoints,
  extract16HarmonicsFromTransient,
  extract16HarmonicsFromDrawnPoints,
  computeWaveformPeaks,
  createSyntheticSampleBuffer,
  reconstructWaveform,
  samplesToSvgPath
} from '../lib/waveformAnalysis';
import { ThemeCustomizerPanel } from './ThemeCustomizerPanel';

interface WaveformSamplerPanelProps {
  brand: BrandTokens;
  onUpdateBrandTimbre: (timbre: BrandTokens['timbre']) => void;
  onNavigateToExplorer?: () => void;
}

export function WaveformSamplerPanel({ 
  brand, 
  onUpdateBrandTimbre,
  onNavigateToExplorer
}: WaveformSamplerPanelProps) {
  // Brand Timbre pill tabs: [ Synthesise ] [ Sample ] [ Draw ]
  const [timbreTab, setTimbreTab] = useState<'synthesise' | 'sample' | 'draw'>(() => {
    return typeof brand.timbre === 'object' ? 'sample' : 'synthesise';
  });

  const [activeMode, setActiveMode] = useState<'upload' | 'record' | 'draw'>('upload');

  // Preview timbre button state
  const [isPreviewingTimbre, setIsPreviewingTimbre] = useState(false);

  // SVG Waveform state & Filename label
  const [sampleFilename, setSampleFilename] = useState<string>('acoustic_bell.wav');
  const [svgWaveformPath, setSvgWaveformPath] = useState<string>(() => {
    if (typeof brand.timbre === 'object' && brand.timbre?.type === 'custom') {
      const reconstructed = reconstructWaveform(brand.timbre.real, brand.timbre.imag, 256);
      return samplesToSvgPath(reconstructed, 400, 80);
    }
    return '';
  });

  // Currently analyzed / sampled waveform result
  const [currentAnalysis, setCurrentAnalysis] = useState<WaveformAnalysisResult | null>(() => {
    if (typeof brand.timbre === 'object' && brand.timbre?.type === 'custom') {
      const real = brand.timbre.real;
      const imag = brand.timbre.imag;
      const reconstructed = reconstructWaveform(real, imag, 256);
      const mags = [];
      for (let k = 1; k <= 32; k++) {
        mags.push(Math.sqrt((real[k] || 0) ** 2 + (imag[k] || 0) ** 2));
      }
      const maxM = Math.max(...mags, 0.001);
      return {
        timbre: brand.timbre,
        samples: reconstructed,
        harmonicMagnitudes: mags.map(m => m / maxM),
        fundamentalFreq: 440,
        duration: 1.0
      };
    }
    return null;
  });

  // State for loaded audio buffer (from Upload, Mic, or Preset)
  const [loadedBuffer, setLoadedBuffer] = useState<AudioBuffer | null>(null);
  const [loadedPeaks, setLoadedPeaks] = useState<{ min: Float32Array; max: Float32Array } | null>(null);
  const [audioSourceTitle, setAudioSourceTitle] = useState<string>('Warm Bell Sample');

  // SLICE STATE: Normalized range 0.0 to 1.0
  const [sliceRange, setSliceRange] = useState<{ start: number; end: number }>({ start: 0.08, end: 0.28 });
  const [isDraggingSlice, setIsDraggingSlice] = useState<'start' | 'end' | 'body' | null>(null);
  const dragStartPosRef = useRef<{ mouseX: number; initialStart: number; initialEnd: number }>({ mouseX: 0, initialStart: 0, initialEnd: 0 });
  const [activeGridSlice, setActiveGridSlice] = useState<number | null>(null);

  // Audio Playback state (Full audio or Slice)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playheadPos, setPlayheadPos] = useState<number | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // State for Upload WAV
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  // State for Record Mic
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(2);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // State for Draw Mode
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawnPointsRef = useRef<number[]>(new Array(256).fill(0));
  const [drawPreset, setDrawPreset] = useState<string>('sine');

  // Before / After Preview States
  const [previewPlayingState, setPreviewPlayingState] = useState<'idle' | 'sine' | 'sampled' | 'sequence-sine' | 'sequence-sampled'>('idle');

  // Canvases
  const slicerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load a starter sample on initial load so user can immediately slice without searching for a file
  useEffect(() => {
    loadPresetAudio('bell');
  }, []);

  const loadPresetAudio = async (presetType: 'bell' | 'organ' | 'pluck' | 'chime') => {
    try {
      await audioEngine.init();
      const rawCtx = (Tone.getContext().rawContext as AudioContext) || new AudioContext();
      const buffer = createSyntheticSampleBuffer(presetType, rawCtx);
      setLoadedBuffer(buffer);
      setLoadedPeaks(computeWaveformPeaks(buffer.getChannelData(0), 400));
      setAudioSourceTitle(`Preset: ${presetType.toUpperCase()}`);
      
      // Default slice: 10% to 30%
      const newRange = { start: 0.10, end: 0.32 };
      setSliceRange(newRange);
      extractAndApplySlice(buffer, newRange.start, newRange.end);
    } catch (e) {
      console.error('Failed to generate starter preset:', e);
    }
  };

  /**
   * Extract 32 harmonics from a specific slice of the loaded audio buffer
   */
  const extractAndApplySlice = useCallback((buffer: AudioBuffer, startRatio: number, endRatio: number) => {
    const channelData = buffer.getChannelData(0);
    const startSample = Math.floor(startRatio * channelData.length);
    const endSample = Math.floor(endRatio * channelData.length);

    const result = extractHarmonicsFromBufferSlice(channelData, buffer.sampleRate, startSample, endSample);
    setCurrentAnalysis(result);
    onUpdateBrandTimbre(result.timbre);
  }, [onUpdateBrandTimbre]);

  // Whenever sliceRange changes, re-extract harmonics
  const handleSliceChange = (start: number, end: number) => {
    const clampedStart = Math.max(0, Math.min(0.98, start));
    const clampedEnd = Math.max(clampedStart + 0.02, Math.min(1.0, end));
    const newRange = { start: clampedStart, end: clampedEnd };
    setSliceRange(newRange);

    if (loadedBuffer) {
      extractAndApplySlice(loadedBuffer, newRange.start, newRange.end);
    }
  };

  // Redraw Slicer Canvas whenever buffer, sliceRange, or playhead updates
  useEffect(() => {
    drawSlicerCanvas();
  }, [loadedBuffer, loadedPeaks, sliceRange, playheadPos]);

  // Redraw single-cycle visualizer whenever currentAnalysis updates
  useEffect(() => {
    if (!currentAnalysis) return;
    drawSingleCycleVisualizer(currentAnalysis.samples);
  }, [currentAnalysis]);

  /**
   * Draw the Interactive Waveform Slicer with visual slice boundaries
   */
  const drawSlicerCanvas = () => {
    const canvas = slicerCanvasRef.current;
    if (!canvas || !loadedPeaks) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const { min, max } = loadedPeaks;
    const numBars = min.length;
    const barWidth = w / numBars;

    const sliceStartX = sliceRange.start * w;
    const sliceEndX = sliceRange.end * w;

    // Draw waveform bars
    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const topY = (h / 2) - (max[i] * (h * 0.44));
      const bottomY = (h / 2) - (min[i] * (h * 0.44));
      const barH = Math.max(2, bottomY - topY);

      const isInSlice = x >= sliceStartX && x <= sliceEndX;

      if (isInSlice) {
        ctx.fillStyle = '#38BDF8'; // Bright cyan for selected slice
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Dimmed grey for unselected
      }

      ctx.fillRect(x, topY, Math.max(1, barWidth - 0.5), barH);
    }

    // Shaded mask outside slice
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    // Left mask
    ctx.fillRect(0, 0, sliceStartX, h);
    // Right mask
    ctx.fillRect(sliceEndX, 0, w - sliceEndX, h);

    // Highlight slice window background
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.fillRect(sliceStartX, 0, sliceEndX - sliceStartX, h);

    // Slice Left Border & Handle
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sliceStartX, 0);
    ctx.lineTo(sliceStartX, h);
    ctx.stroke();

    // Slice Right Border & Handle
    ctx.beginPath();
    ctx.moveTo(sliceEndX, 0);
    ctx.lineTo(sliceEndX, h);
    ctx.stroke();

    // Top slice connector line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sliceStartX, 4);
    ctx.lineTo(sliceEndX, 4);
    ctx.moveTo(sliceStartX, h - 4);
    ctx.lineTo(sliceEndX, h - 4);
    ctx.stroke();

    // Left Handle Tag
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(sliceStartX - 6, 0, 12, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sliceStartX - 1.5, 5, 3, 12);

    // Right Handle Tag
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(sliceEndX - 6, 0, 12, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sliceEndX - 1.5, 5, 3, 12);

    // Center scrub grip icon in slice header
    const midX = (sliceStartX + sliceEndX) / 2;
    if (sliceEndX - sliceStartX > 40) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fillRect(midX - 14, h / 2 - 12, 28, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(midX - 6, h / 2 - 6, 2, 12);
      ctx.fillRect(midX - 1, h / 2 - 6, 2, 12);
      ctx.fillRect(midX + 4, h / 2 - 6, 2, 12);
    }

    // Playhead line if playing
    if (playheadPos !== null) {
      const playheadX = playheadPos * w;
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  };

  /**
   * Slicer Mouse & Touch Interactions
   */
  const handleSlicerMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = slicerCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const ratio = x / canvas.width;

    const sliceStartX = sliceRange.start * canvas.width;
    const sliceEndX = sliceRange.end * canvas.width;
    const tolerance = 14;

    dragStartPosRef.current = {
      mouseX: x,
      initialStart: sliceRange.start,
      initialEnd: sliceRange.end
    };

    if (Math.abs(x - sliceStartX) <= tolerance) {
      setIsDraggingSlice('start');
    } else if (Math.abs(x - sliceEndX) <= tolerance) {
      setIsDraggingSlice('end');
    } else if (x > sliceStartX && x < sliceEndX) {
      setIsDraggingSlice('body');
    } else {
      // Clicked outside slice window: center a slice around clicked position
      const sliceWidth = sliceRange.end - sliceRange.start;
      const newStart = Math.max(0, Math.min(1 - sliceWidth, ratio - sliceWidth / 2));
      handleSliceChange(newStart, newStart + sliceWidth);
      setIsDraggingSlice('body');
      dragStartPosRef.current = {
        mouseX: x,
        initialStart: newStart,
        initialEnd: newStart + sliceWidth
      };
    }
  };

  const handleSlicerMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingSlice || !slicerCanvasRef.current) return;
    const canvas = slicerCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const deltaRatio = (x - dragStartPosRef.current.mouseX) / canvas.width;

    const { initialStart, initialEnd } = dragStartPosRef.current;
    const width = initialEnd - initialStart;

    if (isDraggingSlice === 'start') {
      const nextStart = Math.max(0, Math.min(initialEnd - 0.02, initialStart + deltaRatio));
      handleSliceChange(nextStart, sliceRange.end);
    } else if (isDraggingSlice === 'end') {
      const nextEnd = Math.max(sliceRange.start + 0.02, Math.min(1.0, initialEnd + deltaRatio));
      handleSliceChange(sliceRange.start, nextEnd);
    } else if (isDraggingSlice === 'body') {
      let nextStart = initialStart + deltaRatio;
      let nextEnd = initialEnd + deltaRatio;

      if (nextStart < 0) {
        nextStart = 0;
        nextEnd = width;
      } else if (nextEnd > 1.0) {
        nextEnd = 1.0;
        nextStart = 1.0 - width;
      }
      handleSliceChange(nextStart, nextEnd);
    }
  };

  const handleSlicerMouseUp = () => {
    setIsDraggingSlice(null);
  };

  /**
   * Quick Slice Presets / Divisions
   */
  const applyPresetSlice = (startRatio: number, endRatio: number, gridIdx?: number) => {
    setActiveGridSlice(gridIdx ?? null);
    handleSliceChange(startRatio, endRatio);
  };

  const applyGridDivision = (divisionCount: number, index: number) => {
    const sliceWidth = 1 / divisionCount;
    const start = index * sliceWidth;
    const end = start + sliceWidth;
    applyPresetSlice(start, end, index);
  };

  /**
   * Audition Audio: Slice Only or Full File
   */
  const stopAudioPlayback = () => {
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current.disconnect();
      } catch (e) {}
      activeSourceNodeRef.current = null;
    }
    setIsPlayingAudio(false);
    setPlayheadPos(null);
  };

  const playAudioSlice = async () => {
    if (!loadedBuffer) return;
    stopAudioPlayback();
    await audioEngine.init();

    const rawCtx = (Tone.getContext().rawContext as AudioContext) || new AudioContext();
    const source = rawCtx.createBufferSource();
    source.buffer = loadedBuffer;

    const startSec = sliceRange.start * loadedBuffer.duration;
    const durationSec = (sliceRange.end - sliceRange.start) * loadedBuffer.duration;

    source.connect(rawCtx.destination);
    source.start(0, startSec, durationSec);
    activeSourceNodeRef.current = source;
    setIsPlayingAudio(true);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = elapsed / durationSec;
      if (progress >= 1.0) {
        clearInterval(interval);
        setIsPlayingAudio(false);
        setPlayheadPos(null);
      } else {
        setPlayheadPos(sliceRange.start + progress * (sliceRange.end - sliceRange.start));
      }
    }, 30);

    source.onended = () => {
      clearInterval(interval);
      setIsPlayingAudio(false);
      setPlayheadPos(null);
    };
  };

  const playFullAudio = async () => {
    if (!loadedBuffer) return;
    stopAudioPlayback();
    await audioEngine.init();

    const rawCtx = (Tone.getContext().rawContext as AudioContext) || new AudioContext();
    const source = rawCtx.createBufferSource();
    source.buffer = loadedBuffer;

    source.connect(rawCtx.destination);
    source.start(0);
    activeSourceNodeRef.current = source;
    setIsPlayingAudio(true);

    const startTime = Date.now();
    const totalDuration = loadedBuffer.duration;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = elapsed / totalDuration;
      if (progress >= 1.0) {
        clearInterval(interval);
        setIsPlayingAudio(false);
        setPlayheadPos(null);
      } else {
        setPlayheadPos(progress);
      }
    }, 30);

    source.onended = () => {
      clearInterval(interval);
      setIsPlayingAudio(false);
      setPlayheadPos(null);
    };
  };

  /**
   * Draw the single cycle visualizer
   */
  const drawSingleCycleVisualizer = (samples: Float32Array) => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((w / 4) * i, 0);
      ctx.lineTo((w / 4) * i, h);
      ctx.stroke();
    }

    // Glow wave
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#38BDF8';
    ctx.beginPath();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;

    for (let i = 0; i < samples.length; i++) {
      const x = (i / (samples.length - 1)) * w;
      const y = (h / 2) - (samples[i] * (h * 0.38));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  /**
   * Handle WAV File Upload
   */
  const handleWavFile = async (file: File) => {
    setUploadError(null);
    const isSupported = /\.(wav|mp3|ogg)$/i.test(file.name) || file.type.includes('audio');
    if (!isSupported) {
      setUploadError('Please select a valid .wav, .mp3, or .ogg audio file.');
      return;
    }

    setIsDecoding(true);
    setAudioSourceTitle(file.name);
    setSampleFilename(file.name);

    try {
      await audioEngine.init();
      const rawCtx = (Tone.getContext().rawContext as AudioContext) || new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await rawCtx.decodeAudioData(arrayBuffer);

      // CHANGE 1:
      // 1. Decode with AudioContext.decodeAudioData()
      // 2. Take first 0.1s (attack transient)
      // 3. FFT via AnalyserNode (fftSize: 2048)
      // 4. Extract first 16 harmonics -> real[] imag[]
      // 5. Normalise so max value = 1.0
      // 6. Store: brand.timbre = { type:'custom', real, imag }
      // 7. Show SVG waveform visualisation
      const transientResult = extract16HarmonicsFromTransient(audioBuffer, rawCtx);
      setCurrentAnalysis({
        timbre: transientResult.timbre,
        samples: transientResult.samples,
        harmonicMagnitudes: transientResult.magnitudes,
        fundamentalFreq: 440,
        duration: 0.1
      });
      setSvgWaveformPath(transientResult.svgPath);
      onUpdateBrandTimbre(transientResult.timbre);

      setLoadedBuffer(audioBuffer);
      setLoadedPeaks(computeWaveformPeaks(audioBuffer.getChannelData(0), 400));
      setSliceRange({ start: 0.0, end: Math.min(1.0, 0.1 / audioBuffer.duration) });
    } catch (err: any) {
      console.error('Failed to decode audio file:', err);
      setUploadError(`Failed to decode audio: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDecoding(false);
    }
  };

  /**
   * Record Mic
   */
  const startMicRecording = async () => {
    setMicError(null);
    setIsRecording(true);
    setRecordProgress(0);
    setRecordSecondsLeft(2);

    try {
      await audioEngine.init();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const rawCtx = (Tone.getContext().rawContext as AudioContext) || new AudioContext();
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;

        try {
          const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const decoded = await rawCtx.decodeAudioData(arrayBuffer);

          const transientResult = extract16HarmonicsFromTransient(decoded, rawCtx);
          setCurrentAnalysis({
            timbre: transientResult.timbre,
            samples: transientResult.samples,
            harmonicMagnitudes: transientResult.magnitudes,
            fundamentalFreq: 440,
            duration: 0.1
          });
          setSvgWaveformPath(transientResult.svgPath);
          setSampleFilename('Microphone Capture (2.0s)');
          onUpdateBrandTimbre(transientResult.timbre);

          setLoadedBuffer(decoded);
          setLoadedPeaks(computeWaveformPeaks(decoded.getChannelData(0), 400));
          setAudioSourceTitle('Microphone Capture (2.0s)');
          setSliceRange({ start: 0.0, end: Math.min(1.0, 0.1 / decoded.duration) });
        } catch (e: any) {
          console.error('Error processing mic recording:', e);
          setMicError('Error analyzing recording. Please try speaking or humming steadily.');
        } finally {
          setIsRecording(false);
        }
      };

      mediaRecorder.start();

      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(100, (elapsed / 2.0) * 100);
        setRecordProgress(progress);
        setRecordSecondsLeft(Math.max(0, parseFloat((2.0 - elapsed).toFixed(1))));

        if (elapsed >= 2.0) {
          clearInterval(timer);
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      }, 50);

    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setMicError(err.message || 'Microphone access denied or unavailable.');
      setIsRecording(false);
    }
  };

  /**
   * Draw Mode Handlers
   */
  const initializeCanvasWithPreset = (preset: string) => {
    setDrawPreset(preset);
    const pts = new Array(256).fill(0);

    for (let i = 0; i < 256; i++) {
      const phase = (i / 256) * Math.PI * 2;
      let val = 0;

      switch (preset) {
        case 'sine':
          val = Math.sin(phase);
          break;
        case 'triangle':
          val = Math.asin(Math.sin(phase)) * (2 / Math.PI);
          break;
        case 'square':
          val = Math.sin(phase) >= 0 ? 0.8 : -0.8;
          break;
        case 'sawtooth':
          val = (2 * (i / 256)) - 1;
          break;
        case 'bell':
          val = 0.7 * Math.sin(phase) + 0.3 * Math.sin(phase * 2) + 0.15 * Math.sin(phase * 3);
          break;
        case 'chime':
          val = 0.6 * Math.sin(phase) + 0.3 * Math.sin(phase * 3) + 0.2 * Math.sin(phase * 5);
          break;
        default:
          val = Math.sin(phase);
      }
      pts[i] = val;
    }

    drawnPointsRef.current = pts;
    redrawDrawCanvas(pts);

    const result = extractHarmonicsFromDrawnPoints(pts);
    setCurrentAnalysis(result);
    onUpdateBrandTimbre(result.timbre);
  };

  const redrawDrawCanvas = (points: number[]) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < points.length; i++) {
      const x = (i / (points.length - 1)) * w;
      const y = (h / 2) - (points[i] * (h * 0.38));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const handleDrawInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mouseX = Math.max(0, Math.min(canvas.width, (e.clientX - rect.left) * (canvas.width / rect.width)));
    const mouseY = Math.max(0, Math.min(canvas.height, (e.clientY - rect.top) * (canvas.height / rect.height)));

    const pointIndex = Math.min(255, Math.floor((mouseX / canvas.width) * 256));
    const amp = -((mouseY - canvas.height / 2) / (canvas.height * 0.38));
    const clampedAmp = Math.max(-1, Math.min(1, amp));

    const brushRadius = 8;
    for (let dx = -brushRadius; dx <= brushRadius; dx++) {
      const idx = pointIndex + dx;
      if (idx >= 0 && idx < 256) {
        const falloff = Math.cos((dx / brushRadius) * (Math.PI / 2));
        drawnPointsRef.current[idx] = drawnPointsRef.current[idx] * (1 - falloff) + clampedAmp * falloff;
      }
    }
    redrawDrawCanvas(drawnPointsRef.current);
  };

  const handleDrawEnd = () => {
    setIsDrawing(false);
    const result = extract16HarmonicsFromDrawnPoints(drawnPointsRef.current);
    setCurrentAnalysis({
      timbre: result.timbre,
      samples: result.samples,
      harmonicMagnitudes: result.magnitudes,
      fundamentalFreq: 440,
      duration: 1.0
    });
    setSvgWaveformPath(result.svgPath);
    onUpdateBrandTimbre(result.timbre);
  };

  const handleClearDraw = () => {
    initializeCanvasWithPreset('sine');
  };

  const handlePreviewTimbre = async () => {
    setIsPreviewingTimbre(true);
    try {
      await audioEngine.previewRootTimbre(brand);
    } catch (e) {
      console.error('Failed to preview brand timbre:', e);
    } finally {
      setTimeout(() => {
        setIsPreviewingTimbre(false);
      }, 700);
    }
  };

  /**
   * Before / After Preview Handlers
   */
  const playPreviewWithSine = async () => {
    setPreviewPlayingState('sine');
    await audioEngine.init();
    audioEngine.play('ui.button.confirm', 'success', brand, { durMult: 0.5 }, 'sine');
    setTimeout(() => setPreviewPlayingState('idle'), 600);
  };

  const playPreviewWithSampled = async () => {
    if (!currentAnalysis) return;
    setPreviewPlayingState('sampled');
    await audioEngine.init();
    audioEngine.play('ui.button.confirm', 'success', brand, { durMult: 0.5 }, currentAnalysis.timbre);
    setTimeout(() => setPreviewPlayingState('idle'), 600);
  };

  const playABSequence = async () => {
    if (!currentAnalysis) return;
    await audioEngine.init();
    
    setPreviewPlayingState('sequence-sine');
    audioEngine.play('ui.button.confirm', 'success', brand, { durMult: 0.5 }, 'sine');

    setTimeout(() => {
      setPreviewPlayingState('sequence-sampled');
      audioEngine.play('ui.button.confirm', 'success', brand, { durMult: 0.5 }, currentAnalysis.timbre);
      
      setTimeout(() => {
        setPreviewPlayingState('idle');
      }, 700);
    }, 550);
  };

  const isCustomActive = typeof brand.timbre === 'object' && brand.timbre?.type === 'custom';

  const totalDurationMs = loadedBuffer ? Math.round(loadedBuffer.duration * 1000) : 1800;
  const sliceStartMs = Math.round(sliceRange.start * totalDurationMs);
  const sliceEndMs = Math.round(sliceRange.end * totalDurationMs);
  const sliceDurMs = sliceEndMs - sliceStartMs;

  return (
    <div className="flex-1 overflow-y-auto bg-app-bg p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-app-border gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scissors size={20} className="text-app-accent" />
              <h2 className="text-base font-bold text-app-text tracking-wide uppercase">
                Waveform Sampler & Slice Studio
              </h2>
              <span className="text-[10px] bg-app-accent/15 text-app-accent px-2 py-0.5 rounded font-mono font-medium">
                Primitive: brand.timbre
              </span>
            </div>
            <p className="text-xs text-app-text-muted leading-relaxed">
              Upload audio, record mic, or draw a cycle. Select any slice of the waveform to extract 32 periodic harmonics. Any chosen slice cascades instantly to all component tokens.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isCustomActive ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded font-medium">
                <Check size={14} /> Custom Timbre Active
              </span>
            ) : (
              <span className="text-xs text-app-text-muted bg-app-surface-light border border-app-border px-3 py-1.5 rounded">
                Default: {typeof brand.timbre === 'string' ? brand.timbre : 'Sine'}
              </span>
            )}

            <button
              onClick={() => onUpdateBrandTimbre('sine')}
              className="text-xs px-3 py-1.5 rounded border border-app-border hover:bg-app-surface-light text-app-text transition-colors"
              title="Revert brand.timbre back to standard sine wave"
            >
              Reset to Sine
            </button>
          </div>
        </div>

        {/* BRAND TIMBRE SECTION WITH THREE PILL TABS */}
        <div className="bg-app-surface border border-app-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-app-accent" />
                <h2 className="text-base font-bold text-app-text tracking-wide uppercase">
                  Brand Timbre
                </h2>
                <span className="text-[10px] bg-app-accent/15 text-app-accent px-2 py-0.5 rounded font-mono font-medium">
                  primitive.timbre: {isCustomActive ? 'custom (16 harmonics)' : typeof brand.timbre === 'string' ? brand.timbre : 'sine'}
                </span>
              </div>
              <p className="text-xs text-app-text-muted mt-1 leading-relaxed">
                Choose the brand&apos;s fundamental oscillator waveform. Changes cascade across all component tokens.
              </p>
            </div>

            {/* [ Preview Timbre ] button for ALL modes */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePreviewTimbre}
                disabled={isPreviewingTimbre}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
                  isPreviewingTimbre
                    ? 'bg-app-accent text-white ring-2 ring-app-accent/50 animate-pulse'
                    : 'bg-app-accent hover:bg-blue-600 text-white'
                }`}
                title={`Audition raw brand timbre on root note of ${brand.scale}`}
              >
                <Volume2 size={15} className={isPreviewingTimbre ? 'animate-bounce' : ''} />
                <span>{isPreviewingTimbre ? 'Playing Root...' : 'Preview Timbre'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateBrandTimbre('sine');
                  setSampleFilename('Default Sine');
                  setSvgWaveformPath('');
                  setTimbreTab('synthesise');
                }}
                className="text-xs px-3 py-2 rounded-lg border border-app-border hover:bg-app-surface-light text-app-text transition-colors"
                title="Reset brand.timbre back to standard sine wave"
              >
                Reset to Sine
              </button>
            </div>
          </div>

          {/* Three Pill Tabs: [ Synthesise ] [ Sample ] [ Draw ] */}
          <div className="flex bg-app-surface-light border border-app-border rounded-xl p-1 gap-1 max-w-md">
            <button
              type="button"
              onClick={() => setTimbreTab('synthesise')}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                timbreTab === 'synthesise'
                  ? 'bg-app-accent text-white shadow-md'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              Synthesise
            </button>
            <button
              type="button"
              onClick={() => setTimbreTab('sample')}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                timbreTab === 'sample'
                  ? 'bg-app-accent text-white shadow-md'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              Sample
            </button>
            <button
              type="button"
              onClick={() => setTimbreTab('draw')}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                timbreTab === 'draw'
                  ? 'bg-app-accent text-white shadow-md'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              Draw
            </button>
          </div>

          {/* 1. SYNTHESISE MODE */}
          {timbreTab === 'synthesise' && (
            <div className="space-y-4 pt-1">
              <div className="text-xs text-app-text-muted">
                Select from standard mathematical oscillator waveforms:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['sine', 'triangle', 'square', 'sawtooth'] as const).map(w => {
                  const isSelected = brand.timbre === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onUpdateBrandTimbre(w)}
                      className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 capitalize text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-app-accent/15 border-app-accent text-app-accent shadow-sm ring-1 ring-app-accent/40 font-bold'
                          : 'bg-app-surface-light/40 border-app-border hover:border-app-text-muted text-app-text'
                      }`}
                    >
                      <Music2 size={16} />
                      <span>{w}</span>
                      <span className="text-[10px] text-app-text-muted uppercase font-mono">
                        {w === 'sine' ? 'Fundamental only' : w === 'triangle' ? 'Odd 1/n²' : w === 'square' ? 'Odd 1/n' : 'All 1/n'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SAMPLE MODE */}
          {timbreTab === 'sample' && (
            <div className="space-y-5 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                {/* [ Upload WAV ] — accepts .wav .mp3 .ogg */}
                <label className="flex items-center gap-2 px-4 py-2 bg-app-accent hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors">
                  <Upload size={15} />
                  <span>{isDecoding ? 'Decoding transient...' : 'Upload WAV'}</span>
                  <input
                    type="file"
                    accept=".wav,.mp3,.ogg,audio/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleWavFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {/* [ Record 2s ] — captures microphone */}
                <button
                  type="button"
                  onClick={isRecording ? undefined : startMicRecording}
                  disabled={isRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-app-surface-light border border-app-border hover:border-app-accent text-app-text'
                  }`}
                >
                  <Mic size={15} className={isRecording ? 'animate-bounce' : ''} />
                  <span>{isRecording ? `Recording (${recordSecondsLeft}s)...` : 'Record 2s'}</span>
                </button>

                {/* [ Reset to Sine ] */}
                <button
                  type="button"
                  onClick={() => {
                    onUpdateBrandTimbre('sine');
                    setSampleFilename('Default Sine');
                    setSvgWaveformPath('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-app-surface-light border border-app-border hover:border-app-text-muted text-app-text text-xs rounded-lg transition-colors ml-auto"
                >
                  <RefreshCw size={12} />
                  <span>Reset to Sine</span>
                </button>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle size={15} /> {uploadError}
                </div>
              )}

              {micError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle size={15} /> {micError}
                </div>
              )}

              {/* Filename label + SVG waveform visualisation */}
              <div className="bg-zinc-950 border border-app-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-app-text-muted">
                    Filename: <span className="text-app-accent font-semibold">{sampleFilename}</span>
                  </span>
                  <span className="text-[10px] text-app-text-muted uppercase">
                    First 0.1s Attack Transient · 16 Harmonics via FFT
                  </span>
                </div>

                <div className="w-full h-[80px] flex items-center justify-center relative overflow-hidden bg-zinc-950 rounded-lg border border-app-border/40">
                  {svgWaveformPath ? (
                    <svg viewBox="0 0 400 80" className="w-full h-[80px] stroke-app-accent fill-none" preserveAspectRatio="none">
                      <path d={svgWaveformPath} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <div className="text-xs text-app-text-muted font-mono flex items-center gap-2">
                      <FileAudio size={16} /> Upload WAV or Record Mic to see extracted transient SVG
                    </div>
                  )}
                </div>
              </div>

              {/* Starter Presets */}
              <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs">
                <span className="text-[10px] text-app-text-muted uppercase font-bold tracking-wider">Presets:</span>
                {[
                  { id: 'bell', label: 'Warm Bell' },
                  { id: 'chime', label: 'Acoustic Chime' },
                  { id: 'organ', label: 'Electric Organ' },
                  { id: 'pluck', label: 'Acoustic Pluck' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => loadPresetAudio(p.id as any)}
                    className="text-[11px] px-2.5 py-1 rounded bg-app-surface-light border border-app-border hover:border-app-accent text-app-text transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. DRAW MODE */}
          {timbreTab === 'draw' && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-app-text-muted">
                <span>Draw waveform by click-drag on canvas. Sampled into 256 points → DFT converts to 16 harmonics:</span>
                <button
                  type="button"
                  onClick={handleClearDraw}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface-light border border-app-border hover:border-app-accent text-app-text rounded-md text-xs transition-colors self-start sm:self-auto"
                >
                  <RefreshCw size={12} /> Clear
                </button>
              </div>

              {/* Full-width canvas, 80px tall, dark background */}
              <div className="relative border border-app-border rounded-xl bg-zinc-950 overflow-hidden shadow-inner cursor-crosshair">
                <canvas
                  ref={drawCanvasRef}
                  width={800}
                  height={80}
                  className="w-full h-[80px] block"
                  onMouseDown={(e) => { setIsDrawing(true); handleDrawInteraction(e); }}
                  onMouseMove={(e) => { if (isDrawing) handleDrawInteraction(e); }}
                  onMouseUp={handleDrawEnd}
                  onMouseLeave={() => { if (isDrawing) handleDrawEnd(); }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono text-app-text-muted">
                <span>Height: 80px • 256 data points • 16 Harmonics (PeriodicWave)</span>
                <span className="text-app-accent font-semibold">Live Cascade Active</span>
              </div>
            </div>
          )}
        </div>

        {/* INTERACTIVE WAVEFORM SLICE SELECTOR (Modes 1 and 2) */}
        {(activeMode === 'upload' || activeMode === 'record') && loadedBuffer && (
          <div className="bg-app-surface border border-app-border rounded-2xl p-6 shadow-2xl space-y-6">
            
            {/* Slice Header & Audition Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Scissors size={18} className="text-app-accent" />
                  <h3 className="text-sm font-bold text-app-text uppercase tracking-wider">
                    Interactive Waveform Slices
                  </h3>
                  <span className="text-[10px] font-mono bg-app-surface-light text-app-text px-2 py-0.5 rounded border border-app-border">
                    {audioSourceTitle} ({totalDurationMs}ms)
                  </span>
                </div>
                <p className="text-xs text-app-text-muted mt-1">
                  Drag the handles or scrub the highlighted region across the waveform to select any slice of the sound.
                </p>
              </div>

              {/* Audition Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={playAudioSlice}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-app-accent hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                  title="Audition only the selected slice audio"
                >
                  <Play size={14} /> Play Slice ({sliceDurMs}ms)
                </button>
                <button
                  onClick={isPlayingAudio ? stopAudioPlayback : playFullAudio}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-app-surface-light border border-app-border hover:border-app-text-muted text-app-text text-xs font-semibold rounded-lg transition-colors"
                  title="Audition full recorded sound"
                >
                  {isPlayingAudio ? <StopCircle size={14} /> : <PlayCircle size={14} />}
                  {isPlayingAudio ? 'Stop' : 'Play Full Audio'}
                </button>
              </div>
            </div>

            {/* WAVEFORM SLICER CANVAS */}
            <div className="space-y-2">
              <div className="relative border-2 border-app-border rounded-xl bg-zinc-950 overflow-hidden shadow-inner select-none cursor-ew-resize">
                <canvas
                  ref={slicerCanvasRef}
                  width={800}
                  height={180}
                  className="w-full h-[180px] block"
                  onMouseDown={handleSlicerMouseDown}
                  onMouseMove={handleSlicerMouseMove}
                  onMouseUp={handleSlicerMouseUp}
                  onMouseLeave={handleSlicerMouseUp}
                />
              </div>

              {/* Timeline Metrics */}
              <div className="flex justify-between items-center text-[11px] font-mono text-app-text-muted px-1">
                <span>0 ms</span>
                <span className="text-app-accent font-semibold">
                  Slice: {sliceStartMs}ms → {sliceEndMs}ms ({sliceDurMs}ms duration)
                </span>
                <span>{totalDurationMs} ms</span>
              </div>
            </div>

            {/* SLICE PRESETS & GRID DIVISORS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Transient Segments */}
              <div className="bg-app-surface-light/40 border border-app-border rounded-xl p-3.5 space-y-2">
                <div className="text-[10px] uppercase font-bold text-app-text-muted tracking-wider">
                  Transient Phase Slices
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Attack', start: 0.02, end: 0.15 },
                    { label: 'Peak', start: 0.15, end: 0.35 },
                    { label: 'Sustain', start: 0.35, end: 0.65 },
                    { label: 'Tail', start: 0.65, end: 0.90 }
                  ].map((s, idx) => (
                    <button
                      key={s.label}
                      onClick={() => applyPresetSlice(s.start, s.end, idx)}
                      className={`text-xs py-1.5 px-2 rounded border text-center transition-colors font-medium ${
                        Math.abs(sliceRange.start - s.start) < 0.03 && Math.abs(sliceRange.end - s.end) < 0.03
                          ? 'bg-app-accent text-white border-app-accent'
                          : 'bg-app-surface border-app-border text-app-text hover:border-app-accent'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Divisor Slices */}
              <div className="bg-app-surface-light/40 border border-app-border rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-app-text-muted tracking-wider">
                  <span>Equal Grid Slices</span>
                  <span className="text-app-accent">Click slice number to focus</span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => (
                    <button
                      key={idx}
                      onClick={() => applyGridDivision(8, idx)}
                      className={`text-[11px] py-1.5 rounded border font-mono text-center transition-colors ${
                        activeGridSlice === idx
                          ? 'bg-app-accent text-white border-app-accent'
                          : 'bg-app-surface border-app-border text-app-text-muted hover:text-app-text'
                      }`}
                      title={`Select Slice ${idx + 1} of 8`}
                    >
                      S{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* HARMONICS & RECONSTRUCTED WAVEFORM VISUALIZATION */}
        {currentAnalysis && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Visualizer 1: Extracted Periodic Waveform */}
            <div className="bg-app-surface border border-app-border rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-app-text-muted">
                  Extracted Single Cycle (Selected Slice)
                </span>
                <span className="text-[10px] font-mono bg-app-surface-light px-2 py-0.5 rounded text-app-text">
                  256 pts • N=32 Harmonics
                </span>
              </div>
              
              <div className="w-full h-[150px] bg-zinc-950 rounded-xl overflow-hidden border border-app-border relative flex items-center justify-center">
                <canvas 
                  ref={visualizerCanvasRef} 
                  width={500} 
                  height={150} 
                  className="w-full h-full block" 
                />
              </div>
              
              <div className="flex justify-between text-[11px] text-app-text-muted font-mono pt-1">
                <span>Cycle pitch: ~{currentAnalysis.fundamentalFreq || 440} Hz</span>
                <span>Type: custom</span>
                <span>createPeriodicWave</span>
              </div>
            </div>

            {/* Visualizer 2: Harmonic Spectrum (1 to 32) */}
            <div className="bg-app-surface border border-app-border rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-app-text-muted">
                  First 32 Harmonics (FFT Magnitude)
                </span>
                <span className="text-[10px] font-mono text-app-accent">
                  H1 (Fundamental) → H32
                </span>
              </div>

              {/* 32 Bar Chart */}
              <div className="w-full h-[150px] bg-zinc-950 rounded-xl p-3 border border-app-border flex items-end gap-[3px]">
                {currentAnalysis.harmonicMagnitudes.map((mag, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div 
                      className="w-full rounded-t transition-all duration-200 group-hover:brightness-125"
                      style={{ 
                        height: `${Math.max(4, Math.round(mag * 100))}%`,
                        backgroundColor: idx === 0 ? '#38BDF8' : idx < 8 ? '#60A5FA' : '#818CF8'
                      }}
                    />
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-zinc-800 text-[9px] text-white px-1.5 py-0.5 rounded shadow pointer-events-none z-10 whitespace-nowrap font-mono">
                      H{idx + 1}: {(mag).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-[11px] text-app-text-muted font-mono pt-1">
                <span>Real: [33 values]</span>
                <span>Imag: [33 values]</span>
                <span>Cascade: brand.timbre</span>
              </div>
            </div>

          </div>
        )}

        {/* BEFORE / AFTER PREVIEW DEMONSTRATION */}
        <div className="bg-gradient-to-r from-app-surface to-app-surface-light border border-app-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app-border/60 pb-4">
            <div>
              <h3 className="text-sm font-bold text-app-text flex items-center gap-2">
                <Volume2 size={18} className="text-app-accent" />
                Before / After Timbre Demonstration (Token Cascade)
              </h3>
              <p className="text-xs text-app-text-muted mt-0.5">
                Play token <code className="text-app-accent font-mono">ui.button.confirm</code> with Pure Sine vs. your Selected Slice Timbre.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={playABSequence}
                disabled={!currentAnalysis || previewPlayingState !== 'idle'}
                className="flex items-center gap-2 px-4 py-2 bg-app-accent hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
              >
                <Play size={14} /> Play A/B Sequence
              </button>
            </div>
          </div>

          {/* Cards for Before vs After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: BEFORE (Sine Wave) */}
            <div className={`p-5 rounded-xl border transition-all ${
              previewPlayingState === 'sine' || previewPlayingState === 'sequence-sine'
                ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'bg-app-surface border-app-border'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-app-text-muted">
                    Before: Pure Sine
                  </span>
                  <div className="text-sm font-mono font-medium text-app-text mt-0.5">
                    Standard Oscillator
                  </div>
                </div>
                <button
                  onClick={playPreviewWithSine}
                  className="p-2.5 rounded-lg bg-app-surface-light border border-app-border hover:border-app-accent text-app-text hover:text-app-accent transition-all"
                  title="Play ui.button.confirm with sine wave"
                >
                  <Play size={16} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-app-text-muted font-mono pt-2 border-t border-app-border/40">
                <div className="flex justify-between">
                  <span>Scale Pitch:</span>
                  <span className="text-app-text">{brand.scale} (Degree 2)</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="text-app-text">{(brand.decayUnit * 0.5 * 1000).toFixed(0)} ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Harmonics:</span>
                  <span className="text-app-text">1 (Fundamental only)</span>
                </div>
              </div>
            </div>

            {/* Card 2: AFTER (Sampled Slice Waveform) */}
            <div className={`p-5 rounded-xl border transition-all ${
              previewPlayingState === 'sampled' || previewPlayingState === 'sequence-sampled'
                ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-app-surface border-app-border'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">
                    After: Selected Slice Timbre
                  </span>
                  <div className="text-sm font-mono font-medium text-app-text mt-0.5">
                    createPeriodicWave(real, imag)
                  </div>
                </div>
                <button
                  onClick={playPreviewWithSampled}
                  disabled={!currentAnalysis}
                  className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white text-emerald-400 transition-all disabled:opacity-50"
                  title="Play ui.button.confirm with selected slice periodic wave"
                >
                  <Play size={16} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-app-text-muted font-mono pt-2 border-t border-app-border/40">
                <div className="flex justify-between">
                  <span>Scale Pitch:</span>
                  <span className="text-emerald-400">{brand.scale} (Degree 2 - Identical)</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="text-emerald-400">{(brand.decayUnit * 0.5 * 1000).toFixed(0)} ms (Identical)</span>
                </div>
                <div className="flex justify-between">
                  <span>Harmonics:</span>
                  <span className="text-emerald-400">32 Periodic Harmonics ({sliceDurMs}ms slice)</span>
                </div>
              </div>
            </div>

          </div>

          {/* TOKEN CASCADE VERIFICATION BOX */}
          <div className="bg-app-surface-light/60 border border-app-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Layers size={22} className="text-app-accent shrink-0" />
              <div className="text-xs text-app-text-muted">
                <span className="font-semibold text-app-text">Sonic Token Cascade in Action:</span>
                {' '}Pitch, duration, and scale remain locked to the brand system. As you slide and select different waveform slices, only the acoustic timbre changes across all component tokens.
              </div>
            </div>

            {onNavigateToExplorer && (
              <button
                onClick={onNavigateToExplorer}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-app-accent hover:underline"
              >
                Test in Explorer <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* VISUAL STYLE & TWEAKCN THEME ENGINE */}
          <ThemeCustomizerPanel />

        </div>

      </div>
    </div>
  );
}
