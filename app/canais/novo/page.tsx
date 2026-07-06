"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function NovoCanalPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const role = (session?.user as any)?.role ?? "STUDENT";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: input.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao adicionar canal");
      setLoading(false);
      return;
    }

    // trigger sync in background
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: data.id }),
    });

    router.push(`/canais/${data.id}`);
  }

  if (!session) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={session.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <a
              href="/dashboard"
              className="text-gray-600 hover:text-white transition-colors"
              title="Voltar para Meus Canais"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </a>
            <h1 className="text-xl font-semibold text-white">Adicionar Canal</h1>
          </div>

          <div className="bg-[#0f0f14] border border-white/5 rounded-xl p-6 space-y-4">
            <p className="text-sm text-gray-400">
              Cole a URL, o @handle ou o ID do canal do YouTube.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
                autoFocus
                placeholder="@handle, https://youtube.com/@... ou ID do canal"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
              />

              <div className="text-xs text-gray-600 space-y-1">
                <p>Exemplos:</p>
                <p className="font-mono">@meucanal</p>
                <p className="font-mono">https://youtube.com/@meucanal</p>
                <p className="font-mono">UCxxxxxxxxxxxxxxxxxxxxxxxx</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                {loading ? "Buscando canal..." : "Adicionar Canal"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
