import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "DottiMentors",
  description: "Plataforma de acompanhamento de canais do YouTube",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-[#09090b] text-gray-100" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
