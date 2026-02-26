import { createServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

const PORT = process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT) : 3001;
const JWT_SECRET = process.env.NEXTAUTH_SECRET ?? "dev-secret";
const CLIENT_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface JwtPayload {
  sub: string;
  role: string;
  name?: string;
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
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (socket as Socket & { userId: string; role: string }).userId = payload.sub;
    (socket as Socket & { userId: string; role: string }).role = payload.role;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket: Socket) => {
  const { userId } = socket as Socket & { userId: string };

  // Register socket for this user
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socket.id);

  socket.join(`user:${userId}`);
  console.log(`[socket] connected userId=${userId} socketId=${socket.id}`);

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
