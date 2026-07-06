import { NextResponse } from "next/server";

// Setup completed — endpoint disabled
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
