import { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";
import {
  rateLimitWithInfo,
  checkAccountLockout,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 dakika — kısa TTL ile rol değişiklikleri hızlı yansır
  },
  pages: {
    signIn: "/login",
  },
  // Secure cookie sadece production'da aktif olsun.
  // Aksi halde local HTTP geliştirmede callback/credentials 401'e düşebilir.
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const ip =
          (req?.headers?.["x-forwarded-for"] as string)
            ?.split(",")[0]
            ?.trim() ??
          (req?.headers?.["x-real-ip"] as string) ??
          "unknown";

        // IP-based rate limiting + account lockout (skip in development)
        if (process.env.NODE_ENV === "production") {
          const rl = await rateLimitWithInfo(`login:${ip}`, 20, 15 * 60_000);
          if (!rl.allowed) {
            throw new Error(
              "Çok fazla deneme. 15 dakika sonra tekrar deneyin.",
            );
          }

          const lockedUntil = await checkAccountLockout(credentials.username);
          if (lockedUntil) {
            throw new Error(
              "Hesabınız geçici olarak kilitlendi. 15 dakika sonra tekrar deneyin.",
            );
          }
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user || !user.isActive) {
          if (process.env.NODE_ENV === "production") {
            await recordFailedLogin(credentials.username);
          }
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isValid) {
          if (process.env.NODE_ENV === "production") {
            await recordFailedLogin(credentials.username);
          }
          return null;
        }

        if (process.env.NODE_ENV === "production") {
          await clearLoginAttempts(credentials.username);
        }

        return {
          id: user.id,
          name: user.username,
          email: user.email,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { id: string; role: Role }).role;
      }

      // Her token yenilemede DB'den güncel rol ve aktiflik kontrolü
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isActive: true },
        });

        if (!dbUser || !dbUser.isActive) {
          // Kullanıcı deaktif edilmişse token'ı geçersiz kıl
          return { ...token, expired: true };
        }

        token.role = dbUser.role as Role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.expired) {
        // Token geçersiz — session'ı boşalt, kullanıcı yeniden login olmak zorunda
        return { ...session, user: undefined } as unknown as typeof session;
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};

/**
 * Per-request deduplication — aynı request içinde birden fazla
 * getServerSession(authOptions) çağrısını tek DB hit'e düşürür (Rule 3.6)
 */
export const getAuthSession = cache(() => getServerSession(authOptions));
