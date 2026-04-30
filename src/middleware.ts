import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    /*
     * Protect everything except:
     *   - login page
     *   - NextAuth endpoints
     *   - static assets and metadata
     */
    "/((?!api/auth|api/health|login|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
