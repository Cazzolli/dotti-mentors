"use client";
import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  student: { id: string; name: string; email: string };
  _count: { videos: number; comments: number };
}

export default function AlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromVisaoGeral = searchParams.get("from") === "visao-geral";
  const [channels, setChannels] = useState<Channel[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDeleteChannelId, setConfirmDeleteChannelId] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      const r = (session.user as any).role;
      if (r !== "ADMIN" && r !== "MENTOR") router.push("/dashboard");
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

  async function handleDeleteChannel(channelId: string) {
    setDeletingChannelId(channelId);
    try {
      const res = await fetch(`/api/channels/${channelId}`, { method: "DELETE" });
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c.id !== channelId));
      }
    } finally {
      setDeletingChannelId(null);
      setConfirmDeleteChannelId(null);
    }
  }

  if (status !== "authenticated" || loading) return null;

  const role = (session?.user as any)?.role ?? "STUDENT";
  const currentUserId = (session?.user as any)?.id ?? "";
  const isAdmin = role === "ADMIN";
  const channelToDelete = channels.find((c) => c.id === confirmDeleteChannelId);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={session?.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            {fromVisaoGeral ? (
              <button
                onClick={() => router.back()}
                className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
                title="Voltar para Visão Geral"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
            ) : (
            <a
              href="/admin"
              className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
              title="Voltar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </a>
            )}
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
                <div key={ch.id} className="relative group">
                  <ChannelCard channel={ch} />
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.preventDefault(); setConfirmDeleteChannelId(ch.id); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md bg-black/60 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all text-xs z-10"
                      title="Remover canal"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/5 pt-6">
            <MentorIdeaSection
              studentId={id}
              currentUserId={currentUserId}
              currentUserRole={role}
            />
          </div>
        </div>
      </main>

      {/* Delete channel confirmation dialog */}
      {confirmDeleteChannelId && channelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13131e] border border-white/10 rounded-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Remover canal?</h2>
            <p className="text-sm text-gray-400">
              Isso vai remover o canal{" "}
              <span className="text-white font-medium">{channelToDelete.name}</span>{" "}
              e todos os vídeos e feedbacks associados. Ação irreversível.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmDeleteChannelId(null)}
                className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteChannel(confirmDeleteChannelId)}
                disabled={deletingChannelId === confirmDeleteChannelId}
                className="flex-1 py-2 text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
              >
                {deletingChannelId === confirmDeleteChannelId ? "Removendo..." : "Remover canal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
