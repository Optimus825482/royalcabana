"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_INTERVAL = 60_000; // 60 saniye

let didInit = false;

export default function SessionTracker() {
  const { data: session } = useSession();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session?.user?.id || didInit) return;
    didInit = true;

    // Heartbeat interval
    const sendHeartbeat = () => {
      fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => {});
    };

    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // beforeunload — logout track
    const handleUnload = () => {
      navigator.sendBeacon("/api/auth/logout-track");
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", handleUnload);
      didInit = false;
    };
  }, [session?.user?.id]);

  return null;
}
