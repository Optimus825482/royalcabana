"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { SSE_EVENTS } from "@/lib/sse-events";

export interface SSEEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

interface UseSSEOptions {
  onEvent?: (event: string, data: unknown) => void;
}

const ALL_SSE_EVENTS = Object.values(SSE_EVENTS);

export function useSSE(options?: UseSSEOptions) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(options?.onEvent);

  // Keep callback ref fresh without triggering reconnect
  onEventRef.current = options?.onEvent;

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    cleanup();

    const es = new EventSource("/api/sse");
    eventSourceRef.current = es;

    const handleEvent = (e: MessageEvent) => {
      const sseEvent: SSEEvent = {
        event: e.type,
        data: (() => {
          try {
            return JSON.parse(e.data);
          } catch {
            return e.data;
          }
        })(),
        timestamp: Date.now(),
      };
      setLastEvent(sseEvent);
      onEventRef.current?.(sseEvent.event, sseEvent.data);
    };

    // "connected" event from server on initial connection
    es.addEventListener("connected", (e: MessageEvent) => {
      setIsConnected(true);
      retryCountRef.current = 0;
      handleEvent(e);
    });

    // Register listeners for all known named events
    for (const eventName of ALL_SSE_EVENTS) {
      es.addEventListener(eventName, handleEvent as EventListener);
    }

    // Catch-all for unnamed "message" events
    es.onmessage = handleEvent;

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
      const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000);
      retryCountRef.current++;

      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [cleanup]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    connect();
    return cleanup;
  }, [status, session?.user, connect, cleanup]);

  return { isConnected, lastEvent };
}
