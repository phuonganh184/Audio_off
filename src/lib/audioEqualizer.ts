import {
  AUDIO_FILTER_PRESETS,
  EQ_BANDS,
  EQ_PRESETS,
  type AdvancedAudioFilterState,
  type EqPresetId,
} from '@/src/types';

export type EqGains = [number, number, number, number, number];

export interface EqState {
  preset: EqPresetId;
  gains: EqGains;
}

const STORAGE_KEY = 'truyen_audio_eq_v1';
const FILTER_STORAGE_KEY = 'truyen_audio_adv_filter_v1';

export const DEFAULT_AUDIO_FILTER: AdvancedAudioFilterState = {
  preset: 'default',
  denoising: 0,
  reverb: 0,
  voicePriority: true,
};

export function matchAudioFilterPreset(
  denoising: number,
  reverb: number,
  voicePriority: boolean
): AdvancedAudioFilterState['preset'] {
  const matched = AUDIO_FILTER_PRESETS.find(
    (p) =>
      p.denoising === denoising &&
      p.reverb === reverb &&
      p.voicePriority === voicePriority
  );
  return matched ? matched.id : 'custom';
}

export function loadSavedAudioFilterState(): AdvancedAudioFilterState {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_FILTER };
    const parsed = JSON.parse(raw) as Partial<AdvancedAudioFilterState>;
    const denoising =
      typeof parsed.denoising === 'number' && isFinite(parsed.denoising)
        ? Math.max(0, Math.min(100, Math.round(parsed.denoising)))
        : 0;
    const reverb =
      typeof parsed.reverb === 'number' && isFinite(parsed.reverb)
        ? Math.max(0, Math.min(100, Math.round(parsed.reverb)))
        : 0;
    const voicePriority =
      typeof parsed.voicePriority === 'boolean' ? parsed.voicePriority : true;
    return {
      preset: matchAudioFilterPreset(denoising, reverb, voicePriority),
      denoising,
      reverb,
      voicePriority,
    };
  } catch {
    return { ...DEFAULT_AUDIO_FILTER };
  }
}

export function saveAudioFilterState(state: AdvancedAudioFilterState): void {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSavedEqState(): EqState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preset: 'flat', gains: [0, 0, 0, 0, 0] };
    const parsed = JSON.parse(raw) as Partial<EqState>;
    if (
      Array.isArray(parsed.gains) &&
      parsed.gains.length === 5 &&
      parsed.gains.every((n) => typeof n === 'number' && isFinite(n))
    ) {
      const clamped = parsed.gains.map((g) => Math.max(-12, Math.min(12, Math.round(g)))) as EqGains;
      const matched = EQ_PRESETS.find((p) => p.gains.every((v, idx) => v === clamped[idx]));
      return {
        preset: matched ? matched.id : 'custom',
        gains: clamped,
      };
    }
  } catch {
    // Ignore invalid storage
  }
  return { preset: 'flat', gains: [0, 0, 0, 0, 0] };
}

export function saveEqState(state: EqState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

interface VoiceFilterNodes {
  highpass: BiquadFilterNode;
  presence: BiquadFilterNode;
  lowpass: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  dryGain: GainNode;
  wetGain: GainNode;
}

interface AttachedPipeline {
  ctx: AudioContext;
  filters: BiquadFilterNode[];
  voiceNodes?: VoiceFilterNodes;
}

const pipelineMap = new WeakMap<HTMLAudioElement, AttachedPipeline>();
const impulseCache = new WeakMap<AudioContext, AudioBuffer>();

function getRoomImpulseBuffer(ctx: AudioContext): AudioBuffer {
  const existing = impulseCache.get(ctx);
  if (existing) return existing;

  const sampleRate = ctx.sampleRate || 44100;
  const durationSec = 1.35;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Smooth room decay with early diffusion fade-in & warm high-frequency damping
      const attack = Math.min(1, i / (sampleRate * 0.018));
      const decay = Math.pow(1 - t, 2.75);
      const white = Math.random() * 2 - 1;
      lp = lp * 0.62 + white * 0.38;
      data[i] = lp * attack * decay * 0.65;
    }
  }

  impulseCache.set(ctx, buffer);
  return buffer;
}

function applyGainsToFilters(
  filters: BiquadFilterNode[],
  gains: EqGains,
  currentTime: number
): void {
  filters.forEach((f, idx) => {
    const target = Math.max(-12, Math.min(12, gains[idx] ?? 0));
    try {
      f.gain.setTargetAtTime(target, currentTime, 0.015);
    } catch {
      f.gain.value = target;
    }
  });
}

