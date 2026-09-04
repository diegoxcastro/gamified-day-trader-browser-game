import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, missionProgress, daySessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim().slice(0, 24);
  if (name.length < 2) {
    return NextResponse.json({ error: "Nome deve ter ao menos 2 caracteres" }, { status: 400 });
  }

  let [player] = await db.select().from(players).where(eq(players.name, name));
  if (!player) {
    [player] = await db.insert(players).values({ name }).returning();
  }

  const missions = await db
    .select()
    .from(missionProgress)
    .where(eq(missionProgress.playerId, player.id));

  const sessions = await db
    .select()
    .from(daySessions)
    .where(eq(daySessions.playerId, player.id))
    .orderBy(desc(daySessions.day))
    .limit(10);

  return NextResponse.json({ player, missions, sessions });
}
