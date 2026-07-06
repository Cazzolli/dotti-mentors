"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import NotificationBell from "./NotificationBell";
import AdminProfileModal from "./AdminProfileModal";

interface Props {
  role: "ADMIN" | "MENTOR" | "STUDENT";
  userName: string;
}

export default function Sidebar({ role, userName }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id ?? "";
  const userAvatarUrl = (session?.user as any)?.avatarUrl ?? null;

  const [displayName, setDisplayName] = useState(userName);
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(userAvatarUrl);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.avatarUrl) setDisplayAvatar(data.avatarUrl);
        if (data?.name) setDisplayName(data.name);
      })
      .catch(() => {});
  }, [userId]);

  const adminLinks = [
    { href: "/admin/alunos", label: "Alunos", icon: "◎" },
    { href: "/admin/visao-geral", label: "Visão Geral", icon: "⊞" },
  ];
  const studentLinks = [
    { href: "/dashboard", label: "Meus Canais", icon: "⊞" },
    { href: "/canais/novo", label: "Adicionar Canal", icon: "+" },
  ];

  const links = (role === "ADMIN" || role === "MENTOR") ? adminLinks : studentLinks;

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0f0f14] border-r border-white/5 flex flex-col h-screen overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-600 rounded flex items-center justify-center text-white font-bold text-xs">
            DM
          </div>
          <span className="font-semibold text-white text-sm">DottiMentors</span>
        </div>
      </div>

      <nav className="px-3 py-3 border-b border-white/5 space-y-0.5">
        {links.map((l) => (
          <NavItem key={l.href} href={l.href} label={l.label} icon={l.icon} active={pathname === l.href} />
        ))}
      </nav>

      <div className="px-0 py-2 border-b border-white/5">
        <NotificationBell />
      </div>

      <div className="mt-auto px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs text-gray-300 flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-gray-200 truncate">{displayName}</p>
            <p className="text-xs text-gray-500">{role === "ADMIN" ? "Admin" : role === "MENTOR" ? "Mentor" : "Aluno"}</p>
          </div>
        </div>

        {(role === "ADMIN" || role === "MENTOR") && userId && (
          <div className="px-2 mb-1">
            <AdminProfileModal
              userId={userId}
              currentName={displayName}
              currentAvatarUrl={displayAvatar}
              onSaved={(name, avatar) => { setDisplayName(name); setDisplayAvatar(avatar); }}
            />
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-2 py-1.5 text-sm text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
        active ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
