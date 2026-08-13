import { NextResponse } from "next/server";
import { getAdvisoryHistory } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const history = await getAdvisoryHistory(200);
  return NextResponse.json({ ok: true, history });
}
