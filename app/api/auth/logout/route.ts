import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Logout endpoint is not implemented yet." },
    { status: 501 },
  );
}
