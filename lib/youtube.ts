import { google } from "googleapis";

const API_KEYS = (process.env.YOUTUBE_API_KEYS ?? "").split(",").filter(Boolean);
let keyIndex = 0;

function getYoutube() {
  if (API_KEYS.length === 0) throw new Error("YOUTUBE_API_KEYS not configured");
  return google.youtube({ version: "v3", auth: API_KEYS[keyIndex % API_KEYS.length] });
}

function rotateKey() {
  keyIndex = (keyIndex + 1) % API_KEYS.length;
}

export async function fetchChannelInfo(input: string) {
  const youtube = getYoutube();

  let channelId = input;

  if (input.startsWith("@") || input.includes("youtube.com")) {
    const handle = input.startsWith("@")
      ? input
      : input.match(/@([^/?]+)/)?.[0] ?? input;

    try {
      const res = await youtube.channels.list({
        forHandle: handle.replace("@", ""),
        part: ["id", "snippet", "contentDetails", "statistics"],
      });
      const ch = res.data.items?.[0];
      if (!ch) throw new Error("Canal não encontrado");
      return buildChannelInfo(ch);
    } catch (e: any) {
      if (e?.code === 403) rotateKey();
      throw e;
    }
  }

  try {
    const res = await youtube.channels.list({
      id: [channelId],
      part: ["id", "snippet", "contentDetails", "statistics"],
    });
    const ch = res.data.items?.[0];
    if (!ch) throw new Error("Canal não encontrado");
    return buildChannelInfo(ch);
  } catch (e: any) {
    if (e?.code === 403) rotateKey();
    throw e;
  }
}

function buildChannelInfo(ch: any) {
  return {
    youtubeChannelId: ch.id!,
    name: ch.snippet?.title ?? "",
    handle: ch.snippet?.customUrl ?? null,
    avatarUrl:
      ch.snippet?.thumbnails?.high?.url ??
      ch.snippet?.thumbnails?.default?.url ??
      null,
    subscriberCount: parseInt(ch.statistics?.subscriberCount ?? "0"),
    viewCount: parseInt(ch.statistics?.viewCount ?? "0"),
    videoCount: parseInt(ch.statistics?.videoCount ?? "0"),
    uploadPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads ?? null,
  };
}

// Full sync (no lastSync) or incremental (stops when videos are older than since).
// Returns new/updated video objects.
export async function fetchAllVideos(uploadPlaylistId: string, since?: Date) {
  const youtube = getYoutube();
  const newVideoIds: string[] = [];
  let pageToken: string | undefined;
  let done = false;

  // 1. Collect video IDs from playlist, stopping early for incremental syncs
  do {
    try {
      const res = await youtube.playlistItems.list({
        playlistId: uploadPlaylistId,
        maxResults: 50,
        pageToken,
        part: ["contentDetails"],
      });

      const items = res.data.items ?? [];
      for (const item of items) {
        const videoId = item.contentDetails?.videoId;
        if (!videoId) continue;

        const publishedAt = item.contentDetails?.videoPublishedAt
          ? new Date(item.contentDetails.videoPublishedAt)
          : null;

        // Stop when we hit a video older than lastSync (playlist is newest-first)
        if (since && publishedAt && publishedAt <= since) {
          done = true;
          break;
        }
        newVideoIds.push(videoId);
      }

      pageToken = done ? undefined : (res.data.nextPageToken ?? undefined);
    } catch (e: any) {
      if (e?.code === 403) rotateKey();
      throw e;
    }
  } while (pageToken && !done);

  if (newVideoIds.length === 0) return [];

  // 2. Fetch details for new videos in batches of 50
  return fetchVideoDetails(newVideoIds);
}

// Refresh stats for a list of existing video IDs (used for recent videos already in DB)
export async function refreshVideoStats(youtubeVideoIds: string[]) {
  if (youtubeVideoIds.length === 0) return [];
  return fetchVideoDetails(youtubeVideoIds);
}

async function fetchVideoDetails(videoIds: string[]) {
  const youtube = getYoutube();
  const results: any[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    try {
      const res = await youtube.videos.list({
        id: batch,
        part: ["snippet", "statistics", "contentDetails"],
      });
      results.push(...(res.data.items ?? []));
    } catch (e: any) {
      if (e?.code === 403) rotateKey();
      throw e;
    }
  }

  return results.map((v) => {
    const durationSeconds = parseDuration(v.contentDetails?.duration ?? "");
    return {
      youtubeVideoId: v.id as string,
      title: v.snippet?.title ?? "",
      thumbnailUrl:
        v.snippet?.thumbnails?.high?.url ??
        v.snippet?.thumbnails?.medium?.url ??
        v.snippet?.thumbnails?.default?.url ??
        null,
      views: parseInt(v.statistics?.viewCount ?? "0"),
      likes: parseInt(v.statistics?.likeCount ?? "0"),
      commentsCount: parseInt(v.statistics?.commentCount ?? "0"),
      durationSeconds,
      isShort: durationSeconds > 0 && durationSeconds <= 60,
      publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : null,
    };
  });
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] ?? "0") * 3600 +
    parseInt(match[2] ?? "0") * 60 +
    parseInt(match[3] ?? "0")
  );
}
