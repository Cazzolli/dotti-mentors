import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isMentorOrAdmin(role: string) {
  return role === "ADMIN" || role === "MENTOR";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const channel = await db.channel.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      _count: { select: { videos: true, comments: true } },
    },
  });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = session.user as any;
  if (!isMentorOrAdmin(user.role) && channel.studentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json(channel);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const channel = await db.channel.findUnique({ where: { id } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = session.user as any;
  if (!isMentorOrAdmin(user.role) && channel.studentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { channelIdea } = await req.json();
  const updated = await db.channel.update({
    where: { id },
    data: { channelIdea: channelIdea ?? null },
  });

  return NextResponse.json({ channelIdea: updated.channelIdea });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const channel = await db.channel.findUnique({ where: { id } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = session.user as any;
  // only ADMIN can delete channels
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.channel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
