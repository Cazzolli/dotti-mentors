"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { formatViews, formatDuration, timeAgo } from "@/lib/utils";

interface RefLink { url: string; title: string; ytId: string | null; }

interface VideoItem {
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
  channel: {
    id: string;
    name: string;
    handle: string | null;
    avatarUrl: string | null;
    student: { id: string; name: string };
  };
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

function parseLinks(raw: string | null | undefined): RefLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) =>
      typeof item === "string"
        ? { url: item, title: item, ytId: extractYouTubeId(item) }
        : { url: item.url ?? "", title: item.title ?? item.url ?? "", ytId: item.ytId ?? extractYouTubeId(item.url ?? "") }
    );
  } catch { return []; }
}

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all transition-colors">
        {part}
      </a>
    ) : <span key={i}>{part}</span>
  );
}

const PERIODS = [
  { value: "all", label: "Sempre" },
  { value: "1d", label: "24h" },
  { value: "3d", label: "3d" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "1y", label: "1a" },
];

const SORT_OPTS = [
  { value: "recent", label: "Mais recentes" },
  { value: "views", label: "Mais views" },
  { value: "oldest", label: "Mais antigos" },
];

const LIMIT = 50;

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" /><polyline points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
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

function IdeaLinkCard({ link }: { link: RefLink }) {
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
          <p className="text-xs text-gray-200 leading-snug mb-1">{title}</p>
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
    </div>
  );
}

