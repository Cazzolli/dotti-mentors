import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isMentorOrAdmin(role: string) {
  return role === "ADMIN" || role === "MENTOR";
}

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !isMentorOrAdmin(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      blocked: true,
      channels: {
        select: { id: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(students);
}
