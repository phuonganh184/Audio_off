import { EQ_BANDS, EQ_PRESETS, type EqPresetId } from '@/src/types';

export type EqGains = [number, number, number, number, number];

export interface EqState {
  preset: EqPresetId;
  gains: EqGains;
}

const STORAGE_KEY = 'truyen_audio_eq_v1';

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

interface AttachedPipeline {
  ctx: AudioContext;
  filters: BiquadFilterNode[];
}

const pipelineMap = new WeakMap<HTMLAudioElement, AttachedPipeline>();

export function attachEqualizerToAudioElement(
  audioEl: HTMLAudioElement,
  gains: EqGains
): AttachedPipeline | null {
  if (typeof window === 'undefined') return null;
  const existing = pipelineMap.get(audioEl);
  if (existing) {
    applyGainsToFilters(existing.filters, gains, existing.ctx.currentTime);
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
    node.connect(ctx.destination);

    const pipeline: AttachedPipeline = { ctx, filters };
    pipelineMap.set(audioEl, pipeline);
    return pipeline;
  } catch {
    return null;
  }
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

export async function resumeAndSyncEqualizer(
  audioEl: HTMLAudioElement | null,
  gains: EqGains
): Promise<void> {
  if (!audioEl) return;
  const pipeline = attachEqualizerToAudioElement(audioEl, gains);
  if (!pipeline) return;
  applyGainsToFilters(pipeline.filters, gains, pipeline.ctx.currentTime);
  if (pipeline.ctx.state === 'suspended') {
    try {
      await pipeline.ctx.resume();
    } catch {
      // Ignore autoplay resume error
    }
  }
}

export function updateEqualizerGainsOnAudio(
  audioEl: HTMLAudioElement | null,
  gains: EqGains
): void {
  if (!audioEl) return;
  const pipeline = pipelineMap.get(audioEl);
  if (!pipeline) return;
  applyGainsToFilters(pipeline.filters, gains, pipeline.ctx.currentTime);
}
