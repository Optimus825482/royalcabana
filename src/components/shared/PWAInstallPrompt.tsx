"use client";

import { useState, useEffect, useRef } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt.current = null;
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-2xl">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Download className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-100">Royal Cabana</p>
          <p className="text-xs text-neutral-400">
            Uygulamayı cihazınıza yükleyin
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 transition-colors shrink-0"
        >
          Yükle
        </button>
        <button
          onClick={() => setShow(false)}
          className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
