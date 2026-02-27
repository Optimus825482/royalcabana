import { Role } from "@/types";

interface SSEConnection {
  id: string;
  userId: string;
  role: Role;
  controller: ReadableStreamDefaultController;
}

class SSEManager {
  private connections = new Map<string, SSEConnection>();
  private userIndex = new Map<string, Set<string>>(); // userId -> connectionIds
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startPingLoop();
  }

  addConnection(
    userId: string,
    role: Role,
    controller: ReadableStreamDefaultController,
  ): string {
    const id = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.connections.set(id, { id, userId, role, controller });

    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, new Set());
    }
    this.userIndex.get(userId)!.add(id);

    return id;
  }

  removeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    this.connections.delete(connectionId);

    const userConns = this.userIndex.get(conn.userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userIndex.delete(conn.userId);
      }
    }
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    const connIds = this.userIndex.get(userId);
    if (!connIds) return;

    const payload = this.formatSSE(event, data);
    for (const id of connIds) {
      this.safeSend(id, payload);
    }
  }

  sendToRole(role: Role, event: string, data: unknown): void {
    const payload = this.formatSSE(event, data);
    for (const [id, conn] of this.connections) {
      if (conn.role === role) {
        this.safeSend(id, payload);
      }
    }
  }

  broadcast(event: string, data: unknown): void {
    const payload = this.formatSSE(event, data);
    for (const [id] of this.connections) {
      this.safeSend(id, payload);
    }
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  private formatSSE(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  private safeSend(connectionId: string, payload: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    try {
      conn.controller.enqueue(new TextEncoder().encode(payload));
    } catch {
      // Connection dead — clean up
      this.removeConnection(connectionId);
    }
  }

  private startPingLoop(): void {
    if (this.pingInterval) return;

    this.pingInterval = setInterval(() => {
      const ping = `: ping\n\n`;
      for (const [id] of this.connections) {
        this.safeSend(id, ping);
      }
    }, 30_000);

    // Prevent keeping the process alive in edge environments
    if (
      this.pingInterval &&
      typeof this.pingInterval === "object" &&
      "unref" in this.pingInterval
    ) {
      this.pingInterval.unref();
    }
  }
}

// Module-level singleton
export const sseManager = new SSEManager();
