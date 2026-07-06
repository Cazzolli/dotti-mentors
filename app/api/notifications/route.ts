import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/notifications — list for current user
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      comment: {
        select: {
          type: true,
          channelId: true,
          videoId: true,
          channel: { select: { id: true, name: true, handle: true } },
          video: { select: { id: true, title: true } },
          author: { select: { name: true } },
        },
      },
      channel: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarUrl: true,
          student: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json(notifications);
}

// PATCH /api/notifications  body: { ids?: string[], all?: boolean, channelId?: string, videoId?: string }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  if (body.all) {
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.ids?.length) {
    await db.notification.updateMany({
      where: { userId: user.id, id: { in: body.ids } },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  // mark-read by channelId + optional videoId (for video badge compatibility)
  if (body.channelId) {
    const commentWhere: any = { channelId: body.channelId };
    if ("videoId" in body) commentWhere.videoId = body.videoId ?? null;

    await db.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
        OR: [
          { type: "FEEDBACK", comment: commentWhere },
          ...(body.videoId === undefined ? [{ type: "NEW_CHANNEL", channelId: body.channelId }] : []),
        ],
      },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
