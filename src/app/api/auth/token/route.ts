import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET ?? "dev-secret";

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!session) {
    return NextResponse.json({ token: null }, { status: 200 });
  }

  // Sign a short-lived JWT for Socket.IO auth
  const socketToken = jwt.sign(
    { sub: session.sub ?? session.id, role: session.role ?? "CASINO_USER" },
    SECRET,
    { expiresIn: "1h" },
  );

  return NextResponse.json({ token: socketToken });
}
