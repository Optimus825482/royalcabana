import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { sseManager } from "@/lib/sse";
import { Role } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role as Role;

  let connectionId: string | null = null;

  const stream = new ReadableStream({
    start(controller) {
      connectionId = sseManager.addConnection(userId, role, controller);

      // Send initial connected event
      const payload = `event: connected\ndata: ${JSON.stringify({ connectionId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(payload));
    },
    cancel() {
      if (connectionId) {
        sseManager.removeConnection(connectionId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