function applyVoiceFilterNodes(
  nodes: VoiceFilterNodes | undefined,
  filterState: AdvancedAudioFilterState,
  currentTime: number
): void {
  if (!nodes) return;
  const denoiseNorm = Math.max(0, Math.min(1, filterState.denoising / 100));
  const reverbNorm = Math.max(0, Math.min(1, filterState.reverb / 100));

  // Sub-bass rumble cut (20Hz transparent -> 200Hz clean vocal floor)
  const hpFreq = 20 + denoiseNorm * 180;
  // Upper hiss tame (20kHz transparent -> 6.2kHz smooth speech focus)
  const lpFreq = denoiseNorm === 0 ? 20000 : 16500 - denoiseNorm * 10300;
  // Vocal clarity / presence boost around 2.4kHz (+0dB .. +5.5dB + subtle priority lift)
  const priorityLift = filterState.voicePriority && denoiseNorm > 0 ? 1.5 : 0;
  const presenceGain = denoiseNorm * 5.0 + priorityLift;

  // Gentle dynamic compression so quiet syllables stay legible above ambient rain
  const compThreshold = -12 - denoiseNorm * 13;
  const compRatio = 1 + denoiseNorm * 2.8;

  // Dry/wet reverb mix
  const wet = reverbNorm * 0.52;
  const dry = 1 - reverbNorm * 0.2;

  try {
    nodes.highpass.frequency.setTargetAtTime(hpFreq, currentTime, 0.02);
    nodes.lowpass.frequency.setTargetAtTime(lpFreq, currentTime, 0.02);
    nodes.presence.gain.setTargetAtTime(presenceGain, currentTime, 0.02);
    nodes.compressor.threshold.setTargetAtTime(compThreshold, currentTime, 0.02);
    nodes.compressor.ratio.setTargetAtTime(compRatio, currentTime, 0.02);
    nodes.dryGain.gain.setTargetAtTime(dry, currentTime, 0.02);
    nodes.wetGain.gain.setTargetAtTime(wet, currentTime, 0.02);
  } catch {
    nodes.highpass.frequency.value = hpFreq;
    nodes.lowpass.frequency.value = lpFreq;
    nodes.presence.gain.value = presenceGain;
    nodes.compressor.threshold.value = compThreshold;
    nodes.compressor.ratio.value = compRatio;
    nodes.dryGain.gain.value = dry;
    nodes.wetGain.gain.value = wet;
  }
}

export function attachEqualizerToAudioElement(
  audioEl: HTMLAudioElement,
  gains: EqGains,
  options?: { isVoiceStream?: boolean; advancedFilter?: AdvancedAudioFilterState }
): AttachedPipeline | null {
  if (typeof window === 'undefined') return null;
  const existing = pipelineMap.get(audioEl);
  if (existing) {
    applyGainsToFilters(existing.filters, gains, existing.ctx.currentTime);
    if (options?.advancedFilter) {
      applyVoiceFilterNodes(existing.voiceNodes, options.advancedFilter, existing.ctx.currentTime);
    }
    return existing;
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  try {
    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(audioEl);
    const filters = EQ_BANDS.map((band, idx) => {
      const filter = ctx.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      if (band.type === 'peaking') {
        filter.Q.value = 1.1;
      }
      filter.gain.value = gains[idx] ?? 0;
      return filter;
    });

    let node: AudioNode = source;
    for (const f of filters) {
      node.connect(f);
      node = f;
    }

    const isVoiceStream = options?.isVoiceStream !== false;
    let voiceNodes: VoiceFilterNodes | undefined;

    if (isVoiceStream) {
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.Q.value = 0.707;

      const presence = ctx.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 2400;
      presence.Q.value = 1.05;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.Q.value = 0.65;

      const compressor = ctx.createDynamicsCompressor();
      compressor.knee.value = 18;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.14;

      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();

      const reverbPreHp = ctx.createBiquadFilter();
      reverbPreHp.type = 'highpass';
      reverbPreHp.frequency.value = 240;

      const convolver = ctx.createConvolver();
      convolver.buffer = getRoomImpulseBuffer(ctx);

      node.connect(highpass);
      highpass.connect(presence);
      presence.connect(lowpass);
      lowpass.connect(compressor);

      compressor.connect(dryGain);
      dryGain.connect(ctx.destination);

      compressor.connect(reverbPreHp);
      reverbPreHp.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(ctx.destination);

      voiceNodes = {
        highpass,
        presence,
        lowpass,
        compressor,
        dryGain,
        wetGain,
      };
      applyVoiceFilterNodes(
        voiceNodes,
        options?.advancedFilter || DEFAULT_AUDIO_FILTER,
        ctx.currentTime
      );
    } else {
      node.connect(ctx.destination);
    }

    const pipeline: AttachedPipeline = { ctx, filters, voiceNodes };
    pipelineMap.set(audioEl, pipeline);
    return pipeline;
  } catch {
    return null;
  }
}

export async function resumeAndSyncEqualizer(
  audioEl: HTMLAudioElement | null,
  gains: EqGains,
  options?: { isVoiceStream?: boolean; advancedFilter?: AdvancedAudioFilterState }
): Promise<void> {
  if (!audioEl) return;
  const pipeline = attachEqualizerToAudioElement(audioEl, gains, options);
  if (!pipeline) return;
  applyGainsToFilters(pipeline.filters, gains, pipeline.ctx.currentTime);
  if (options?.advancedFilter) {
    applyVoiceFilterNodes(pipeline.voiceNodes, options.advancedFilter, pipeline.ctx.currentTime);
  }
  if (pipeline.ctx.state === 'suspended') {
    try {
      await pipeline.ctx.resume();
    } catch {
      // Ignore autoplay resume error
    }
  }
}

export function hasEqualizerAttached(audioEl: HTMLAudioElement | null): boolean {
  return !!audioEl && pipelineMap.has(audioEl);
}

export function updateEqualizerGainsOnAudio(
  audioEl: HTMLAudioElement | null,
  gains: EqGains
): void {
  if (!audioEl) return;
  const pipeline = pipelineMap.get(audioEl);
  if (!pipeline) return;
  applyGainsToFilters(pipeline.filters, gains, pipeline.ctx.currentTime);
  if (pipeline.ctx.state === 'suspended') {
    void pipeline.ctx.resume();
  }
}

export function updateAdvancedFilterOnAudio(
  audioEl: HTMLAudioElement | null,
  filterState: AdvancedAudioFilterState
): void {
  if (!audioEl) return;
  const pipeline = pipelineMap.get(audioEl);
  if (!pipeline) return;
  applyVoiceFilterNodes(pipeline.voiceNodes, filterState, pipeline.ctx.currentTime);
  if (pipeline.ctx.state === 'suspended') {
    void pipeline.ctx.resume();
  }
}
