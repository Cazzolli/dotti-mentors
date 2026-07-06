"use client";
import { useState } from "react";

interface Props {
  onCreated: (user: { id: string; name: string; email: string; role: string }) => void;
}

export default function CreateUserModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setName(""); setEmail(""); setPassword(""); setRole("STUDENT"); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao criar usuário"); return; }
      onCreated(data);
      setOpen(false);
      reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        + Criar Usuário
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13131e] border border-white/10 rounded-xl w-full max-w-sm mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Criar usuário</h2>
              <button onClick={() => { setOpen(false); reset(); }} className="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="João Aluno"
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="joao@email.com"
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Tipo</label>
                <div className="flex gap-2">
                  {(["STUDENT", "ADMIN"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                        role === r
                          ? "border-violet-500 bg-violet-500/20 text-violet-300"
                          : "border-white/10 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {r === "STUDENT" ? "Aluno" : "Mentor / Admin"}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset(); }}
                  className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-sm text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
                >
                  {loading ? "Criando..." : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
