import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHOP_MAP } from "@/lib/game/shop";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext<"/api/player/[id]/shop">) {
  const { id } = await ctx.params;
  const playerId = Number(id);
  const body = (await req.json().catch(() => ({}))) as { itemId?: string };
  const item = body.itemId ? SHOP_MAP[body.itemId] : undefined;
  if (!item) return NextResponse.json({ error: "Item inválido" }, { status: 400 });

  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  if (!player) return NextResponse.json({ error: "Jogador não encontrado" }, { status: 404 });

  if (player.coins < item.price) {
    return NextResponse.json({ error: "Moedas insuficientes" }, { status: 400 });
  }
  if (!item.consumable && player.ownedItems.includes(item.id)) {
    return NextResponse.json({ error: "Você já possui este item" }, { status: 400 });
  }
  if (item.requires && !player.ownedItems.includes(item.requires)) {
    return NextResponse.json({ error: "Requer outro item primeiro" }, { status: 400 });
  }
  if (item.minLevel && player.level < item.minLevel) {
    return NextResponse.json({ error: `Requer nível ${item.minLevel}` }, { status: 400 });
  }

  const owned = item.consumable ? player.ownedItems : [...player.ownedItems, item.id];
  let balance = player.balance;
  let maxLeverage = player.maxLeverage;
  let feeRate = player.feeRate;
  if (item.id === "capital_5k") balance += 5000;
  if (item.id === "lev_5") maxLeverage = Math.max(maxLeverage, 5);
  if (item.id === "lev_10") maxLeverage = Math.max(maxLeverage, 10);
  if (item.id === "fee_discount") feeRate = 0.0002;

  const stats = { ...player.stats, itemsBought: (player.stats.itemsBought ?? 0) + 1 };

  const [updated] = await db.transaction(async (tx) => {
    await tx.insert(purchases).values({ playerId, itemId: item.id, price: item.price });
    return tx
      .update(players)
      .set({
        coins: player.coins - item.price,
        ownedItems: owned,
        balance,
        maxLeverage,
        feeRate,
        stats,
        updatedAt: new Date(),
      })
      .where(eq(players.id, playerId))
      .returning();
  });

  return NextResponse.json({ player: updated });
}
