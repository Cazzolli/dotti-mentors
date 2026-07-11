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

  const where: any = { channelId, parentId: null };
  if (allVideos) {
    where.videoId = { not: null };
  } else if (videoId) {
    where.videoId = videoId;
  } else {
    where.videoId = null;
  }

  const replyInclude = {
    author: { select: { id: true, name: true, role: true, avatarUrl: true } },
  };

  const comments = await db.comment.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      video: { select: { id: true, title: true } },
      replies: {
        where: { parentId: { not: null } },
        include: replyInclude,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { channelId, videoId, type, content, parentId } = await req.json();

  if (!channelId || !content?.trim()) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const isReply = !!parentId;
  const isMentorOrAdmin = user.role === "ADMIN" || user.role === "MENTOR";

  // students can only reply (parentId required), not create top-level feedback
  if (!isMentorOrAdmin && !isReply) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // top-level feedback requires a type
  if (!isReply && !type) {
    return NextResponse.json({ error: "Tipo obrigatório" }, { status: 400 });
  }

  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "Conteúdo muito longo" }, { status: 400 });
  }

  const channel = await db.channel.findUnique({ where: { id: channelId }, select: { id: true, studentId: true } });
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  // students can only reply on their own channel
  if (!isMentorOrAdmin && channel.studentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (isReply) {
    const parent = await db.comment.findUnique({ where: { id: parentId }, select: { id: true, channelId: true, parentId: true } });
    if (!parent) return NextResponse.json({ error: "Comentário pai não encontrado" }, { status: 404 });
    if (parent.channelId !== channelId) return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
    // no nested replies — only one level deep
    if (parent.parentId) return NextResponse.json({ error: "Respostas aninhadas não permitidas" }, { status: 400 });
  }

  const comment = await db.comment.create({
    data: {
      channelId,
      videoId: videoId ?? null,
      type: isReply ? "RESPOSTA" : type,
      content: content.trim(),
      authorId: user.id,
      parentId: parentId ?? null,
    },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      video: { select: { id: true, title: true } },
    },
  });

  // notify the student when mentor leaves top-level feedback
  if (!isReply && channel.studentId !== user.id) {
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
