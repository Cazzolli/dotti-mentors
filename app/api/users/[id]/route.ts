import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;

  // only the user themselves can edit their own profile
  if (user.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, avatarUrl } = await req.json();

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true },
  });

  return NextResponse.json(updated);
}
