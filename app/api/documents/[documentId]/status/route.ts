import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Document status polling is not implemented yet." },
    { status: 501 },
  );
}
