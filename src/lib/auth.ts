import "server-only";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { logger } from "./logger";
import { rateLimit } from "./rate-limit";

const PASSWORD_HASH = process.env.DASHBOARD_PASSWORD_HASH ?? "";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Dashboard password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip =
          (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
          "unknown";
        const limit = rateLimit(`login:${ip}`, { capacity: 5, refillPerSec: 1 / 12 });
        if (!limit.allowed) {
          logger.warn({ ip }, "login rate-limited");
          throw new Error("Too many attempts. Try again in a minute.");
        }

        const password = credentials?.password ?? "";
        if (!PASSWORD_HASH) {
          logger.error("DASHBOARD_PASSWORD_HASH is not set");
          return null;
        }
        const ok = await bcrypt.compare(password, PASSWORD_HASH);
        if (!ok) {
          logger.warn({ ip }, "invalid login");
          return null;
        }

        return { id: "owner", name: "Owner" };
      },
    }),
  ],
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
