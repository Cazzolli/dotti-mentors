import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;

  const video = await db.video.findUnique({
    where: { id },
    include: { channel: { select: { studentId: true } } },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (video.channel.studentId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { videoIdea, videoLinks } = await req.json();
  if (typeof videoIdea === "string" && videoIdea.length > 2000) {
    return NextResponse.json({ error: "videoIdea too long" }, { status: 400 });
  }
  const updated = await db.video.update({
    where: { id },
    data: {
      videoIdea: videoIdea?.trim() || null,
      videoLinks: Array.isArray(videoLinks) && videoLinks.length > 0
        ? JSON.stringify(videoLinks.filter(Boolean))
        : null,
    },
  });

  return NextResponse.json(updated);
}
