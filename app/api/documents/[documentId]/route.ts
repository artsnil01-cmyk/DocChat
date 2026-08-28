import { NextResponse } from "next/server";

export async function DELETE() {
  return NextResponse.json(
    { error: "Document deletion is not implemented yet." },
    { status: 501 },
  );
}
