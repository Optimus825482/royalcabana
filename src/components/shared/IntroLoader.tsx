"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface IntroLoaderProps {
  onDone: () => void;
}

export default function IntroLoader({ onDone }: IntroLoaderProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 2.5 sn sonra fade-out başlat, 3 sn sonra tamamen kaldır
    const fadeTimer = setTimeout(() => setFadeOut(true), 2500);
    const doneTimer = setTimeout(() => onDone(), 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center">
        {/* Dış büyük ring */}
        <div
          className="absolute w-52 h-52 rounded-full border border-amber-500/10 border-t-amber-400/40 animate-spin"
          style={{ animationDuration: "3s" }}
        />
        {/* Orta ring */}
        <div
          className="absolute w-40 h-40 rounded-full border-2 border-amber-500/15 border-t-amber-400/60 animate-spin"
          style={{ animationDuration: "1.8s" }}
        />
        {/* İç ring */}
        <div
          className="absolute w-28 h-28 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin"
          style={{ animationDuration: "1s" }}
        />

        {/* Logo */}
        <div className="rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.35)] animate-pulse">
          <Image
            src="/logo.png"
            alt="Royal Cabana"
            width={96}
            height={96}
            className="rounded-2xl"
            priority
          />
        </div>
      </div>

      <p className="mt-10 text-sm text-neutral-500 tracking-widest uppercase animate-pulse">
        Royal Cabana
      </p>
    </div>
  );
}
