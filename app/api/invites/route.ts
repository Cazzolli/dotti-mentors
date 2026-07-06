import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invites = await db.invite.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role = "STUDENT" } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const invite = await db.invite.create({
    data: {
      email,
      expiresAt,
      createdById: (session.user as any).id,
    },
  });

  const link = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/convite/${invite.token}`;
  return NextResponse.json({ ...invite, link });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  await db.invite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
