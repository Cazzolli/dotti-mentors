import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchChannelInfo } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const user = session.user as any;

  const isMentorOrAdmin = user.role === "ADMIN" || user.role === "MENTOR";

  // students must not request data for other students
  if (!isMentorOrAdmin && studentId && studentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const where =
    isMentorOrAdmin
      ? studentId ? { studentId } : {}
      : { studentId: user.id };

  const channels = await db.channel.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true } },
      _count: { select: { videos: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { input } = await req.json();
  if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

  const user = session.user as any;

  try {
    const info = await fetchChannelInfo(input.trim());

    const existing = await db.channel.findUnique({
      where: { youtubeChannelId: info.youtubeChannelId },
    });
    if (existing) {
      return NextResponse.json({ error: "Canal já cadastrado" }, { status: 409 });
    }

    const channel = await db.channel.create({
      data: { ...info, studentId: user.id },
    });

    // notify all admins about the new channel
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((a) => ({ userId: a.id, type: "NEW_CHANNEL", channelId: channel.id })),
      });
    }

    return NextResponse.json(channel, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro ao buscar canal" }, { status: 400 });
  }
}
