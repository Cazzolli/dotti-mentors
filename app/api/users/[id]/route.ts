import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;

  if (user.id !== id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbUser = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true, blocked: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(dbUser);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;
  const { name, email, avatarUrl, currentPassword, newPassword, blocked, firstClassDate } = await req.json();

  // block/unblock — ADMIN only, can target other users
  if (blocked !== undefined) {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.id === id) return NextResponse.json({ error: "Não é possível bloquear sua própria conta" }, { status: 400 });
    const updated = await db.user.update({
      where: { id },
      data: { blocked: Boolean(blocked) },
      select: { id: true, blocked: true },
    });
    return NextResponse.json(updated);
  }

  // admin editing another user's profile (name, email, password) — no current password needed
  if (user.role === "ADMIN" && user.id !== id) {
    const target = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if (target.role === "ADMIN") return NextResponse.json({ error: "Não é possível editar outro administrador" }, { status: 403 });

    const data: any = {};
    if (name?.trim()) data.name = name.trim();
    if (email?.trim()) {
      const exists = await db.user.findFirst({ where: { email: email.trim(), NOT: { id } } });
      if (exists) return NextResponse.json({ error: "E-mail já está em uso" }, { status: 409 });
      data.email = email.trim();
    }
    if (newPassword) {
      if (newPassword.length < 6 || newPassword.length > 128)
        return NextResponse.json({ error: "Senha deve ter entre 6 e 128 caracteres" }, { status: 400 });
      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }
    if (firstClassDate !== undefined) {
      data.firstClassDate = firstClassDate ? new Date(firstClassDate) : null;
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, avatarUrl: true, role: true, firstClassDate: true },
    });
    return NextResponse.json(updated);
  }

  // all other operations — only the user themselves
  if (user.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Senha atual obrigatória" }, { status: 400 });
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      return NextResponse.json({ error: "Nova senha deve ter entre 6 e 128 caracteres" }, { status: 400 });
    }
    const dbUser = await db.user.findUnique({ where: { id }, select: { passwordHash: true } });
    if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  }

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (user.id === id) {
    return NextResponse.json({ error: "Não é possível remover sua própria conta" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Não é possível remover outro administrador" }, { status: 403 });
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
