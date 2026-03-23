import { createServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { checkSocketRateLimitSync } from "./socket-rate-limit";

const PORT = process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT) : 3007;

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET is required in production");
}
const SECRET = JWT_SECRET ?? "dev-secret";

const CLIENT_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3006";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? SECRET;

interface JwtPayload {
  sub: string;
  role: string;
  name?: string;
  exp?: number;
}

const httpServer = createServer((req, res) => {
  // Internal emit endpoint — used by Next.js API routes to push notifications
  if (req.method === "POST" && req.url === "/emit") {
    // Verify internal API secret
    const authHeader = req.headers["x-internal-secret"];
    if (authHeader !== INTERNAL_SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB
    let body = "";
    let oversized = false;
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > MAX_BODY_SIZE) {
        oversized = true;
        req.destroy();
      }
    });
    req.on("end", () => {
      if (oversized) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Payload too large" }));
        return;
      }
      try {
        const { userId, event, data } = JSON.parse(body);
        if (userId && event) {
          io.to(`user:${userId}`).emit(event, data);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400);
          res.end("Missing userId or event");
        }
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "ok", connections: io.engine.clientsCount }),
    );
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// userId → Set<socketId> mapping
const userSockets = new Map<string, Set<string>>();

io.use((socket: Socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("Authentication required"));

  try {
    const payload = jwt.verify(token, SECRET) as JwtPayload;

    // Verify token has not expired (explicit check)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return next(new Error("Token expired"));
    }

    (socket as Socket & { userId: string; role: string }).userId = payload.sub;
    (socket as Socket & { userId: string; role: string }).role = payload.role;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket: Socket) => {
  const { userId } = socket as Socket & { userId: string };

  // Rate limit connections per user
  if (!checkSocketRateLimitSync(userId, "connection", 10, 60_000)) {
    console.warn(`[socket] rate limited connection userId=${userId}`);
    socket.disconnect(true);
    return;
  }

  // Register socket for this user
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socket.id);

  socket.join(`user:${userId}`);
  console.log(`[socket] connected userId=${userId} socketId=${socket.id}`);

  // Wrap all incoming events with rate limiting
  socket.use(([event], next) => {
    if (!checkSocketRateLimitSync(userId, event)) {
      return next(new Error("Rate limit exceeded"));
    }
    next();
  });

  socket.on("disconnect", () => {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) userSockets.delete(userId);
    }
    console.log(`[socket] disconnected userId=${userId} socketId=${socket.id}`);
  });
});

// Emit notification to a specific user
export function emitToUser(userId: string, event: string, data: unknown) {
  io.to(`user:${userId}`).emit(event, data);
}

httpServer.listen(PORT, () => {
  console.log(`[socket-server] listening on port ${PORT}`);
});
