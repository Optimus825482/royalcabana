/**
 * Server-side notification helper.
 * Creates a DB notification and optionally pushes via Socket.IO.
 */

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3007";

/**
 * Emit a real-time notification event to a specific user via Socket.IO.
 * Fire-and-forget — failures are silently ignored (polling fallback exists).
 */
export async function emitNotification(userId: string, data?: unknown) {
  try {
    // Use Socket.IO HTTP API to emit to a specific room
    // Since we can't import the socket server directly (separate process),
    // we use a lightweight internal HTTP endpoint on the socket server.
    await fetch(`${SOCKET_URL}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, event: "notification", data }),
      signal: AbortSignal.timeout(2000),
    }).catch(() => {
      // Socket server unreachable — client will pick up via polling
    });
  } catch {
    // Silently fail — polling fallback handles this
  }
}
