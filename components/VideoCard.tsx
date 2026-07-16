"use client";
import { useState, useEffect } from "react";
import { formatViews, formatDuration, timeAgo } from "@/lib/utils";
import CharCounter from "./CharCounter";

const IDEA_MAX_LENGTH = 2000;

interface RefLink {
  url: string;
  title: string;
  ytId: string | null;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2];
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
      return u.searchParams.get("v");
    }
  } catch {}
  return null;
}

function ytThumb(id: string) {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

async function fetchLinkMeta(url: string): Promise<RefLink> {
  const ytId = extractYouTubeId(url);
  if (ytId) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        return { url, title: data.title ?? url, ytId };
      }
    } catch {}
  }
  return { url, title: url, ytId };
}

function parseLinks(raw: string | null | undefined): RefLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => {
      if (typeof item === "string") {
        return { url: item, title: item, ytId: extractYouTubeId(item) };
      }
      return { url: item.url ?? "", title: item.title ?? item.url ?? "", ytId: item.ytId ?? extractYouTubeId(item.url ?? "") };
    });
  } catch { return []; }
}

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all transition-colors">
        {part}
      </a>
    ) : <span key={i}>{part}</span>
  );
}

/* ── Link card ── */
function LinkCard({ link, onRemove }: { link: RefLink; onRemove?: () => void }) {
  const needsFetch = link.title === link.url || link.title.startsWith("http");
  const [title, setTitle] = useState(needsFetch ? "" : link.title);

  useEffect(() => {
    if (!needsFetch) return;
    fetchLinkMeta(link.url).then((meta) => setTitle(meta.title));
  }, [link.url]);

  return (
    <div className="flex items-center gap-3 bg-[#0d0d14] border border-white/8 rounded-lg overflow-hidden pr-2">
      {link.ytId ? (
        <img src={ytThumb(link.ytId)} alt="" className="w-20 h-12 object-cover flex-shrink-0" />
      ) : (
        <div className="w-20 h-12 bg-white/5 flex items-center justify-center flex-shrink-0 text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0 py-2">
        {title ? (
          <p className="text-xs text-gray-200 leading-snug line-clamp-2 mb-1">{title}</p>
        ) : (
          <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse mb-1" />
        )}
        <a href={link.url} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors font-medium">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
          </svg>
          Acessar no YouTube
        </a>
      </div>

      {onRemove && (
        <button onClick={onRemove} className="text-gray-700 hover:text-red-400 transition-colors text-sm flex-shrink-0 ml-1">✕</button>
      )}
    </div>
  );
}

interface Video {
  id: string;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  durationSeconds: number;
  isShort: boolean;
  publishedAt: string | null;
  outlierScore: number;
  videoIdea?: string | null;
  videoLinks?: string | null;
}

interface Props {
  video: Video;
  now?: number;
  onSelect?: (videoId: string) => void;
  selected?: boolean;
  hasUnreadFeedback?: boolean;
  hasFeedback?: boolean;
  isOwner?: boolean;
  onIdeaChange?: (videoId: string, idea: string, links: RefLink[]) => void;
}

export default function VideoCard({ video, now, onSelect, selected, hasUnreadFeedback, hasFeedback, isOwner, onIdeaChange }: Props) {
  const videoUrl = `https://youtube.com/watch?v=${video.youtubeVideoId}`;

  const [idea, setIdea] = useState(video.videoIdea ?? "");
  const [links, setLinks] = useState<RefLink[]>(() => parseLinks(video.videoLinks));
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [draftIdea, setDraftIdea] = useState(video.videoIdea ?? "");
  const [draftLinks, setDraftLinks] = useState<RefLink[]>(() => parseLinks(video.videoLinks));
  const [linkInput, setLinkInput] = useState("");
  const [fetchingLink, setFetchingLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const hasIdea = idea.trim().length > 0 || links.length > 0;

  function openEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraftIdea(idea);
    setDraftLinks([...links]);
    setLinkInput("");
    setSaveError(false);
    setEditModalOpen(true);
  }

  async function addLink() {
    const trimmed = linkInput.trim();
    if (!trimmed || draftLinks.some((l) => l.url === trimmed)) return;
    setFetchingLink(true);
    const meta = await fetchLinkMeta(trimmed);
    setDraftLinks((prev) => [...prev, meta]);
    setLinkInput("");
    setFetchingLink(false);
  }

  function handleLinkKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addLink(); }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIdea: draftIdea, videoLinks: draftLinks }),
      });
      if (res.ok) {
        const trimmedIdea = draftIdea.trim();
        setIdea(trimmedIdea);
        setLinks(draftLinks);
        onIdeaChange?.(video.id, trimmedIdea, draftLinks);
        setEditModalOpen(false);
      } else {
        setSaveError(true);
      }
    } catch {
      setSaveError(true);
    }
    setSaving(false);
  }

  const CompassIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" /><polyline points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );

  return (
    <>
      <div
        id={`video-card-${video.id}`}
        className={`group bg-[#13131e] hover:bg-[#1c1c2a] border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
          selected ? "border-violet-500/60"
          : hasUnreadFeedback ? "border-red-500/40 hover:border-red-500/60"
          : "border-white/5 hover:border-white/10"
        }`}
        onClick={() => onSelect?.(video.id)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-[#0d0d14] overflow-hidden">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700 text-3xl">▶</div>
          )}

          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {video.isShort ? <span className="text-red-400 font-semibold">#Short</span> : formatDuration(video.durationSeconds)}
          </div>

          {hasUnreadFeedback && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Novo feedback
            </div>
          )}

          {hasIdea && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-amber-500/90 rounded-full flex items-center justify-center shadow-lg" title="Ideia do vídeo registrada">
              <CompassIcon className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <p className="text-sm text-gray-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
            {video.title}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <span>👁 {formatViews(video.views)}</span>
            </div>
            <span>{video.publishedAt ? timeAgo(video.publishedAt, now) : ""}</span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <a href={videoUrl} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
              </svg>
              YouTube
            </a>

            <div className="flex items-center gap-1.5">
              {hasFeedback && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-400">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Comentário
                </span>
              )}

            {isOwner ? (
              <button onClick={openEdit}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  hasIdea
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "border-white/10 text-gray-600 hover:text-amber-400 hover:border-amber-500/30"
                }`}>
                <CompassIcon className="w-2.5 h-2.5" />
                {hasIdea ? "Ideia" : "+ Ideia"}
              </button>
            ) : hasIdea ? (
              <button onClick={(e) => { e.stopPropagation(); setViewModalOpen(true); }}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                <CompassIcon className="w-2.5 h-2.5" />
                Ver ideia
              </button>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de edição — aluno ── */}
      {isOwner && editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#13131e] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 p-6 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <CompassIcon className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Ideia do Vídeo</span>
              <button onClick={() => setEditModalOpen(false)} className="ml-auto text-gray-600 hover:text-gray-300 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-gray-500 border-l border-white/10 pl-3 italic line-clamp-2 -mt-1">{video.title}</p>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Descrição da ideia</label>
              <textarea
                value={draftIdea}
                onChange={(e) => setDraftIdea(e.target.value.slice(0, IDEA_MAX_LENGTH))}
                autoFocus
                rows={5}
                maxLength={IDEA_MAX_LENGTH}
                placeholder="Descreva de onde veio a ideia deste vídeo: referência usada, ângulo escolhido, o que inspirou o tema..."
                className="w-full bg-[#0d0d14] border border-white/10 focus:border-amber-500/40 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
              />
              <CharCounter current={draftIdea.length} max={IDEA_MAX_LENGTH} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 font-medium">Links de referência</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={handleLinkKeyDown}
                  placeholder="Cole o link do vídeo que modelou..."
                  className="flex-1 bg-[#0d0d14] border border-white/10 focus:border-amber-500/40 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                />
                <button type="button" onClick={addLink}
                  disabled={!linkInput.trim() || fetchingLink}
                  className="px-3 py-2 text-xs font-medium bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 rounded-lg transition-colors disabled:opacity-40 min-w-[88px]">
                  {fetchingLink ? "Buscando..." : "Adicionar"}
                </button>
              </div>

              {draftLinks.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {draftLinks.map((link, i) => (
                    <LinkCard key={i} link={link} onRemove={() => setDraftLinks((prev) => prev.filter((_, j) => j !== i))} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              {saveError && (
                <span className="text-xs text-red-400 mr-auto">Erro ao salvar. Reinicie o servidor e tente novamente.</span>
              )}
              <button onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de leitura — mentor ── */}
      {!isOwner && viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#13131e] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 p-6 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <CompassIcon className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Ideia do Vídeo</span>
              <button onClick={() => setViewModalOpen(false)} className="ml-auto text-gray-600 hover:text-gray-300 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-gray-500 border-l border-white/10 pl-3 italic line-clamp-2 -mt-1">{video.title}</p>

            {idea.trim() && (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {renderTextWithLinks(idea)}
              </p>
            )}

            {links.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 font-medium">Links de referência</p>
                <div className="flex flex-col gap-1.5">
                  {links.map((link, i) => (
                    <LinkCard key={i} link={link} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
