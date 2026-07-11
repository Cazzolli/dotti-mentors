"use client";
import { useState, useEffect } from "react";
import { commentTypeLabel, timeAgo } from "@/lib/utils";

interface Video { id: string; title: string }

interface Reply {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; role: string; avatarUrl?: string | null };
}

interface Comment {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  videoId: string | null;
  video: Video | null;
  author: { id: string; name: string; role: string; avatarUrl?: string | null };
  replies: Reply[];
}

interface Props {
  channelId: string;
  videoId?: string | null;
  videoTitle?: string | null;
  videoYoutubeId?: string | null;
  currentUserId: string;
  currentUserRole: string;
  onViewed?: () => void;
  autoOpenChannel?: boolean;
}

const TYPES = [
  { value: "FEEDBACK", label: "Feedback" },
  { value: "DIRECIONAMENTO", label: "Direcionamento" },
  { value: "OBSERVACAO", label: "Observação" },
];

export default function CommentSection({
  channelId, videoId, videoTitle, videoYoutubeId, currentUserId, currentUserRole, onViewed, autoOpenChannel,
}: Props) {
  const [channelComments, setChannelComments] = useState<Comment[]>([]);
  const [videoComments, setVideoComments] = useState<Comment[]>([]);
  const [channelOpen, setChannelOpen] = useState(autoOpenChannel ?? false);
  const [videoOpen, setVideoOpen] = useState(!!videoId);
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const [videoFormOpen, setVideoFormOpen] = useState(false);

  // edit state (for top-level comments by mentor, or replies by anyone)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const now = Date.now();
  const isMentorOrAdmin = currentUserRole === "ADMIN" || currentUserRole === "MENTOR";

  useEffect(() => {
    loadChannelComments();
    onViewed?.();
  }, [channelId]);

  useEffect(() => {
    if (videoId) {
      setVideoOpen(true);
      loadVideoComments(videoId);
    } else {
      setVideoComments([]);
    }
  }, [videoId]);

  async function loadChannelComments() {
    const res = await fetch(`/api/comments?channelId=${channelId}`);
    if (res.ok) setChannelComments(await res.json());
  }

  async function loadVideoComments(vid: string) {
    const res = await fetch(`/api/comments?channelId=${channelId}&videoId=${vid}`);
    if (res.ok) setVideoComments(await res.json());
  }

  async function submitComment(target: "channel" | "video", type: string, content: string) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, videoId: target === "video" ? videoId : null, type, content }),
    });
    if (!res.ok) return false;
    const newComment = await res.json();
    const commentWithReplies = { ...newComment, replies: [] };
    if (target === "channel") {
      setChannelComments((prev) => [...prev, commentWithReplies]);
      setChannelFormOpen(false);
    } else {
      setVideoComments((prev) => [...prev, commentWithReplies]);
      setVideoFormOpen(false);
    }
    return true;
  }

  async function submitReply(parentId: string, content: string, targetVideoId?: string | null) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, videoId: targetVideoId ?? null, content, parentId }),
    });
    if (!res.ok) return false;
    const newReply = await res.json();
    const addReply = (comments: Comment[]) =>
      comments.map((c) => c.id === parentId ? { ...c, replies: [...c.replies, newReply] } : c);
    setChannelComments(addReply);
    setVideoComments(addReply);
    setReplyingToId(null);
    return true;
  }

  async function handleEdit(id: string, isReply = false) {
    if (!editContent.trim()) return;
    setEditSaving(true);
    const res = await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (isReply) {
        const updateReply = (comments: Comment[]) =>
          comments.map((c) => ({
            ...c,
            replies: c.replies.map((r) => r.id === id ? { ...r, content: updated.content } : r),
          }));
        setChannelComments(updateReply);
        setVideoComments(updateReply);
      } else {
        const updateComment = (comments: Comment[]) =>
          comments.map((c) => c.id === id ? { ...c, content: updated.content } : c);
        setChannelComments(updateComment);
        setVideoComments(updateComment);
      }
      setEditingId(null);
    }
    setEditSaving(false);
  }

  async function handleDelete(id: string, target: "channel" | "video") {
    if (!confirm("Excluir este comentário?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (target === "channel") setChannelComments((p) => p.filter((c) => c.id !== id));
      else setVideoComments((p) => p.filter((c) => c.id !== id));
    }
  }

  const sharedCardProps = {
    currentUserId,
    currentUserRole,
    now,
    editingId,
    editContent,
    editSaving,
    replyingToId,
    onStartEdit: (id: string, content: string) => { setEditingId(id); setEditContent(content); setReplyingToId(null); },
    onEditChange: setEditContent,
    onCancelEdit: () => setEditingId(null),
    onStartReply: (id: string) => { setReplyingToId(id); setEditingId(null); },
    onCancelReply: () => setReplyingToId(null),
  };

  return (
    <div className="flex flex-col gap-2">
      {/* ── Canal accordion ── */}
      <Accordion
        icon={
          <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
          </svg>
        }
        title="Feedbacks do Canal"
        count={channelComments.length}
        open={channelOpen}
        onToggle={() => setChannelOpen((v) => !v)}
        onAdd={isMentorOrAdmin ? () => { setChannelOpen(true); setChannelFormOpen((v) => !v); } : undefined}
        addActive={channelFormOpen}
      >
        {isMentorOrAdmin && channelFormOpen && (
          <InlineForm
            onSubmit={(type, content) => submitComment("channel", type, content)}
            onCancel={() => setChannelFormOpen(false)}
          />
        )}
        {channelComments.length === 0 && !channelFormOpen ? (
          <p className="text-xs text-gray-600 italic px-1 py-2">Nenhum feedback do canal ainda.</p>
        ) : channelComments.length > 0 ? (
          <div className={`space-y-2 ${channelFormOpen ? "mt-3 border-t border-white/5 pt-3" : ""}`}>
            {channelComments.map((c) => (
              <CommentCard
                key={c.id}
                c={c}
                {...sharedCardProps}
                onSaveEdit={(id) => handleEdit(id, false)}
                onDelete={() => handleDelete(c.id, "channel")}
                onSubmitReply={(content) => submitReply(c.id, content, null)}
              />
            ))}
          </div>
        ) : null}
      </Accordion>

      {/* ── Vídeo accordion ── */}
      <Accordion
        icon={
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        }
        title="Feedbacks do Vídeo"
        count={videoComments.length}
        open={videoOpen}
        onToggle={() => setVideoOpen((v) => !v)}
        onAdd={isMentorOrAdmin && videoId ? () => { setVideoOpen(true); setVideoFormOpen((v) => !v); } : undefined}
        addActive={videoFormOpen}
      >
        {isMentorOrAdmin && videoFormOpen && videoId && (
          <InlineForm
            onSubmit={(type, content) => submitComment("video", type, content)}
            onCancel={() => setVideoFormOpen(false)}
          />
        )}
        {videoComments.length === 0 && !videoFormOpen ? (
          <p className="text-xs text-gray-600 italic px-1 py-2">Nenhum feedback de vídeo ainda.</p>
        ) : videoComments.length > 0 ? (
          <div className={`space-y-2 ${videoFormOpen ? "mt-3 border-t border-white/5 pt-3" : ""}`}>
            {videoComments.map((c) => (
              <CommentCard
                key={c.id}
                c={c}
                {...sharedCardProps}
                onSaveEdit={(id) => handleEdit(id, false)}
                onDelete={() => handleDelete(c.id, "video")}
                onSubmitReply={(content) => submitReply(c.id, content, videoId)}
              />
            ))}
          </div>
        ) : null}
      </Accordion>
    </div>
  );
}

