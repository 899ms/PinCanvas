import type { ModelDef } from '@/types/model';

const DEFAULT_VIDEO_DURATIONS = ['4s', '5s', '6s', '7s', '8s', '9s', '10s'];
const DEFAULT_VIDEO_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
const DEFAULT_VIDEO_RESOLUTIONS = ['720p', '1080p'];

export function videoDurationOptions(model?: ModelDef): string[] {
  return model?.durations?.length ? model.durations : DEFAULT_VIDEO_DURATIONS;
}

export function videoRatioOptions(model?: ModelDef): string[] {
  return model?.ratios?.length ? model.ratios : DEFAULT_VIDEO_RATIOS;
}

export function videoResolutionOptions(model?: ModelDef): string[] {
  return model?.resolutions?.length ? model.resolutions : DEFAULT_VIDEO_RESOLUTIONS;
}

export function firstAllowedVideoValue(
  current: string | number | undefined,
  options: string[],
  preferred: string,
): string {
  const value = current === undefined ? undefined : String(current);
  if (value && options.includes(value)) return value;
  if (options.includes(preferred)) return preferred;
  return options[0] ?? preferred;
}
