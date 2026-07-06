import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncChannel } from "@/app/api/sync/route";

// Called by Vercel Cron (configured in vercel.json)
// Authorization header must match CRON_SECRET env var
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await db.channel.findMany({
    select: { id: true, name: true, lastSync: true },
    orderBy: { lastSync: "asc" }, // sync least-recently-synced first
  });

  const results: { channelId: string; name: string; ok: boolean; error?: string }[] = [];

  for (const channel of channels) {
    try {
      const res = await syncChannel(channel.id);
      const data = await res.json();
      results.push({ channelId: channel.id, name: channel.name, ok: data.ok ?? true });
    } catch (e: any) {
      results.push({ channelId: channel.id, name: channel.name, ok: false, error: e.message });
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  return NextResponse.json({ synced: results.length - failed, failed, results });
}
