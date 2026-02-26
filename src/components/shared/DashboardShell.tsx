"use client";

import { useState, useEffect } from "react";
import IntroLoader from "./IntroLoader";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showIntro, setShowIntro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem("intro_shown");
    if (!shown) {
      setShowIntro(true);
    }
    setReady(true);
  }, []);

  function handleDone() {
    sessionStorage.setItem("intro_shown", "1");
    setShowIntro(false);
  }

  return (
    <>
      {showIntro && <IntroLoader onDone={handleDone} />}
      {/* İçerik her zaman render edilir, intro üstünde overlay olarak durur */}
      <div className={ready ? undefined : "invisible"}>{children}</div>
    </>
  );
}
