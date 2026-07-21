"use client";
import Link from "next/link";
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
  student?: { id: string; name: string };
  _count?: { videos: number; comments: number };
}

export default function ChannelCard({ channel }: { channel: Channel }) {
  const feedbackCount = channel._count?.comments ?? 0;
  const hasNoFeedback = feedbackCount === 0;
  return (
    <Link
      href={`/canais/${channel.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-[#13131e] hover:bg-[#1c1c2a] border rounded-xl p-4 transition-all duration-200 ${
        hasNoFeedback ? "border-amber-500/30 hover:border-amber-500/50" : "border-white/5 hover:border-white/10"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {channel.avatarUrl ? (
          <img
            src={channel.avatarUrl}
            alt={channel.name}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-gray-400 text-sm">
            YT
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-100 truncate">{channel.name}</p>
          {channel.handle && (
            <p className="text-xs text-gray-500">{channel.handle}</p>
          )}
          {channel.student && (
            <p className="text-xs text-violet-400">{channel.student.name}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Inscritos" value={formatViews(channel.subscriberCount)} />
        <Stat label="Views" value={formatViews(channel.viewCount)} />
        <Stat label="Vídeos" value={String(channel._count?.videos ?? channel.videoCount)} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs flex items-center gap-1.5 ${hasNoFeedback ? "text-amber-400" : "text-emerald-400"}`}>
          {hasNoFeedback ? (
            "⚠️ Sem feedback"
          ) : (
            <>
              ✅ Com feedback
              <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                {feedbackCount}
              </span>
            </>
          )}
        </span>
        {channel.lastSync && (
          <p className="text-xs text-gray-600">
            Sync {timeAgo(channel.lastSync)}
          </p>
        )}
      </div>
    </Link>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "amber" }) {
  return (
    <div className={`rounded-lg py-2 px-1 ${highlight === "amber" ? "bg-amber-500/10" : "bg-white/5"}`}>
      <p className="text-[10px] leading-tight text-gray-500 truncate">{label}</p>
      <p className={`text-sm font-semibold ${highlight === "amber" ? "text-amber-400" : "text-gray-200"}`}>{value}</p>
    </div>
  );
}
