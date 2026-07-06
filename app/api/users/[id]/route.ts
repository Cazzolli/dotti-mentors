import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;

  // only the user themselves can edit their own profile
  if (user.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, avatarUrl, currentPassword, newPassword } = await req.json();

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

// ADMIN only: delete a student or mentor
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // cannot delete yourself
  if (user.id === id) {
    return NextResponse.json({ error: "Não é possível remover sua própria conta" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // only ADMIN can delete other ADMINs (and only if there's more than one)
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Não é possível remover outro administrador" }, { status: 403 });
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
