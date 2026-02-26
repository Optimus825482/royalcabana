"use client";

import { useState, useEffect } from "react";
import IntroLoader from "./IntroLoader";

// Module-level flag: SPA navigasyonunda tekrar gösterme,
// ama hard refresh / ilk yüklemede her zaman göster
let introShownInSession = false;

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showIntro, setShowIntro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!introShownInSession) {
      setShowIntro(true);
    }
    setReady(true);
  }, []);

  function handleDone() {
    introShownInSession = true;
    setShowIntro(false);
  }

  return (
    <>
      {showIntro && <IntroLoader onDone={handleDone} />}
      <div className={ready ? undefined : "invisible"}>{children}</div>
    </>
  );
}
