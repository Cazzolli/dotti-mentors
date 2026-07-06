import { createClient } from "@libsql/client";
import { google } from "googleapis";

const db = createClient({ url: "file:./dev.db" });

const API_KEY = process.env.YOUTUBE_API_KEYS?.split(",")[0] ?? "";
const youtube = google.youtube({ version: "v3", auth: API_KEY });

// Channels to add per student (email -> list of YouTube handles)
const assignments = {
  "aluno@teste.com": ["@TomScottGo", "@3blue1brown"],
  "joao@aluno.com": ["@MarkRober"],
  "maria@aluno.com": ["@Kurzgesagt", "@wendoverproductions", "@veritasium"],
  "pedro@aluno.com": ["@CGPGrey", "@LinusTechTips", "@ColdFusion"],
};

async function fetchChannel(handle) {
  const res = await youtube.channels.list({
    forHandle: handle.replace("@", ""),
    part: ["id", "snippet", "contentDetails", "statistics"],
  });
  const ch = res.data.items?.[0];
  if (!ch) throw new Error(`Canal não encontrado: ${handle}`);
  return {
    youtubeChannelId: ch.id,
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

async function getStudentId(email) {
  const res = await db.execute({ sql: "SELECT id FROM User WHERE email = ?", args: [email] });
  return res.rows[0]?.id ?? null;
}

async function channelExists(youtubeChannelId) {
  const res = await db.execute({
    sql: "SELECT id FROM Channel WHERE youtubeChannelId = ?",
    args: [youtubeChannelId],
  });
  return res.rows.length > 0;
}

async function insertChannel(studentId, info) {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO Channel (id, youtubeChannelId, name, handle, avatarUrl, subscriberCount, viewCount, videoCount, uploadPlaylistId, studentId, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      info.youtubeChannelId,
      info.name,
      info.handle,
      info.avatarUrl,
      info.subscriberCount,
      info.viewCount,
      info.videoCount,
      info.uploadPlaylistId,
      studentId,
      new Date().toISOString(),
    ],
  });
  return id;
}

// Run
for (const [email, handles] of Object.entries(assignments)) {
  const studentId = await getStudentId(email);
  if (!studentId) {
    console.log(`⚠️  Usuário não encontrado: ${email}`);
    continue;
  }

  for (const handle of handles) {
    try {
      const info = await fetchChannel(handle);

      if (await channelExists(info.youtubeChannelId)) {
        console.log(`  ⏭  Já existe: ${info.name} (${handle})`);
        continue;
      }

      await insertChannel(studentId, info);
      console.log(`  ✓ ${email} ← ${info.name} (${handle}) — ${(info.subscriberCount / 1000).toFixed(0)}K inscritos`);
    } catch (e) {
      console.log(`  ✗ ${handle}: ${e.message}`);
    }
  }
}

console.log("\nPronto! Use o botão Sincronizar nos canais para buscar os vídeos.");
