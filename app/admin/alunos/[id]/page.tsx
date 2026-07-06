"use client";
import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChannelCard from "@/components/ChannelCard";

interface Channel {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  lastSync: string | null;
  student: { id: string; name: string; email: string };
  _count: { videos: number; comments: number };
}

export default function AlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      if ((session.user as any).role !== "ADMIN") router.push("/dashboard");
      else loadChannels();
    }
  }, [status]);

  async function loadChannels() {
    const res = await fetch(`/api/channels?studentId=${id}`);
    if (res.ok) {
      const data: Channel[] = await res.json();
      setChannels(data);
      if (data[0]) setStudentName(data[0].student.name);
    }
    setLoading(false);
  }

  if (status !== "authenticated" || loading) return null;

  const role = (session?.user as any)?.role ?? "STUDENT";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={session?.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
              title="Voltar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </a>
            <div>
              <h1 className="text-xl font-semibold text-white">{studentName || "Aluno"}</h1>
              <p className="text-sm text-gray-500">
                {channels.length} {channels.length !== 1 ? "canais" : "canal"}
              </p>
            </div>
          </div>

          {channels.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-lg mb-2">Nenhum canal cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {channels.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
