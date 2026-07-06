"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { timeAgo, expiresIn } from "@/lib/utils";

interface Invite {
  id: string;
  email: string;
  token: string;
  used: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: { name: string };
}

export default function ConvitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const now = Date.now();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") router.push("/dashboard");
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated") loadInvites();
  }, [status]);

  async function loadInvites() {
    const res = await fetch("/api/invites");
    if (res.ok) setInvites(await res.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      const invite = await res.json();
      setInvites((prev) => [invite, ...prev]);
      setEmail("");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este convite?")) return;
    await fetch("/api/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/convite/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  if (status !== "authenticated") return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={((session?.user as any)?.role ?? "STUDENT") as "ADMIN" | "MENTOR" | "STUDENT"} userName={session?.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-xl font-semibold text-white">Convites</h1>

          <form
            onSubmit={handleCreate}
            className="bg-[#0f0f14] border border-white/5 rounded-xl p-4 flex gap-3"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email do aluno"
              className="flex-1 bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Gerando..." : "Gerar Convite"}
            </button>
          </form>

          <div className="space-y-3">
            {invites.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">Nenhum convite gerado ainda.</p>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  className={`bg-[#0f0f14] border rounded-xl p-4 flex items-center gap-3 ${
                    inv.used ? "border-white/5 opacity-50" : "border-white/10"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">{inv.email}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {inv.used ? (
                        <span className="text-green-500">✓ Utilizado</span>
                      ) : (
                        <>Expira em {expiresIn(inv.expiresAt)}</>
                      )}
                    </p>
                  </div>
                  {!inv.used && (
                    <button
                      onClick={() => copyLink(inv.token)}
                      className="px-3 py-1.5 text-xs border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      {copied === inv.token ? "✓ Copiado!" : "Copiar Link"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(inv.id)}
                    className="text-gray-600 hover:text-red-400 text-sm transition-colors flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
