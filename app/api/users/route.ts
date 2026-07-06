import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await db.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { channels: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? "victorkalamith@gmail.com";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!session || user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user?.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: "Apenas o administrador principal pode criar usuários" }, { status: 403 });
  }

  const { name, email, password, role } = await req.json();
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = await db.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: role === "ADMIN" ? "ADMIN" : "STUDENT",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(newUser, { status: 201 });
}
