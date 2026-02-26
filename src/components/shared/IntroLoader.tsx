"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface IntroLoaderProps {
  onDone: () => void;
}

export default function IntroLoader({ onDone }: IntroLoaderProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
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
          className="absolute w-72 h-72 rounded-full border border-amber-500/20 border-t-amber-400/50 animate-spin"
          style={{ animationDuration: "3s" }}
        />
        {/* Orta ring */}
        <div
          className="absolute w-56 h-56 rounded-full border-2 border-amber-500/25 border-t-amber-400/70 animate-spin"
          style={{ animationDuration: "1.8s" }}
        />
        {/* İç ring */}
        <div
          className="absolute w-44 h-44 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin"
          style={{ animationDuration: "1s" }}
        />

        {/* Logo container — büyük, parlak glow */}
        <div
          className="relative z-10 rounded-3xl p-1"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
            boxShadow:
              "0 0 60px rgba(245,158,11,0.5), 0 0 120px rgba(245,158,11,0.2), inset 0 0 30px rgba(245,158,11,0.05)",
          }}
        >
          <Image
            src="/logo.png"
            alt="Royal Cabana"
            width={160}
            height={160}
            className="rounded-2xl"
            priority
          />
        </div>
      </div>

      <p
        className="mt-14 text-base text-amber-400/80 tracking-[0.3em] uppercase font-light"
        style={{ textShadow: "0 0 20px rgba(245,158,11,0.4)" }}
      >
        Royal Cabana
      </p>
    </div>
  );
}