/* ── Accordion ── */
function Accordion({
  icon, title, count, open, onToggle, onAdd, addActive, children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addActive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#111120] border border-white/5 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left group">
          <span className="text-gray-400 group-hover:text-gray-200 transition-colors flex-shrink-0">{icon}</span>
          <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors truncate">{title}</span>
          {count > 0 && (
            <span className="flex-shrink-0 text-xs bg-white/8 text-gray-400 px-1.5 py-0.5 rounded-full">{count}</span>
          )}
          <svg className={`w-3.5 h-3.5 text-gray-600 flex-shrink-0 ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {onAdd && (
          <button onClick={(e) => { e.stopPropagation(); onAdd(); }} title="Dar feedback"
            className={`flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
              addActive ? "border-violet-500/60 bg-violet-500/20 text-violet-300" : "border-white/10 text-gray-500 hover:text-white hover:border-white/20"
            }`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Feedback</span>
          </button>
        )}
      </div>
      {open && (
        <div className="border-t border-white/5">
          <div className="px-3 py-3 space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ── Inline form (mentor, top-level) ── */
function InlineForm({ onSubmit, onCancel }: { onSubmit: (type: string, content: string) => Promise<boolean>; onCancel: () => void }) {
  const [type, setType] = useState("FEEDBACK");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    await onSubmit(type, content);
    setSubmitting(false);
    setContent("");
  }

  return (
    <form onSubmit={handle} className="space-y-2">
      <div className="flex gap-1 flex-wrap">
        {TYPES.map((t) => (
          <button key={t.value} type="button" onClick={() => setType(t.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              type === t.value ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-white/10 text-gray-500 hover:text-gray-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <textarea value={content} onChange={(e) => setContent(e.target.value)}
        placeholder={type === "FEEDBACK" ? "Escreva um feedback..." : type === "DIRECIONAMENTO" ? "Escreva um direcionamento..." : "Escreva uma observação..."}
        rows={4}
        className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={submitting || !content.trim()}
          className="flex-1 py-1.5 text-xs text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg transition-colors font-medium">
          {submitting ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}

/* ── Reply form (aluno, sem seletor de tipo) ── */
function ReplyForm({ onSubmit, onCancel }: { onSubmit: (content: string) => Promise<boolean>; onCancel: () => void }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const ok = await onSubmit(content);
    setSubmitting(false);
    if (ok) setContent("");
  }

  return (
    <form onSubmit={handle} className="mt-2 space-y-2">
      <textarea value={content} onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva sua resposta..."
        autoFocus rows={3}
        className="w-full bg-[#0d0d14] border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={submitting || !content.trim()}
          className="flex-1 py-1.5 text-xs text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 rounded-lg transition-colors font-medium">
          {submitting ? "Enviando..." : "Responder"}
        </button>
      </div>
    </form>
  );
}

/* ── Comment card (with replies) ── */
function CommentCard({
  c, currentUserId, currentUserRole, now,
  editingId, editContent, editSaving, replyingToId,
  onStartEdit, onEditChange, onSaveEdit, onCancelEdit,
  onStartReply, onCancelReply, onDelete, onSubmitReply,
}: {
  c: Comment;
  currentUserId: string;
  currentUserRole: string;
  now: number;
  editingId: string | null;
  editContent: string;
  editSaving: boolean;
  replyingToId: string | null;
  onStartEdit: (id: string, content: string) => void;
  onEditChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onStartReply: (id: string) => void;
  onCancelReply: () => void;
  onDelete: () => void;
  onSubmitReply: (content: string) => Promise<boolean>;
}) {
  const { label, color } = commentTypeLabel(c.type);
  const isEditing = editingId === c.id;
  const isOwn = c.author.id === currentUserId;
  const isShowingReplyForm = replyingToId === c.id;
  const isMentorOrAdmin = currentUserRole === "ADMIN" || currentUserRole === "MENTOR";

  return (
    <div className="bg-[#13131e] border border-white/5 rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {c.author.avatarUrl ? (
            <img src={c.author.avatarUrl} alt={c.author.name} referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-300 flex-shrink-0 font-medium">
              {c.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-300 font-medium leading-none">
              {c.author.name}
              {(c.author.role === "ADMIN" || c.author.role === "MENTOR") && <span className="ml-1 text-violet-400">· mentor</span>}
            </span>
            <span className={`self-start text-xs font-medium px-1.5 rounded-full border ${color}`}>{label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-gray-600">{timeAgo(c.createdAt, now)}</span>
          {isOwn && isMentorOrAdmin && !isEditing && (
            <button onClick={() => onStartEdit(c.id, c.content)}
              className="text-gray-700 hover:text-violet-400 transition-colors" title="Editar">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {isMentorOrAdmin && (
            <button onClick={onDelete} className="text-gray-700 hover:text-red-400 text-xs transition-colors">✕</button>
          )}
        </div>
      </div>

      {/* Conteúdo / edição */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea value={editContent} onChange={(e) => onEditChange(e.target.value)}
            autoFocus rows={4}
            className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
          />
          <div className="flex gap-2">
            <button onClick={onCancelEdit}
              className="flex-1 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={() => onSaveEdit(c.id)} disabled={editSaving}
              className="flex-1 py-1.5 text-xs text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg transition-colors font-medium">
              {editSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-200 leading-relaxed">{c.content}</p>
      )}

      {/* Replies */}
      {c.replies.length > 0 && (
        <div className="mt-2 pl-3 border-l border-white/8 space-y-2">
          {c.replies.map((r) => (
            <ReplyCard
              key={r.id}
              r={r}
              currentUserId={currentUserId}
              now={now}
              editingId={editingId}
              editContent={editContent}
              editSaving={editSaving}
              onStartEdit={onStartEdit}
              onEditChange={onEditChange}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </div>
      )}

      {/* Reply form */}
      {isShowingReplyForm ? (
        <ReplyForm onSubmit={onSubmitReply} onCancel={onCancelReply} />
      ) : (
        !isEditing && (
          <button onClick={() => onStartReply(c.id)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-emerald-400 transition-colors mt-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Responder
          </button>
        )
      )}
    </div>
  );
}

/* ── Reply card ── */
function ReplyCard({
  r, currentUserId, now,
  editingId, editContent, editSaving,
  onStartEdit, onEditChange, onSaveEdit, onCancelEdit,
}: {
  r: Reply;
  currentUserId: string;
  now: number;
  editingId: string | null;
  editContent: string;
  editSaving: boolean;
  onStartEdit: (id: string, content: string) => void;
  onEditChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
}) {
  const { label, color } = commentTypeLabel(r.type);
  const isEditing = editingId === r.id;
  const isOwn = r.author.id === currentUserId;

  return (
    <div className="bg-[#0f0f1a] rounded-md p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {r.author.avatarUrl ? (
            <img src={r.author.avatarUrl} alt={r.author.name} referrerPolicy="no-referrer"
              className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-300 flex-shrink-0 font-medium">
              {r.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-gray-400 font-medium">{r.author.name}</span>
          <span className={`text-xs font-medium px-1.5 rounded-full border ${color}`}>{label}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-gray-700">{timeAgo(r.createdAt, now)}</span>
          {isOwn && !isEditing && (
            <button onClick={() => onStartEdit(r.id, r.content)}
              className="text-gray-700 hover:text-emerald-400 transition-colors" title="Editar resposta">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-1.5">
          <textarea value={editContent} onChange={(e) => onEditChange(e.target.value)}
            autoFocus rows={3}
            className="w-full bg-[#0d0d14] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
          />
          <div className="flex gap-2">
            <button onClick={onCancelEdit}
              className="flex-1 py-1 text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-md transition-colors">
              Cancelar
            </button>
            <button onClick={() => onSaveEdit(r.id)} disabled={editSaving}
              className="flex-1 py-1 text-xs text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 rounded-md transition-colors font-medium">
              {editSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-300 leading-relaxed">{r.content}</p>
      )}
    </div>
  );
}
