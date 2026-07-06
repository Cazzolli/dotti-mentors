import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — no Node.js-only imports (no Prisma, no bcrypt)
// Used by middleware.ts (Edge Runtime) and extended by lib/auth.ts (Node.js)
export const authConfig = {
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
        (session.user as any).avatarUrl = token.avatarUrl ?? null;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
} satisfies NextAuthConfig;
