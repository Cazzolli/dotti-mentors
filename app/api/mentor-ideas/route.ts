import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const authorSelect = { id: true, name: true, role: true, avatarUrl: true };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const isMentorOrAdmin = user.role === "ADMIN" || user.role === "MENTOR";

  // student can only see their own ideas
  if (!isMentorOrAdmin && user.id !== studentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ideas = await db.mentorIdea.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: authorSelect } },
  });

  return NextResponse.json(ideas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "MENTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content, studentId } = await req.json();
  if (!content?.trim() || !studentId) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "Conteúdo muito longo" }, { status: 400 });
  }

  const student = await db.user.findUnique({ where: { id: studentId }, select: { id: true, role: true } });
  if (!student || student.role !== "STUDENT") {
    return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  }

  const idea = await db.mentorIdea.create({
    data: { content: content.trim(), authorId: user.id, studentId },
    include: { author: { select: authorSelect } },
  });

  // notify the student
  await db.notification.create({
    data: { userId: studentId, type: "MENTOR_IDEA", mentorIdeaId: idea.id },
  });

  return NextResponse.json(idea, { status: 201 });
}
