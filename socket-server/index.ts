import { createServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

const PORT = process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT) : 3001;

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET is required in production");
}
const SECRET = JWT_SECRET ?? "dev-secret";

const CLIENT_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface JwtPayload {
  sub: string;
  role: string;
  name?: string;
  exp?: number;
}

// Simple in-memory rate limiter for socket events
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();
function checkSocketRate(
  userId: string,
  event: string,
  limit = 30,
  windowMs = 60_000,
): boolean {
  const key = `${userId}:${event}`;
  const now = Date.now();
  const entry = socketRateLimits.get(key);
  if (!entry || now >= entry.resetAt) {
    socketRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

const httpServer = createServer();

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
  if (!checkSocketRate(userId, "connection", 10, 60_000)) {
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
    if (!checkSocketRate(userId, event)) {
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
