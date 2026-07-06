"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import CreateUserModal from "@/components/CreateUserModal";

interface Student {
  id: string;
  name: string;
  email: string;
  channels: { id: string }[];
}

export default function AlunosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const SUPERADMIN = "victorkalamith@gmail.com";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      if ((session.user as any).role !== "ADMIN") router.push("/dashboard");
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
      setStudents((prev) => [{ id: user.id, name: user.name, email: user.email, channels: [] }, ...prev]);
  }

  if (status !== "authenticated" || loading) return null;

  const isSuperAdmin = (session?.user as any)?.email === SUPERADMIN;
  const filtered = search.trim()
    ? students.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()))
    : students;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="ADMIN" userName={session?.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Alunos</h1>
              <p className="text-sm text-gray-500">
                {students.length} aluno{students.length !== 1 ? "s" : ""}
              </p>
            </div>
            {isSuperAdmin && <CreateUserModal onCreated={handleUserCreated} />}
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
              {!search && <p className="text-sm">Crie um usuário para adicionar alunos à plataforma.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((student) => (
                <Link
                  key={student.id}
                  href={`/admin/alunos/${student.id}`}
                  className="group bg-[#13131e] hover:bg-[#1c1c2a] border border-white/5 hover:border-violet-500/30 rounded-xl p-4 transition-all duration-200"
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
