"use server";

import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { logger } from "./logger";
import { rateLimit } from "./rate-limit";
import { headers } from "next/headers";

/**
 * Server Action driving the login form. Bypasses the next-auth client SDK
 * and any need for client-side JavaScript: the browser POSTs the form
 * natively, this runs on the server, sets the same JWT session cookie that
 * NextAuth's middleware/getServerSession recognizes, and redirects.
 */
export async function loginAction(formData: FormData): Promise<void> {
  const password = (formData.get("password") as string | null) ?? "";

  const fwd = headers().get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() ?? "unknown";
  const limit = rateLimit(`login:${ip}`, { capacity: 5, refillPerSec: 1 / 12 });
  if (!limit.allowed) {
    logger.warn({ ip }, "login rate-limited");
    redirect("/login?error=rate_limited");
  }

  const hash = process.env.DASHBOARD_PASSWORD_HASH ?? "";
  if (!hash) {
    logger.error("DASHBOARD_PASSWORD_HASH not set");
    redirect("/login?error=server_misconfigured");
  }
  if (!password) {
    redirect("/login?error=missing_password");
  }

  const ok = await bcrypt.compare(password, hash);
  if (!ok) {
    logger.warn({ ip }, "invalid login");
    redirect("/login?error=invalid");
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    logger.error("NEXTAUTH_SECRET not set");
    redirect("/login?error=server_misconfigured");
  }

  const maxAge = 24 * 60 * 60;
  const token = await encode({
    token: { sub: "owner", name: "Owner" },
    secret,
    maxAge,
  });

  const isProd = process.env.NODE_ENV === "production";
  cookies().set(
    isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    token,
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProd,
      maxAge,
    },
  );

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  const name = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";
  cookies().set(name, "", { httpOnly: true, sameSite: "lax", path: "/", secure: isProd, maxAge: 0 });
  redirect("/login");
}
