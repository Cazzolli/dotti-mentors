import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchAllVideos, fetchChannelInfo, refreshVideoStats } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await req.json();
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  return syncChannel(channelId, session.user as any);
}

// Shared sync logic — used by the manual endpoint and the cron
export async function syncChannel(channelId: string, user?: { role: string; id: string }) {
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user && user.role !== "ADMIN" && channel.studentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!channel.uploadPlaylistId) {
    return NextResponse.json({ error: "Canal sem playlist de uploads" }, { status: 400 });
  }

  const isIncremental = !!channel.lastSync;
  // Add 1-hour buffer so we don't miss videos uploaded very close to lastSync
  const since = channel.lastSync
    ? new Date(channel.lastSync.getTime() - 60 * 60 * 1000)
    : undefined;

  // 1. Refresh channel-level stats (1 API unit)
  try {
    const info = await fetchChannelInfo(channel.youtubeChannelId);
    await db.channel.update({
      where: { id: channelId },
      data: {
        name: info.name,
        avatarUrl: info.avatarUrl,
        subscriberCount: info.subscriberCount,
        viewCount: info.viewCount,
        videoCount: info.videoCount,
        uploadPlaylistId: info.uploadPlaylistId,
      },
    });
  } catch (_) {}

  // 2. Fetch new videos (incremental: only since lastSync; full: all)
  const newVideos = await fetchAllVideos(channel.uploadPlaylistId, since);

  // 3. For incremental syncs: also refresh stats of videos < 90 days old
  let statsRefreshed = 0;
  if (isIncremental) {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentVideos = await db.video.findMany({
      where: { channelId, publishedAt: { gte: cutoff } },
      select: { youtubeVideoId: true },
    });
    const idsToRefresh = recentVideos
      .map((v) => v.youtubeVideoId)
      .filter((id) => !newVideos.find((nv) => nv.youtubeVideoId === id));

    if (idsToRefresh.length > 0) {
      const refreshed = await refreshVideoStats(idsToRefresh);
      statsRefreshed = refreshed.length;

      const avgViews = await getAvgViews(channelId, newVideos);
      for (const v of refreshed) {
        const outlierScore = avgViews > 0 ? parseFloat((v.views / avgViews).toFixed(2)) : 0;
        await db.video.update({
          where: { youtubeVideoId: v.youtubeVideoId },
          data: { views: v.views, likes: v.likes, commentsCount: v.commentsCount, outlierScore },
        });
      }
    }
  }

  // 4. Upsert new videos
  let upserted = 0;
  if (newVideos.length > 0) {
    const avgViews = await getAvgViews(channelId, newVideos);
    for (const v of newVideos) {
      const outlierScore = avgViews > 0 ? parseFloat((v.views / avgViews).toFixed(2)) : 0;
      await db.video.upsert({
        where: { youtubeVideoId: v.youtubeVideoId },
        create: { ...v, channelId, outlierScore },
        update: { views: v.views, likes: v.likes, commentsCount: v.commentsCount, outlierScore },
      });
      upserted++;
    }
  }

  await db.channel.update({ where: { id: channelId }, data: { lastSync: new Date() } });

  return NextResponse.json({
    ok: true,
    mode: isIncremental ? "incremental" : "full",
    newVideos: newVideos.length,
    statsRefreshed,
    upserted,
  });
}

async function getAvgViews(channelId: string, pendingVideos: { views: number }[]) {
  const existing = await db.video.aggregate({
    where: { channelId },
    _avg: { views: true },
    _count: true,
  });

  const existingAvg = existing._avg.views ?? 0;
  const existingCount = existing._count;

  if (existingCount === 0) {
    const total = pendingVideos.reduce((s, v) => s + v.views, 0);
    return pendingVideos.length > 0 ? total / pendingVideos.length : 1;
  }

  const pendingTotal = pendingVideos.reduce((s, v) => s + v.views, 0);
  const combined = existingAvg * existingCount + pendingTotal;
  const count = existingCount + pendingVideos.length;
  return count > 0 ? combined / count : 1;
}
