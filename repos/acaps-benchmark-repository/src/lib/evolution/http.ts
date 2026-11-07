import { NextResponse } from "next/server";
import { currentExpert } from "@/lib/session";
import type { Expert } from "@/lib/world";
import { EvolutionError } from "./service";

/** Runs a staff handler as the current persona and maps EvolutionError to a JSON error response. */
export async function staff(fn: (me: Expert | null) => Promise<unknown>) {
  try {
    const { me } = await currentExpert();
    return NextResponse.json({ ok: true, data: await fn(me) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof EvolutionError) {
      return NextResponse.json({ ok: false, error: e.message, details: e.details ?? null }, { status: e.status });
    }
    console.error("staff evolution error", e);
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}

export async function bodyOf(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
