"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ChannelCard from "@/components/ChannelCard";
import MentorIdeaSection from "@/components/MentorIdeaSection";

interface Channel {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  lastSync: string | null;
  _count: { videos: number; comments: number };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const role = (session.user as any).role;
      if (role === "ADMIN" || role === "MENTOR") { router.push("/admin/alunos"); return; }
      fetch("/api/channels")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => { setChannels(data); setLoading(false); });
    }
  }, [status]);

  if (status !== "authenticated" || loading) return null;

  const currentUserId = (session?.user as any)?.id ?? "";
  const role = (session?.user as any)?.role ?? "STUDENT";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="STUDENT" userName={session?.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Canais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-white">Meus Canais</h1>
                <p className="text-sm text-gray-500">
                  {channels.length} {channels.length !== 1 ? "canais" : "canal"} cadastrado{channels.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Link href="/canais/novo"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
                + Adicionar Canal
              </Link>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <p className="text-lg mb-2">Nenhum canal ainda</p>
                <p className="text-sm mb-6">Adicione seu canal do YouTube para começar.</p>
                <Link href="/canais/novo"
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
                  Adicionar Canal
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.map((ch) => (
                  <ChannelCard key={ch.id} channel={ch} />
                ))}
              </div>
            )}
          </div>

          {/* Ideias dos mentores */}
          <div className="border-t border-white/5 pt-6">
            <MentorIdeaSection
              studentId={currentUserId}
              currentUserId={currentUserId}
              currentUserRole={role}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
