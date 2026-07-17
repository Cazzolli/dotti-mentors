import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "MENTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const mentorName = searchParams.get("mentorName") ?? "";
  const type = searchParams.get("type") ?? "";
  const period = searchParams.get("period") ?? "all";
  const studentName = searchParams.get("studentName") ?? "";
  const scope = searchParams.get("scope") ?? "all"; // "channel" | "video" | "all"

  const where: any = { type: { not: "RESPOSTA" } };

  if (period !== "all") {
    const days: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const d = days[period];
    if (d) where.createdAt = { gte: new Date(Date.now() - d * 24 * 60 * 60 * 1000) };
  }

  if (type && type !== "RESPOSTA") where.type = type;
  if (scope === "channel") where.videoId = null;
  if (scope === "video") where.videoId = { not: null };

  if (mentorName) {
    where.author = { name: { contains: mentorName, mode: "insensitive" } };
  }

  if (studentName) {
    where.channel = { student: { name: { contains: studentName, mode: "insensitive" } } };
  }

  const comments = await db.comment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      channel: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarUrl: true,
          channelIdea: true,
          student: { select: { id: true, name: true } },
        },
      },
      video: { select: { id: true, title: true, youtubeVideoId: true, thumbnailUrl: true } },
    },
  });

  return NextResponse.json(comments);
}
