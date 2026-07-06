"use client";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";

interface Props {
  userId: string;
  currentName: string;
  currentAvatarUrl?: string | null;
  onSaved: (name: string, avatarUrl: string | null) => void;
}

function resizeImageToBase64(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function AdminProfileModal({ userId, currentName, currentAvatarUrl, onSaved }: Props) {
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"perfil" | "senha">("perfil");

  // perfil state
  const [name, setName] = useState(currentName);
  const [preview, setPreview] = useState<string>(currentAvatarUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // senha state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Arquivo muito grande (máx 5MB)"); return; }
    setError("");
    try {
      const base64 = await resizeImageToBase64(file);
      setPreview(base64);
    } catch {
      setError("Não foi possível processar a imagem");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatarUrl: preview || null }),
      });
      if (!res.ok) { setError("Erro ao salvar"); return; }
      const data = await res.json();
      await update({ name: data.name });
      onSaved(data.name, data.avatarUrl);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPassError("");
    setPassSuccess(false);
    if (newPassword !== confirmPassword) { setPassError("As senhas não coincidem"); return; }
    if (newPassword.length < 6) { setPassError("A nova senha deve ter pelo menos 6 caracteres"); return; }
    setPassLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPassError(d.error ?? "Erro ao alterar senha");
        return;
      }
      setPassSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPassLoading(false);
    }
  }

  function handleRemovePhoto() {
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    setOpen(false);
    setTab("perfil");
    setError("");
    setPassError("");
    setPassSuccess(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        title="Editar perfil"
      >
        Editar perfil
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13131e] border border-white/10 rounded-xl w-full max-w-sm mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Editar perfil</h2>
              <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setTab("perfil")}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "perfil" ? "border-violet-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}
              >
                Perfil
              </button>
              <button
                onClick={() => setTab("senha")}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "senha" ? "border-violet-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}
              >
                Senha
              </button>
            </div>

            {tab === "perfil" && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => fileRef.current?.click()}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-white/10 group-hover:border-violet-500/50 transition-colors"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-violet-500/20 border-2 border-dashed border-violet-500/30 group-hover:border-violet-500/60 flex items-center justify-center text-2xl text-violet-300 font-semibold transition-colors">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>

                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

                  <div className="flex gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                      {preview ? "Trocar foto" : "Escolher foto"}
                    </button>
                    {preview && (
                      <>
                        <span className="text-xs text-gray-600">·</span>
                        <button type="button" onClick={handleRemovePhoto} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={handleClose} className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 py-2 text-sm text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors font-medium">
                    {loading ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {tab === "senha" && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Senha atual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Nova senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {passError && <p className="text-xs text-red-400">{passError}</p>}
                {passSuccess && <p className="text-xs text-green-400">Senha alterada com sucesso!</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={handleClose} className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={passLoading} className="flex-1 py-2 text-sm text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors font-medium">
                    {passLoading ? "Alterando..." : "Alterar senha"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
