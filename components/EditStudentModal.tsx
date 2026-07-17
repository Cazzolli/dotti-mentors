"use client";
import { useState, useEffect } from "react";

interface Props {
  student: { id: string; name: string; email: string; firstClassDate?: string | null } | null;
  onClose: () => void;
  onSaved: (id: string, name: string, email: string, firstClassDate: string | null) => void;
}

export default function EditStudentModal({ student, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [firstClassDate, setFirstClassDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (student) {
      setName(student.name);
      setEmail(student.email);
      setNewPassword("");
      setFirstClassDate(student.firstClassDate ? student.firstClassDate.slice(0, 10) : "");
      setError("");
    }
  }, [student]);

  if (!student) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Nome obrigatório"); return; }
    if (!email.trim()) { setError("E-mail obrigatório"); return; }
    if (newPassword && newPassword.length < 6) { setError("Senha deve ter no mínimo 6 caracteres"); return; }

    setSaving(true);
    const body: any = { name: name.trim(), email: email.trim(), firstClassDate: firstClassDate || null };
    if (newPassword) body.newPassword = newPassword;

    const res = await fetch(`/api/users/${student!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      onSaved(student!.id, data.name, data.email, data.firstClassDate ?? null);
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao salvar");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#13131e] border border-white/10 rounded-xl w-full max-w-sm mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Editar aluno</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0f0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0f0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Data da 1ª aula</label>
            <input
              type="date"
              value={firstClassDate}
              onChange={(e) => setFirstClassDate(e.target.value)}
              className="w-full bg-[#0f0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Nova senha <span className="text-gray-600">(deixe em branco para não alterar)</span></label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha..."
              className="w-full bg-[#0f0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-sm text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
