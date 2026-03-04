import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { checkRateLimit } from "@/lib/rate-limit";

const SECRET = process.env.NEXTAUTH_SECRET;

if (!SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is not set");
}

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!session) {
    return NextResponse.json(
      { success: true, data: { token: null } },
      { status: 200 },
    );
  }

  const userId = (session.sub ?? session.id) as string;
  const rl = await checkRateLimit(`token:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit aşıldı." },
      { status: 429 },
    );
  }

  const socketToken = jwt.sign(
    { sub: userId, role: session.role ?? "CASINO_USER" },
    SECRET!,
    { expiresIn: "1h" },
  );

  return NextResponse.json({ success: true, data: { token: socketToken } });
}
