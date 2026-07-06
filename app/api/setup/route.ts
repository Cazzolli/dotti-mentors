import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== process.env.SETUP_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) {
    return NextResponse.json({ message: "Admin already exists", email: existing.email });
  }

  const passwordHash = await bcrypt.hash("admin123", 12);
  const user = await db.user.create({
    data: {
      email: "victorkalamith@gmail.com",
      name: "Victor",
      passwordHash,
      role: "ADMIN",
    },
  });

  return NextResponse.json({ ok: true, email: user.email, password: "admin123" });
}
