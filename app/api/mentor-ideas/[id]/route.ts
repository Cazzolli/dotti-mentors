import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const authorSelect = { id: true, name: true, role: true, avatarUrl: true };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const { content } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });
  if (content.trim().length > 5000) return NextResponse.json({ error: "Conteúdo muito longo" }, { status: 400 });

  const idea = await db.mentorIdea.findUnique({ where: { id } });
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (idea.authorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await db.mentorIdea.update({
    where: { id },
    data: { content: content.trim() },
    include: { author: { select: authorSelect } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;

  const idea = await db.mentorIdea.findUnique({ where: { id } });
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (idea.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.mentorIdea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
