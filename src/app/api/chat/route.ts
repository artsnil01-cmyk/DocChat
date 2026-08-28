import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Chat streaming is not implemented yet." },
    { status: 501 },
  );
}
