import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json();
  if (!token || !name || !password) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 128) {
    return NextResponse.json({ error: "Senha deve ter entre 6 e 128 caracteres" }, { status: 400 });
  }
  if (typeof token !== "string" || token.length > 200) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: invite.email } });
  if (existing) {
    return NextResponse.json({ error: "Usuário já cadastrado" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email: invite.email, name, passwordHash, role: "STUDENT" },
  });

  await db.invite.update({ where: { id: invite.id }, data: { used: true } });

  return NextResponse.json({ ok: true, email: user.email });
}
