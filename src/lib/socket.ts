"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3007", {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 10000,
    timeout: 5000,
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  // Suppress noisy console errors when server is unavailable
  socket.on("connect_error", () => {
    // Silently handled — polling fallback in NotificationPanel covers this
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
