import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  const videoId = searchParams.get("videoId");
  const user = session.user as any;

  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const channel = await db.channel.findUnique({ where: { id: channelId }, select: { studentId: true } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isMentorOrAdmin = user.role === "ADMIN" || user.role === "MENTOR";
  if (!isMentorOrAdmin && channel.studentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const allVideos = searchParams.get("allVideos") === "true";

  const where: any = { channelId };
  if (allVideos) {
    where.videoId = { not: null };
  } else if (videoId) {
    where.videoId = videoId;
  } else {
    where.videoId = null;
  }

  const comments = await db.comment.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      video: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { channelId, videoId, type, content } = await req.json();

  if (!channelId || !type || !content?.trim()) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  // only ADMIN and MENTOR can leave feedback
  if (user.role !== "ADMIN" && user.role !== "MENTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // validate content length
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "Conteúdo muito longo" }, { status: 400 });
  }

  const channel = await db.channel.findUnique({ where: { id: channelId }, select: { id: true, studentId: true } });
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  const comment = await db.comment.create({
    data: {
      channelId,
      videoId: videoId ?? null,
      type,
      content: content.trim(),
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      video: { select: { id: true, title: true } },
    },
  });

  // notify the student if the author is a mentor
  if (channel.studentId !== user.id) {
    const existing = await db.notification.findFirst({
      where: { userId: channel.studentId, commentId: comment.id },
    });
    if (!existing) {
      await db.notification.create({
        data: { userId: channel.studentId, type: "FEEDBACK", commentId: comment.id },
      });
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
