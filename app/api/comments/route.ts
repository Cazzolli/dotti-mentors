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

  const authorSelect = { author: { select: { id: true, name: true, role: true, avatarUrl: true } } };

  const comments = await db.comment.findMany({
    where,
    include: {
      ...authorSelect,
      video: { select: { id: true, title: true } },
      replies: {
        include: authorSelect,
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
  const isMentorOrAdmin = user.role === "ADMIN" || user.role === "MENTOR";
  const isReply = !!parentId;

  if (!channelId || !content?.trim() || (!isReply && !type)) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const channel = await db.channel.findUnique({ where: { id: channelId }, select: { id: true, studentId: true } });
  if (!channel) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  // only the channel's own student, or a mentor/admin, may participate
  if (!isMentorOrAdmin && channel.studentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // top-level feedback can only be created by a mentor/admin
  if (!isReply && !isMentorOrAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // validate content length
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "Conteúdo muito longo" }, { status: 400 });
  }

  let parent = null;
  if (isReply) {
    parent = await db.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.channelId !== channelId) {
      return NextResponse.json({ error: "Comentário original não encontrado" }, { status: 404 });
    }
    if (parent.parentId) {
      return NextResponse.json({ error: "Não é possível responder uma resposta" }, { status: 400 });
    }
  }

  const comment = await db.comment.create({
    data: {
      channelId,
      videoId: videoId ?? null,
      type: isReply ? "RESPOSTA" : type,
      content: content.trim(),
      authorId: user.id,
      parentId: isReply ? parentId : null,
    },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      video: { select: { id: true, title: true } },
    },
  });

  // notify: on a reply, notify the original comment's author; on top-level feedback, notify the student
  const notifyUserId = isReply ? parent!.authorId : channel.studentId;
  if (notifyUserId !== user.id) {
    const existing = await db.notification.findFirst({
      where: { userId: notifyUserId, commentId: comment.id },
    });
    if (!existing) {
      await db.notification.create({
        data: { userId: notifyUserId, type: "FEEDBACK", commentId: comment.id },
      });
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
