import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, daySessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ASSETS } from "@/lib/game/assets";

export const dynamic = "force-dynamic";

interface EndDayBody {
  day: number;
  pnl: number;
  tradesCount: number;
  wins: number;
  xpEarned: number;
  coinsEarned: number;
  balance: number;
  xp: number;
  level: number;
  coins: number;
  stats: Record<string, number>;
}

export async function POST(req: Request, ctx: RouteContext<"/api/player/[id]/end-day">) {
  const { id } = await ctx.params;
  const playerId = Number(id);
  const b = (await req.json()) as EndDayBody;

  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  if (!player) return NextResponse.json({ error: "Jogador não encontrado" }, { status: 404 });

  const unlocked = ASSETS.filter((a) => a.unlockLevel <= b.level).map((a) => a.symbol);

  const [updated] = await db.transaction(async (tx) => {
    await tx.insert(daySessions).values({
      playerId,
      day: b.day,
      pnl: b.pnl,
      tradesCount: b.tradesCount,
      wins: b.wins,
      xpEarned: b.xpEarned,
      coinsEarned: b.coinsEarned,
    });
    return tx
      .update(players)
      .set({
        day: b.day + 1,
        balance: b.balance,
        xp: b.xp,
        level: b.level,
        coins: b.coins,
        stats: b.stats,
        bestDayPnl: Math.max(player.bestDayPnl, b.pnl),
        unlockedAssets: Array.from(new Set([...player.unlockedAssets, ...unlocked])),
        updatedAt: new Date(),
      })
      .where(eq(players.id, playerId))
      .returning();
  });

  return NextResponse.json({ player: updated });
}
