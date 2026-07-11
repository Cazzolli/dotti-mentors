import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;
  const { content } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });
  if (content.trim().length > 5000) return NextResponse.json({ error: "Conteúdo muito longo" }, { status: 400 });

  const comment = await db.comment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorId !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const updated = await db.comment.update({
    where: { id },
    data: { content: content.trim() },
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      video: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const comment = await db.comment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && comment.authorId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await db.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
