import { NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      balance: players.balance,
      level: players.level,
      day: players.day,
      xp: players.xp,
      bestDayPnl: players.bestDayPnl,
    })
    .from(players)
    .orderBy(desc(players.balance))
    .limit(10);
  return NextResponse.json({ leaderboard: rows });
}
