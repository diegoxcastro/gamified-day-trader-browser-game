import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    balance: doublePrecision("balance").notNull().default(10000),
    coins: integer("coins").notNull().default(50),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    day: integer("day").notNull().default(1),
    maxLeverage: integer("max_leverage").notNull().default(2),
    feeRate: doublePrecision("fee_rate").notNull().default(0.0005),
    ownedItems: jsonb("owned_items").$type<string[]>().notNull().default([]),
    unlockedAssets: jsonb("unlocked_assets")
      .$type<string[]>()
      .notNull()
      .default(["PETR4", "VALE3"]),
    stats: jsonb("stats")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    bestDayPnl: doublePrecision("best_day_pnl").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("players_name_idx").on(t.name)],
);

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .references(() => players.id, { onDelete: "cascade" })
    .notNull(),
  day: integer("day").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // long | short
  qty: integer("qty").notNull(),
  leverage: integer("leverage").notNull().default(1),
  entryPrice: doublePrecision("entry_price").notNull(),
  exitPrice: doublePrecision("exit_price").notNull(),
  pnl: doublePrecision("pnl").notNull(),
  fees: doublePrecision("fees").notNull().default(0),
  reason: text("reason").notNull(), // manual | stop | take | eod
  hadStop: boolean("had_stop").notNull().default(false),
  hadTake: boolean("had_take").notNull().default(false),
  durationSec: integer("duration_sec").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const missionProgress = pgTable(
  "mission_progress",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .references(() => players.id, { onDelete: "cascade" })
      .notNull(),
    missionId: text("mission_id").notNull(),
    progress: integer("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    claimed: boolean("claimed").notNull().default(false),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("mission_player_idx").on(t.playerId, t.missionId)],
);

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .references(() => players.id, { onDelete: "cascade" })
    .notNull(),
  itemId: text("item_id").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const daySessions = pgTable("day_sessions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .references(() => players.id, { onDelete: "cascade" })
    .notNull(),
  day: integer("day").notNull(),
  pnl: doublePrecision("pnl").notNull(),
  tradesCount: integer("trades_count").notNull(),
  wins: integer("wins").notNull(),
  xpEarned: integer("xp_earned").notNull(),
  coinsEarned: integer("coins_earned").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type MissionProgressRow = typeof missionProgress.$inferSelect;
