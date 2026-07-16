"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { timeAgo } from "@/lib/utils";

interface FeedbackComment {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  videoId: string | null;
  author: { id: string; name: string; role: string; avatarUrl: string | null };
  channel: { id: string; name: string; handle: string | null; avatarUrl: string | null; channelIdea: string | null; student: { id: string; name: string } };
  video: { id: string; title: string; youtubeVideoId: string; thumbnailUrl: string | null } | null;
}

const PERIODS = [
  { value: "all", label: "Sempre" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

const SCOPES = [
  { value: "all", label: "Todos" },
  { value: "channel", label: "Feedback Canal" },
  { value: "video", label: "Feedback Vídeos" },
];

export default function FeedbacksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [channelFeedbacks, setChannelFeedbacks] = useState<FeedbackComment[]>([]);
  const [videoFeedbacks, setVideoFeedbacks] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("all");
  const [scope, setScope] = useState("all");
  const [mentorInput, setMentorInput] = useState("");
  const [mentorFilter, setMentorFilter] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [studentFilter, setStudentFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      const r = (session.user as any).role;
      if (r !== "ADMIN" && r !== "MENTOR") router.push("/dashboard");
    }
  }, [status]);

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (mentorFilter) params.set("mentorName", mentorFilter);
    if (studentFilter) params.set("studentName", studentFilter);

    const fetchChannel = scope === "all" || scope === "channel";
    const fetchVideo = scope === "all" || scope === "video";

    const [chanRes, vidRes] = await Promise.all([
      fetchChannel ? fetch(`/api/admin/feedbacks?${params}&scope=channel`) : Promise.resolve(null),
      fetchVideo ? fetch(`/api/admin/feedbacks?${params}&scope=video`) : Promise.resolve(null),
    ]);

    if (chanRes?.ok) setChannelFeedbacks(await chanRes.json()); else if (!fetchChannel) setChannelFeedbacks([]);
    if (vidRes?.ok) setVideoFeedbacks(await vidRes.json()); else if (!fetchVideo) setVideoFeedbacks([]);
    setLoading(false);
  }, [period, scope, mentorFilter, studentFilter]);

  useEffect(() => {
    if (status === "authenticated") loadFeedbacks();
  }, [status, loadFeedbacks]);

  async function handleSaveEdit(id: string) {
    if (!editContent.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      const updated = await res.json();
      setChannelFeedbacks((prev) => prev.map((c) => c.id === id ? { ...c, content: updated.content } : c));
      setVideoFeedbacks((prev) => prev.map((c) => c.id === id ? { ...c, content: updated.content } : c));
      setEditingId(null);
    }
    setSaving(false);
  }

  function startEdit(c: FeedbackComment) {
    setEditingId(c.id);
    setEditContent(c.content);
  }

  const hasFilters = period !== "all" || scope !== "all" || mentorFilter !== "" || studentFilter !== "";

  function clearFilters() {
    setPeriod("all");
    setScope("all");
    setMentorFilter(""); setMentorInput("");
    setStudentFilter(""); setStudentInput("");
  }

  if (status !== "authenticated") return null;

  const role = (session?.user as any)?.role as "ADMIN" | "MENTOR" | "STUDENT";
  const currentUserId = (session?.user as any)?.id ?? "";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={session?.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#09090b] border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-white">Central de Feedbacks</h1>
              <p className="text-sm text-gray-500">
                {scope === "channel" ? channelFeedbacks.length : scope === "video" ? videoFeedbacks.length : channelFeedbacks.length + videoFeedbacks.length} feedbacks encontrados
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Período */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                {PERIODS.map((p) => (
                  <button key={p.value} onClick={() => setPeriod(p.value)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      period === p.value ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Escopo */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                {SCOPES.map((s) => (
                  <button key={s.value} onClick={() => setScope(s.value)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      scope === s.value ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Filtro mentor */}
              <form onSubmit={(e) => { e.preventDefault(); setMentorFilter(mentorInput); }} className="flex gap-1">
                <div className="relative flex items-center">
                  <svg className="absolute left-2.5 w-3.5 h-3.5 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <input type="text" value={mentorInput} onChange={(e) => setMentorInput(e.target.value)}
                    placeholder="Filtrar por mentor..."
                    className="bg-[#0f0f14] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 w-44" />
                </div>
                {mentorFilter && (
                  <button type="button" onClick={() => { setMentorFilter(""); setMentorInput(""); }}
                    className="px-2 text-gray-500 hover:text-white text-sm transition-colors">✕</button>
                )}
              </form>

              {/* Filtro aluno */}
              <form onSubmit={(e) => { e.preventDefault(); setStudentFilter(studentInput); }} className="flex gap-1">
                <div className="relative flex items-center">
                  <svg className="absolute left-2.5 w-3.5 h-3.5 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                  </svg>
                  <input type="text" value={studentInput} onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="Filtrar por aluno..."
                    className="bg-[#0f0f14] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 w-44" />
                </div>
                {studentFilter && (
                  <button type="button" onClick={() => { setStudentFilter(""); setStudentInput(""); }}
                    className="px-2 text-gray-500 hover:text-white text-sm transition-colors">✕</button>
                )}
              </form>

              {hasFilters && (
                <button onClick={clearFilters}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors">
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32 text-gray-600 text-sm">Carregando...</div>
        ) : (
          <div className="p-6 space-y-10 max-w-5xl mx-auto">

            {/* Feedbacks de Canal */}
            {(scope === "all" || scope === "channel") && <Section
              title="Feedbacks de Canal"
              icon={
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                </svg>
              }
              count={channelFeedbacks.length}
            >
              {channelFeedbacks.length === 0 ? (
                <EmptyState />
              ) : channelFeedbacks.map((c) => (
                <FeedbackCard
                  key={c.id}
                  comment={c}
                  currentUserId={currentUserId}
                  editingId={editingId}
                  editContent={editContent}
                  saving={saving}
                  onStartEdit={startEdit}
                  onEditChange={setEditContent}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onNavigate={() => router.push(`/canais/${c.channel.id}?feedback=channel`)}
                />
              ))}
            </Section>}

            {/* Feedbacks de Vídeo */}
            {(scope === "all" || scope === "video") && <Section
              title="Feedbacks de Vídeo"
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              }
              count={videoFeedbacks.length}
            >
              {videoFeedbacks.length === 0 ? (
                <EmptyState />
              ) : videoFeedbacks.map((c) => (
                <FeedbackCard
                  key={c.id}
                  comment={c}
                  currentUserId={currentUserId}
                  editingId={editingId}
                  editContent={editContent}
                  saving={saving}
                  onStartEdit={startEdit}
                  onEditChange={setEditContent}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onNavigate={() => router.push(`/canais/${c.channel.id}?videoId=${c.video?.id}`)}
                />
              ))}
            </Section>}

          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
        <span className="text-xs bg-white/8 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EmptyState() {
  return <p className="text-sm text-gray-600 italic py-4">Nenhum feedback encontrado.</p>;
}

function FeedbackCard({
  comment: c, currentUserId, editingId, editContent, saving,
  onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onNavigate,
}: {
  comment: FeedbackComment;
  currentUserId: string;
  editingId: string | null;
  editContent: string;
  saving: boolean;
  onStartEdit: (c: FeedbackComment) => void;
  onEditChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onNavigate: () => void;
}) {
  const isEditing = editingId === c.id;
  const isOwn = c.author.id === currentUserId;
  const isVideo = c.videoId !== null;
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const PREVIEW_LIMIT = 220;
  const normalized = c.content.replace(/\n+/g, " ").trim();
  const isTruncatable = normalized.length > PREVIEW_LIMIT;
  const displayContent = isTruncatable ? normalized.slice(0, PREVIEW_LIMIT).trimEnd() + "…" : normalized;

  return (
    <div className="bg-[#13131e] border border-white/5 rounded-xl p-4 space-y-3">
      {/* Header: autor + tipo + data + ações */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {c.author.avatarUrl ? (
            <img src={c.author.avatarUrl} alt={c.author.name} referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-300 flex-shrink-0 font-medium">
              {c.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-medium text-white">{c.author.name}</span>
            <span className="text-xs text-gray-600">{timeAgo(c.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isOwn && !isEditing && (
            <button onClick={() => onStartEdit(c)} className="text-gray-600 hover:text-violet-400 transition-colors" title="Editar">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button onClick={onNavigate} className="text-gray-600 hover:text-white transition-colors" title="Ir para o canal">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview: thumbnail (vídeo) ou logo+nome (canal) */}
      {isVideo && c.video ? (
        <button onClick={onNavigate}
          className="flex items-center gap-3 w-full text-left rounded-lg overflow-hidden bg-black/20 border border-white/5 hover:border-white/15 transition-colors group">
          {c.video.thumbnailUrl ? (
            <img src={c.video.thumbnailUrl} alt={c.video.title}
              className="w-28 h-16 object-cover flex-shrink-0" />
          ) : (
            <div className="w-28 h-16 flex-shrink-0 bg-white/5 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0 px-2 py-1">
            <p className="text-xs text-gray-300 font-medium line-clamp-2 leading-snug group-hover:text-white transition-colors">{c.video.title}</p>
            <p className="text-xs text-gray-600 mt-1">{c.channel.name}</p>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={onNavigate}
            className="flex items-center gap-2 flex-1 min-w-0 bg-black/20 border border-white/5 hover:border-white/15 transition-colors rounded-lg px-3 py-2 group">
            {c.channel.avatarUrl ? (
              <img src={c.channel.avatarUrl} alt={c.channel.name} referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors truncate">{c.channel.name}</p>
              {c.channel.handle && <p className="text-xs text-gray-600 truncate">{c.channel.handle}</p>}
            </div>
          </button>
          {c.channel.channelIdea && (
            <button onClick={() => setIdeaOpen(true)}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Ver ideia
            </button>
          )}
        </div>
      )}

      {/* Aluno */}
      <p className="text-xs text-gray-600">Aluno: <span className="text-gray-500">{c.channel.student.name}</span></p>

      {/* Conteúdo / edição */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
            autoFocus rows={4}
            className="w-full bg-[#0d0d14] border border-white/10 focus:border-violet-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={onCancelEdit}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={() => onSaveEdit(c.id)} disabled={saving}
              className="px-3 py-1.5 text-xs text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors font-medium">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      ) : (
        <div className="pl-8">
          <p className="text-sm text-gray-300 leading-relaxed break-words">{displayContent}</p>
          {isTruncatable && (
            <button onClick={() => setContentModalOpen(true)}
              className="mt-1 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">
              Ver tudo ↓
            </button>
          )}
        </div>
      )}

      {contentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#13131e] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {c.author.avatarUrl ? (
                  <img src={c.author.avatarUrl} alt={c.author.name} referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-300 flex-shrink-0 font-medium">
                    {c.author.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-white truncate">{c.author.name}</span>
              </div>
              <button onClick={() => setContentModalOpen(false)}
                className="ml-auto text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ideia do canal */}
      {ideaOpen && c.channel.channelIdea && (
        <IdeaModal
          channelName={c.channel.name}
          channelAvatarUrl={c.channel.avatarUrl}
          idea={c.channel.channelIdea}
          onClose={() => setIdeaOpen(false)}
        />
      )}
    </div>
  );
}

function IdeaModal({ channelName, channelAvatarUrl, idea, onClose }: {
  channelName: string;
  channelAvatarUrl: string | null;
  idea: string;
  onClose: () => void;
}) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  function renderWithLinks(text: string) {
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all transition-colors">
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#13131e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            {channelAvatarUrl ? (
              <img src={channelAvatarUrl} alt={channelName} referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{channelName}</p>
              <p className="text-xs text-gray-500">Origem e referência do canal</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{renderWithLinks(idea)}</p>
        </div>
      </div>
    </div>
  );
}
