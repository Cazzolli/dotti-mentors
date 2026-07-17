import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "../auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        if (user.blocked) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        await db.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } });

        return { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.avatarUrl = (user as any).avatarUrl ?? null;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
        (session.user as any).avatarUrl = token.avatarUrl ?? null;
      }
      return session;
    },
  },
});
