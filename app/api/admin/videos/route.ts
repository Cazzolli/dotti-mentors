import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ADMIN" && role !== "MENTOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? "recent";
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const search = searchParams.get("search") ?? "";
  const studentName = searchParams.get("studentName") ?? "";
  const minSubscribers = parseInt(searchParams.get("minSubscribers") ?? "0");

  const where: any = {};

  if (period !== "all") {
    const days: Record<string, number> = { "1d": 1, "3d": 3, "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const d = days[period];
    if (d) where.publishedAt = { gte: new Date(Date.now() - d * 24 * 60 * 60 * 1000) };
  }

  if (search) where.title = { contains: search, mode: "insensitive" };

  const channelWhere: any = {};
  if (studentName) channelWhere.student = { name: { contains: studentName, mode: "insensitive" } };
  if (minSubscribers > 0) channelWhere.subscriberCount = { gte: minSubscribers };
  if (Object.keys(channelWhere).length > 0) where.channel = channelWhere;

  const orderBy: any =
    sortBy === "oldest" ? { publishedAt: "asc" }
    : sortBy === "views" ? { views: "desc" }
    : { publishedAt: "desc" };

  const [total, items] = await Promise.all([
    db.video.count({ where }),
    db.video.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true,
            student: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ total, items });
}
