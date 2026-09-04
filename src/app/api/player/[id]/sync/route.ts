import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, trades, missionProgress } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface SyncBody {
  player?: {
    balance?: number;
    coins?: number;
    xp?: number;
    level?: number;
    day?: number;
    stats?: Record<string, number>;
    bestDayPnl?: number;
    unlockedAssets?: string[];
  };
  trades?: {
    day: number;
    symbol: string;
    side: string;
    qty: number;
    leverage: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    fees: number;
    reason: string;
    hadStop: boolean;
    hadTake: boolean;
    durationSec: number;
  }[];
  missions?: { missionId: string; progress: number; completed: boolean; claimed: boolean }[];
}

export async function POST(req: Request, ctx: RouteContext<"/api/player/[id]/sync">) {
  const { id } = await ctx.params;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as SyncBody;

  await db.transaction(async (tx) => {
    if (body.player) {
      const p = body.player;
      await tx
        .update(players)
        .set({
          ...(p.balance !== undefined ? { balance: p.balance } : {}),
          ...(p.coins !== undefined ? { coins: p.coins } : {}),
          ...(p.xp !== undefined ? { xp: p.xp } : {}),
          ...(p.level !== undefined ? { level: p.level } : {}),
          ...(p.day !== undefined ? { day: p.day } : {}),
          ...(p.stats !== undefined ? { stats: p.stats } : {}),
          ...(p.bestDayPnl !== undefined ? { bestDayPnl: p.bestDayPnl } : {}),
          ...(p.unlockedAssets !== undefined ? { unlockedAssets: p.unlockedAssets } : {}),
          updatedAt: new Date(),
        })
        .where(eq(players.id, playerId));
    }

    if (body.trades && body.trades.length > 0) {
      await tx.insert(trades).values(body.trades.map((t) => ({ ...t, playerId })));
    }

    if (body.missions && body.missions.length > 0) {
      for (const m of body.missions) {
        await tx
          .insert(missionProgress)
          .values({ playerId, ...m, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: [missionProgress.playerId, missionProgress.missionId],
            set: {
              progress: m.progress,
              completed: m.completed,
              claimed: m.claimed,
              updatedAt: sql`now()`,
            },
          });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
