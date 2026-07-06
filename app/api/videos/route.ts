import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  const isShort = searchParams.get("isShort");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") ?? "publishedAt";
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  // verify access
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "MENTOR" && channel.studentId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const where: any = { channelId };
  if (isShort === "true") where.isShort = true;
  if (isShort === "false") where.isShort = false;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const orderBy: any =
    sortBy === "views" ? { views: "desc" }
    : sortBy === "publishedAt_asc" ? { publishedAt: "asc" }
    : { publishedAt: "desc" };

  const [total, items] = await Promise.all([
    db.video.count({ where }),
    db.video.findMany({ where, orderBy, skip: offset, take: limit }),
  ]);

  return NextResponse.json({ total, items });
}
