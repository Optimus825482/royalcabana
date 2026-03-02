"use client";

import { useCallback, useRef } from "react";

type SoundType = "info" | "success" | "warning" | "error";

/**
 * Web Audio API ile programatik ses üretir.
 * Harici ses dosyasına ihtiyaç duymaz.
 */
export function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (
      frequency: number,
      duration: number,
      type: OscillatorType = "sine",
      volume = 0.15,
    ) => {
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);

        // Smooth envelope — attack + release
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + duration,
        );

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch {
        // AudioContext not supported — silently ignore
      }
    },
    [getCtx],
  );

  const play = useCallback(
    (soundType: SoundType) => {
      switch (soundType) {
        case "success": {
          // İki tonlu yükselen bip — onay sesi
          playTone(523.25, 0.15, "sine", 0.12); // C5
          setTimeout(() => playTone(659.25, 0.25, "sine", 0.12), 120); // E5
          break;
        }
        case "warning": {
          // Üç tonlu uyarı — dikkat çekici
          playTone(440, 0.12, "triangle", 0.14); // A4
          setTimeout(() => playTone(440, 0.12, "triangle", 0.14), 150);
          setTimeout(() => playTone(523.25, 0.2, "triangle", 0.14), 300); // C5
          break;
        }
        case "error": {
          // Düşen ton — red/hata sesi
          playTone(440, 0.2, "sawtooth", 0.08); // A4
          setTimeout(() => playTone(349.23, 0.3, "sawtooth", 0.08), 180); // F4
          break;
        }
        case "info":
        default: {
          // Tek kısa bip — yeni talep
          playTone(880, 0.18, "sine", 0.1); // A5
          setTimeout(() => playTone(1046.5, 0.22, "sine", 0.1), 140); // C6
          setTimeout(() => playTone(1318.5, 0.15, "sine", 0.08), 300); // E6
          break;
        }
      }
    },
    [playTone],
  );

  return { play };
}
