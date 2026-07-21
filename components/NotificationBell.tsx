"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";

interface NotifComment {
  type: string;
  channelId: string;
  videoId: string | null;
  channel: { id: string; name: string; handle: string | null };
  video: { id: string; title: string } | null;
  author: { name: string };
}

interface NotifChannel {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  student: { name: string };
}

interface NotifMentorIdea {
  id: string;
  content: string;
  author: { name: string; avatarUrl: string | null };
}

interface Notification {
  id: string;
  type: "FEEDBACK" | "NEW_CHANNEL" | "MENTOR_IDEA";
  read: boolean;
  createdAt: string;
  comment: NotifComment | null;
  channel: NotifChannel | null;
  mentorIdea: NotifMentorIdea | null;
}

const COMMENT_TYPE_LABEL: Record<string, string> = {
  FEEDBACK: "Feedback",
  DIRECIONAMENTO: "Direcionamento",
  OBSERVACAO: "Observação",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchNotifications() {
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifications(await res.json());
  }

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.top, left: rect.right + 8 });
    }
    setOpen((v) => !v);
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleNotifClick(n: Notification) {
    // mark as read
    if (!n.read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }

    if (n.type === "FEEDBACK" && n.comment?.channelId) {
      const base = `/canais/${n.comment.channelId}`;
      const url = n.comment.videoId ? `${base}?videoId=${n.comment.videoId}` : `${base}?feedback=channel`;
      router.push(url);
    } else if (n.type === "NEW_CHANNEL" && n.channel?.id) {
      router.push(`/canais/${n.channel.id}`);
    } else if (n.type === "MENTOR_IDEA") {
      router.push("/dashboard");
    }
    setOpen(false);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="px-3 mb-1">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <span className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        <span>Notificações</span>
        {unreadCount > 0 && (
          <span className="ml-auto text-xs text-red-400 font-medium">{unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            ref={ref}
            style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}
            className="w-80 bg-[#13131e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold text-white">Notificações</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">Nenhuma notificação</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 items-start ${
                    !n.read ? "bg-violet-500/5" : ""
                  }`}
                >
                  {/* icon */}
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-0.5 ${
                    n.type === "NEW_CHANNEL"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : n.type === "MENTOR_IDEA"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-violet-500/15 text-violet-400"
                  }`}>
                    {n.type === "NEW_CHANNEL" ? "📺" : n.type === "MENTOR_IDEA" ? "💡" : "💬"}
                  </div>

                  <div className="flex-1 min-w-0">
                    {n.type === "FEEDBACK" && n.comment && (
                      <>
                        <p className="text-xs text-gray-200 leading-snug">
                          <span className="font-medium text-white">{n.comment.author.name}</span>
                          {" deixou um "}
                          <span className="text-violet-300">{COMMENT_TYPE_LABEL[n.comment.type] ?? n.comment.type}</span>
                          {n.comment.video
                            ? <> no vídeo <span className="text-gray-300 line-clamp-1">"{n.comment.video.title}"</span></>
                            : <> no canal <span className="text-gray-300">{n.comment.channel.name}</span></>
                          }
                        </p>
                      </>
                    )}
                    {n.type === "NEW_CHANNEL" && n.channel && (
                      <p className="text-xs text-gray-200 leading-snug">
                        <span className="font-medium text-white">{n.channel.student.name}</span>
                        {" cadastrou o canal "}
                        <span className="text-emerald-300">{n.channel.handle ?? n.channel.name}</span>
                      </p>
                    )}
                    {n.type === "MENTOR_IDEA" && n.mentorIdea && (
                      <p className="text-xs text-gray-200 leading-snug">
                        <span className="font-medium text-white">{n.mentorIdea.author.name}</span>
                        {" enviou uma "}
                        <span className="text-amber-300">ideia de canal</span>
                        {" para você"}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>

                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
