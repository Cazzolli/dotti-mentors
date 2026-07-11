"use client";
import { useState, useEffect, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import VideoCard from "@/components/VideoCard";
import CommentSection from "@/components/CommentSection";
import ChannelIdea from "@/components/ChannelIdea";
import { formatViews, timeAgo } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  lastSync: string | null;
  channelIdea: string | null;
  studentId: string;
  youtubeChannelId: string;
  student: { id: string; name: string; email: string };
  _count: { videos: number; comments: number };
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
  _count?: { comments: number };
}

const SORT_OPTIONS = [
  { value: "publishedAt", label: "Mais recentes" },
  { value: "views", label: "Mais views" },
  { value: "publishedAt_asc", label: "Mais antigos" },
];

export default function CanalPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState("publishedAt");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    searchParams.get("videoId")
  );
  const [autoOpenChannel, setAutoOpenChannel] = useState(
    searchParams.get("feedback") === "channel"
  );

  useEffect(() => {
    const vid = searchParams.get("videoId");
    const chan = searchParams.get("feedback") === "channel";
    if (vid) setSelectedVideoId(vid);
    if (chan) setAutoOpenChannel(true);
  }, [searchParams]);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [unreadVideoIds, setUnreadVideoIds] = useState<Set<string>>(new Set());
  const now = Date.now();
  const LIMIT = 50;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      loadChannel();
      loadNotifications();
    }
  }, [status, channelId]);

  useEffect(() => {
    if (channel) loadVideos(0);
  }, [channel, sortBy, search]);

  async function loadChannel() {
    const res = await fetch(`/api/channels/${channelId}`);
    if (!res.ok) { router.push("/"); return; }
    const data = await res.json();
    setChannel(data);
    // auto-sync if lastSync is older than 6 hours
    if (data.lastSync) {
      const age = Date.now() - new Date(data.lastSync).getTime();
      if (age > 60 * 60 * 1000) triggerAutoSync();
    }
  }

  async function triggerAutoSync() {
    setAutoSyncing(true);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const res = await fetch(`/api/channels/${channelId}`);
      if (res.ok) setChannel(await res.json());
      await loadVideos(0);
    } finally {
      setAutoSyncing(false);
    }
  }

  async function loadNotifications() {
    const res = await fetch(`/api/notifications?channelId=${channelId}`);
    if (!res.ok) return;
    const data = await res.json();
    setUnreadVideoIds(new Set(data.videoIds ?? []));
  }

  async function markVideoRead(videoId: string) {
    setUnreadVideoIds((prev) => { const next = new Set(prev); next.delete(videoId); return next; });
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, videoId }),
    });
  }

  async function markChannelRead() {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, videoId: null }),
    });
  }

  const loadVideos = useCallback(async (newOffset: number) => {
    if (!channel) return;
    setLoadingVideos(true);
    const params = new URLSearchParams({
      channelId,
      sortBy,
      offset: String(newOffset),
      limit: String(LIMIT),
    });
    if (search) params.set("search", search);

    const res = await fetch(`/api/videos?${params}`);
    const data = await res.json();
    if (newOffset === 0) {
      setVideos(data.items);
    } else {
      setVideos((prev) => [...prev, ...data.items]);
    }
    setTotal(data.total);
    setOffset(newOffset + LIMIT);
    setLoadingVideos(false);
  }, [channel, channelId, sortBy, search]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
    await loadChannel();
    await loadVideos(0);
    setSyncing(false);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  const role = (session?.user as any)?.role ?? "STUDENT";
  const currentUserId = (session?.user as any)?.id ?? "";
  const isOwner = channel ? channel.studentId === currentUserId : false;
  const selectedVideo = selectedVideoId ? videos.find((v) => v.id === selectedVideoId) : null;

  if (status !== "authenticated" || !channel) return null;

  const isMentorOrAdmin = role === "ADMIN" || role === "MENTOR";
  const fromVisaoGeral = searchParams.get("from") === "visao-geral";
  const backHref = isMentorOrAdmin ? `/admin/alunos/${channel.studentId}` : "/dashboard";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={session?.user?.name ?? ""} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Channel header */}
        <div className="border-b border-white/5 bg-[#09090b] px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            {fromVisaoGeral ? (
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-white transition-colors flex-shrink-0"
                title="Voltar para Visão Geral"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
            ) : (
            <a
              href={backHref}
              className="text-gray-600 hover:text-white transition-colors flex-shrink-0"
              title="Voltar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </a>
            )}

            <a
              href={`https://youtube.com/${channel.handle ?? `channel/${channel.youtubeChannelId}`}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 group/avatar"
              title="Ver canal no YouTube"
            >
              {channel.avatarUrl ? (
                <img
                  src={channel.avatarUrl}
                  alt={channel.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover group-hover/avatar:ring-2 group-hover/avatar:ring-red-500/60 transition-all"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gray-700 flex-shrink-0" />
              )}
            </a>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <a
                  href={`https://youtube.com/${channel.handle ?? `channel/${channel.youtubeChannelId}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-white hover:text-red-400 transition-colors truncate"
                >
                  {channel.name}
                </a>
                {channel.handle && (
                  <a
                    href={`https://youtube.com/${channel.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors truncate"
                  >
                    {channel.handle}
                  </a>
                )}
                {isMentorOrAdmin && (
                  <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    {channel.student.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/5 border border-white/8 rounded-md px-2.5 py-1 text-xs text-gray-300">
                  <span className="text-gray-500 mr-1">Inscritos</span>
                  {formatViews(channel.subscriberCount)}
                </span>
                <span className="bg-white/5 border border-white/8 rounded-md px-2.5 py-1 text-xs text-gray-300">
                  <span className="text-gray-500 mr-1">Views</span>
                  {formatViews(channel.viewCount)}
                </span>
                <span className="bg-white/5 border border-white/8 rounded-md px-2.5 py-1 text-xs text-gray-300">
                  <span className="text-gray-500 mr-1">Vídeos</span>
                  {channel._count.videos}
                </span>
                {channel.lastSync && !autoSyncing && (
                  <span className="text-xs text-gray-600">
                    Sync {timeAgo(channel.lastSync)}
                  </span>
                )}
                {autoSyncing && (
                  <span className="text-xs text-violet-400 animate-pulse">atualizando...</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {role === "ADMIN" && (
                <button
                  onClick={handleSync}
                  disabled={syncing || autoSyncing}
                  className="px-3 py-1.5 text-xs border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {syncing ? "Sincronizando..." : "↻ Sincronizar"}
                </button>
              )}
              <a
                href={`https://youtube.com/channel/${channel.youtubeChannelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                YouTube ↗
              </a>
            </div>
          </div>
        </div>

        {/* Body: videos (left) + feedback panel (right, always visible) */}
        <div className="flex-1 flex overflow-hidden">

          {/* Videos column */}
          <div className="flex-1 overflow-y-auto p-5" onClick={() => setSelectedVideoId(null)}>
            {/* Filter bar */}
            <div className="flex items-center gap-3 mb-5">
              <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar vídeos..."
                  className="flex-1 bg-[#0f0f14] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setSearchInput(""); }}
                    className="px-2 py-1.5 text-gray-500 hover:text-white text-sm transition-colors"
                  >
                    ✕
                  </button>
                )}
              </form>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#0f0f14] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500/50"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <span className="text-xs text-gray-600 ml-auto">
                {loadingVideos ? "Carregando..." : `${total} vídeo${total !== 1 ? "s" : ""}`}
              </span>
            </div>

            {/* Video grid */}
            {videos.length === 0 && !loadingVideos ? (
              <div className="text-center py-20 text-gray-600">
                <p className="mb-3">Nenhum vídeo encontrado.</p>
                <button onClick={handleSync} className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
                  Sincronizar agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {videos.map((v) => (
                  <div key={v.id} onClick={(e) => e.stopPropagation()}>
                  <VideoCard
                    video={v}
                    now={now}
                    onSelect={(id) => {
                      const next = selectedVideoId === id ? null : id;
                      setSelectedVideoId(next);
                      if (next && unreadVideoIds.has(next)) markVideoRead(next);
                    }}
                    selected={selectedVideoId === v.id}
                    hasUnreadFeedback={unreadVideoIds.has(v.id)}
                    hasFeedback={(v._count?.comments ?? 0) > 0}
                    isOwner={isOwner}
                    onIdeaChange={(videoId, idea, links) =>
                      setVideos((prev) => prev.map((x) =>
                        x.id === videoId ? { ...x, videoIdea: idea, videoLinks: JSON.stringify(links) } : x
                      ))
                    }
                  />
                  </div>
                ))}
              </div>
            )}

            {offset < total && (
              <div className="text-center mt-6 pb-4">
                <button
                  onClick={() => loadVideos(offset)}
                  disabled={loadingVideos}
                  className="px-6 py-2 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {loadingVideos ? "Carregando..." : `Carregar mais (${total - offset} restantes)`}
                </button>
              </div>
            )}
          </div>

          {/* Right panel — Ideia do Canal + Feedback */}
          <div className="w-84 flex-shrink-0 border-l border-white/5 flex flex-col overflow-hidden" style={{ width: "22rem" }}>

            {/* Ideia do Canal */}
            <ChannelIdea
              channelId={channelId}
              initialIdea={channel.channelIdea}
              isOwner={channel.studentId === currentUserId}
              className="px-4 py-4 border-b border-white/5 flex-shrink-0"
            />

            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-3">
              <CommentSection
                channelId={channelId}
                videoId={selectedVideoId}
                videoTitle={selectedVideo?.title ?? null}
                videoYoutubeId={selectedVideo?.youtubeVideoId ?? null}
                currentUserId={currentUserId}
                currentUserRole={role}
                onViewed={markChannelRead}
                autoOpenChannel={autoOpenChannel}
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
