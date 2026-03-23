"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_INTERVAL = 60_000; // 60 saniye

export default function SessionTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    // Heartbeat interval
    const sendHeartbeat = () => {
      fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => {});
    };

    const heartbeatId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // beforeunload — logout track
    const handleUnload = () => {
      navigator.sendBeacon("/api/auth/logout-track");
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(heartbeatId);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [session?.user?.id]);

  return null;
}
