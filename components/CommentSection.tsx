"use client";
import { useState, useEffect } from "react";
import { commentTypeLabel, timeAgo } from "@/lib/utils";

interface Video { id: string; title: string }

interface Comment {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  videoId: string | null;
  video: Video | null;
  author: { id: string; name: string; role: string; avatarUrl?: string | null };
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
  const now = Date.now();

  useEffect(() => {
    loadChannelComments();
    loadVideoComments();
    onViewed?.();
  }, [channelId]);

  useEffect(() => {
    if (videoId) setVideoOpen(true);
  }, [videoId]);

  async function loadChannelComments() {
    const res = await fetch(`/api/comments?channelId=${channelId}`);
    if (res.ok) setChannelComments(await res.json());
  }

  async function loadVideoComments() {
    const res = await fetch(`/api/comments?channelId=${channelId}&allVideos=true`);
    if (res.ok) setVideoComments(await res.json());
  }

  async function submitComment(target: "channel" | "video", type: string, content: string) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId,
        videoId: target === "video" ? videoId : null,
        type,
        content,
      }),
    });
    if (!res.ok) return false;
    const newComment = await res.json();
    if (target === "channel") {
      setChannelComments((prev) => [...prev, newComment]);
      setChannelFormOpen(false);
    } else {
      setVideoComments((prev) => [...prev, newComment]);
      setVideoFormOpen(false);
    }
    return true;
  }

  async function handleDelete(id: string, target: "channel" | "video") {
    if (!confirm("Excluir este comentário?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (target === "channel") setChannelComments((p) => p.filter((c) => c.id !== id));
      else setVideoComments((p) => p.filter((c) => c.id !== id));
    }
  }

  const isMentorOrAdmin = currentUserRole === "ADMIN" || currentUserRole === "MENTOR";

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
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                now={now}
                onDelete={(id) => handleDelete(id, "channel")}
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
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                now={now}
                onDelete={(id) => handleDelete(id, "video")}
                onViewVideo={c.video ? () => {
                  const el = document.getElementById(`video-card-${c.video!.id}`);
                  if (!el) return;
                  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  el.classList.add("ring-2", "ring-violet-400", "ring-offset-1", "ring-offset-black");
                  setTimeout(() => el.classList.remove("ring-2", "ring-violet-400", "ring-offset-1", "ring-offset-black"), 1500);
                } : undefined}
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
  icon, title, count, open, onToggle, onAdd, addActive, subtitle, children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addActive?: boolean;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#111120] border border-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-left group"
        >
          <span className="text-gray-400 group-hover:text-gray-200 transition-colors flex-shrink-0">
            {icon}
          </span>
          <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors truncate">
            {title}
          </span>
          {count > 0 && (
            <span className="flex-shrink-0 text-xs bg-white/8 text-gray-400 px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 text-gray-600 flex-shrink-0 ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {onAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            title="Dar feedback"
            className={`flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
              addActive
                ? "border-violet-500/60 bg-violet-500/20 text-violet-300"
                : "border-white/10 text-gray-500 hover:text-white hover:border-white/20"
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Feedback</span>
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-white/5">
          {subtitle && (
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs text-gray-500 line-clamp-1">{subtitle}</p>
            </div>
          )}
          <div className="px-3 py-3 space-y-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Inline form ── */
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
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              type === t.value
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-white/10 text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={type === "FEEDBACK" ? "Escreva um feedback..." : type === "DIRECIONAMENTO" ? "Escreva um direcionamento..." : "Escreva uma observação..."}
        rows={4}
        className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="flex-1 py-1.5 text-xs text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg transition-colors font-medium"
        >
          {submitting ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}

/* ── Comment card ── */
function CommentCard({
  c, currentUserId, currentUserRole, now, onDelete, onViewVideo,
}: {
  c: Comment;
  currentUserId: string;
  currentUserRole: string;
  now: number;
  onDelete: (id: string) => void;
  onViewVideo?: () => void;
}) {
  const { label, color } = commentTypeLabel(c.type);
  return (
    <div className="bg-[#13131e] border border-white/5 rounded-lg p-3 space-y-2">
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
          {(currentUserRole === "ADMIN" || currentUserRole === "MENTOR" || c.author.id === currentUserId) && (
            <button onClick={() => onDelete(c.id)} className="text-gray-700 hover:text-red-400 text-xs transition-colors">✕</button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-200 leading-relaxed">{c.content}</p>
      {onViewVideo && (
        <div className="pt-1 border-t border-white/5 space-y-1.5">
          {c.video?.title && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-snug">{c.video.title}</p>
          )}
          <button
            onClick={onViewVideo}
            className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            Ver vídeo
          </button>
        </div>
      )}
    </div>
  );
}
