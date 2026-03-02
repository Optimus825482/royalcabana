"use client";

import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import type { TimeOfDay } from "./SkyDome";

interface PostProcessingProps {
  timeOfDay?: TimeOfDay;
  enabled?: boolean;
}

const BLOOM_PRESETS: Record<
  TimeOfDay,
  { intensity: number; luminanceThreshold: number }
> = {
  morning: { intensity: 0.3, luminanceThreshold: 0.8 },
  day: { intensity: 0.15, luminanceThreshold: 0.9 },
  sunset: { intensity: 0.5, luminanceThreshold: 0.6 },
  night: { intensity: 0.6, luminanceThreshold: 0.4 },
};

export default function PostProcessing({
  timeOfDay = "day",
  enabled = true,
}: PostProcessingProps) {
  if (!enabled) return null;

  const bloom = BLOOM_PRESETS[timeOfDay];
  const isNight = timeOfDay === "night";

  return (
    <EffectComposer>
      <Bloom
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <Vignette
        offset={0.3}
        darkness={isNight ? 0.7 : 0.4}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        offset={new Vector2(0.0005, 0.0005)}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0}
      />
    </EffectComposer>
  );
}
