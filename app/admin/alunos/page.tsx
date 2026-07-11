"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import CreateUserModal from "@/components/CreateUserModal";
import EditStudentModal from "@/components/EditStudentModal";

interface Student {
  id: string;
  name: string;
  email: string;
  blocked: boolean;
  channels: { id: string }[];
}

export default function AlunosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingBlockId, setTogglingBlockId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      const role = (session.user as any).role;
      if (role !== "ADMIN" && role !== "MENTOR") router.push("/dashboard");
      else loadStudents();
    }
  }, [status]);

  async function loadStudents() {
    const res = await fetch("/api/admin/students");
    if (res.ok) setStudents(await res.json());
    setLoading(false);
  }

  function handleUserCreated(user: { id: string; name: string; email: string; role: string }) {
    if (user.role === "STUDENT")
      setStudents((prev) => [{ id: user.id, name: user.name, email: user.email, blocked: false, channels: [] }, ...prev]);
  }

  async function handleToggleBlock(student: Student) {
    setTogglingBlockId(student.id);
    try {
      const res = await fetch(`/api/users/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !student.blocked }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) => s.id === student.id ? { ...s, blocked: !s.blocked } : s)
        );
      }
    } finally {
      setTogglingBlockId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (status !== "authenticated" || loading) return null;

  const role = (session?.user as any)?.role as "ADMIN" | "MENTOR" | "STUDENT";
  const isAdmin = role === "ADMIN";

  const filtered = search.trim()
    ? students.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()))
    : students;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={session?.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Alunos</h1>
              <p className="text-sm text-gray-500">
                {students.length} aluno{students.length !== 1 ? "s" : ""}
              </p>
            </div>
            {isAdmin && <CreateUserModal onCreated={handleUserCreated} />}
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full max-w-sm bg-[#0f0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-lg mb-2">{search ? "Nenhum aluno encontrado" : "Nenhum aluno ainda"}</p>
              {!search && isAdmin && <p className="text-sm">Crie um usuário para adicionar alunos à plataforma.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((student) => (
                <div key={student.id} className="relative group">
                  <Link
                    href={`/admin/alunos/${student.id}`}
                    className={`block border rounded-xl p-4 transition-all duration-200 ${
                      student.blocked
                        ? "bg-[#13131e] border-white/5 opacity-60"
                        : "bg-[#13131e] hover:bg-[#1c1c2a] border-white/5 hover:border-violet-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-medium text-violet-300 flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate group-hover:text-white transition-colors">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{student.email}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-gray-200">{student.channels.length}</p>
                      <p className="text-xs text-gray-500">{student.channels.length !== 1 ? "canais" : "canal"}</p>
                    </div>
                    {student.blocked && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Bloqueado
                      </div>
                    )}
                  </Link>

                  {isAdmin && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                      <button
                        onClick={(e) => { e.preventDefault(); setEditStudent({ id: student.id, name: student.name, email: student.email }); }}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-black/60 hover:bg-violet-500/20 text-gray-500 hover:text-violet-400 transition-colors"
                        title="Editar aluno"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); handleToggleBlock(student); }}
                        disabled={togglingBlockId === student.id}
                        className={`w-6 h-6 flex items-center justify-center rounded-md bg-black/60 transition-colors text-xs disabled:opacity-50 ${
                          student.blocked
                            ? "hover:bg-green-500/20 text-green-400"
                            : "hover:bg-yellow-500/20 text-yellow-400"
                        }`}
                        title={student.blocked ? "Desbloquear acesso" : "Bloquear acesso"}
                      >
                        {student.blocked ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); setConfirmDeleteId(student.id); }}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-black/60 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors text-xs"
                        title="Remover aluno"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <EditStudentModal
        student={editStudent}
        onClose={() => setEditStudent(null)}
        onSaved={(id, name, email) =>
          setStudents((prev) => prev.map((s) => s.id === id ? { ...s, name, email } : s))
        }
      />

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13131e] border border-white/10 rounded-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Remover aluno?</h2>
            <p className="text-sm text-gray-400">
              Isso vai remover o aluno <span className="text-white font-medium">{students.find(s => s.id === confirmDeleteId)?.name}</span> e todos os dados associados. Ação irreversível.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 py-2 text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
              >
                {deletingId === confirmDeleteId ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