function OverviewVideoCard({ video, now }: { video: VideoItem; now: number }) {
  const channelName = video.channel.name;
  const studentName = video.channel.student.name;
  const studentId = video.channel.student.id;
  const [modalOpen, setModalOpen] = useState(false);

  const links = parseLinks(video.videoLinks);
  const hasIdea = !!(video.videoIdea?.trim()) || links.length > 0;

  return (
    <>
    <div className="group bg-[#13131e] border border-white/5 hover:border-white/10 rounded-xl overflow-hidden transition-all duration-200 flex flex-col">
      {/* Thumbnail */}
      <Link href={`/canais/${video.channel.id}?from=visao-geral`} className="relative aspect-video bg-[#0d0d14] overflow-hidden flex-shrink-0 block">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 text-3xl">▶</div>
        )}
        <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
          {video.isShort ? <span className="text-red-400 font-semibold">#Short</span> : formatDuration(video.durationSeconds)}
        </div>
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link href={`/canais/${video.channel.id}?from=visao-geral`}
          className="text-sm text-gray-200 line-clamp-2 leading-snug hover:text-white transition-colors flex-1">
          {video.title}
        </Link>

        {/* Canal - Aluno */}
        <div className="flex items-center gap-2 min-w-0">
          {video.channel.avatarUrl ? (
            <img src={video.channel.avatarUrl} alt="" referrerPolicy="no-referrer"
              className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-violet-500/20 flex-shrink-0" />
          )}
          <span className="text-xs text-gray-400 truncate">
            {channelName}
            <span className="text-gray-600 mx-1">-</span>
            <Link href={`/admin/alunos/${studentId}?from=visao-geral`}
              onClick={(e) => e.stopPropagation()}
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              {studentName}
            </Link>
          </span>
        </div>

        {/* Stats + ícone ideia */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>👁 {formatViews(video.views)}</span>
            <span>👍 {formatViews(video.likes)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{video.publishedAt ? timeAgo(video.publishedAt, now) : ""}</span>
            <button
              onClick={() => hasIdea && setModalOpen(true)}
              disabled={!hasIdea}
              title={hasIdea ? "Ver ideia do vídeo" : "Sem ideia registrada"}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all ${
                hasIdea
                  ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300 cursor-pointer"
                  : "text-gray-700 cursor-default"
              }`}
            >
              <CompassIcon className="w-3 h-3" />
              {hasIdea && <span className="text-[10px] font-medium">Ideia</span>}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Modal read-only — idêntico ao do VideoCard (mentor) */}
    {modalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="w-full max-w-xl bg-[#13131e] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 p-6 max-h-[90vh] overflow-y-auto">

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <CompassIcon className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Ideia do Vídeo</span>
            <button onClick={() => setModalOpen(false)} className="ml-auto text-gray-600 hover:text-gray-300 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-gray-500 border-l border-white/10 pl-3 italic line-clamp-2 -mt-1">{video.title}</p>

          {video.videoIdea?.trim() && (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
              {renderTextWithLinks(video.videoIdea.trim())}
            </p>
          )}

          {links.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 font-medium">Links de referência</p>
              <div className="flex flex-col gap-1.5">
                {links.map((link, i) => (
                  <IdeaLinkCard key={i} link={link} />
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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoTotal, setVideoTotal] = useState(0);
  const [videoOffset, setVideoOffset] = useState(0);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [period, setPeriod] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [minSubscribers, setMinSubscribers] = useState(0);
  const now = Date.now();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      const r = (session.user as any).role;
      if (r !== "ADMIN" && r !== "MENTOR") router.push("/dashboard");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") loadVideos(0);
  }, [status, period, sortBy, search, studentFilter, minSubscribers]);

  const loadVideos = useCallback(async (newOffset: number) => {
    setLoadingVideos(true);
    const params = new URLSearchParams({
      period, sortBy,
      offset: String(newOffset), limit: String(LIMIT),
    });
    if (search) params.set("search", search);
    if (studentFilter) params.set("studentName", studentFilter);
    if (minSubscribers > 0) params.set("minSubscribers", String(minSubscribers));
    const res = await fetch(`/api/admin/videos?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (newOffset === 0) setVideos(data.items);
      else setVideos((prev) => [...prev, ...data.items]);
      setVideoTotal(data.total);
      setVideoOffset(newOffset + LIMIT);
    }
    setLoadingVideos(false);
  }, [period, sortBy, search, studentFilter, minSubscribers]);

  if (status !== "authenticated") return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={((session?.user as any)?.role ?? "STUDENT") as "ADMIN" | "MENTOR" | "STUDENT"} userName={session?.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#09090b] border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Visão Geral</h1>
              <p className="text-sm text-gray-500">{videoTotal} vídeos rastreados</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Period */}
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

              {/* Sort */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                {SORT_OPTS.map((s) => (
                  <button key={s.value} onClick={() => setSortBy(s.value)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      sortBy === s.value ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Subscribers filter */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setMinSubscribers(0)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    minSubscribers === 0 ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Qualquer
                </button>
                <button
                  onClick={() => setMinSubscribers(1000)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    minSubscribers === 1000 ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  +1k inscritos
                </button>
              </div>

              {/* Search by student */}
              <form onSubmit={(e) => { e.preventDefault(); setStudentFilter(studentInput); }} className="flex gap-1">
                <div className="relative flex items-center">
                  <svg className="absolute left-2.5 w-3.5 h-3.5 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <input type="text" value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="Filtrar por aluno..."
                    className="bg-[#0f0f14] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 w-44" />
                </div>
                {studentFilter && (
                  <button type="button" onClick={() => { setStudentFilter(""); setStudentInput(""); }}
                    className="px-2 text-gray-500 hover:text-white text-sm transition-colors">✕</button>
                )}
              </form>

              {/* Search by video title */}
              <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} className="flex gap-1">
                <div className="relative flex items-center">
                  <svg className="absolute left-2.5 w-3.5 h-3.5 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                  </svg>
                  <input type="text" value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar vídeo..."
                    className="bg-[#0f0f14] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 w-44" />
                </div>
                {search && (
                  <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }}
                    className="px-2 text-gray-500 hover:text-white text-sm transition-colors">✕</button>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="p-6">
          {videos.length === 0 && !loadingVideos ? (
            <div className="text-center py-20 text-gray-600">
              <p>Nenhum vídeo encontrado com esses filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {videos.map((v) => (
                <OverviewVideoCard key={v.id} video={v} now={now} />
              ))}
            </div>
          )}

          {videoOffset < videoTotal && (
            <div className="text-center mt-6 pb-4">
              <button onClick={() => loadVideos(videoOffset)} disabled={loadingVideos}
                className="px-6 py-2 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                {loadingVideos ? "Carregando..." : `Carregar mais (${videoTotal - videoOffset} restantes)`}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
