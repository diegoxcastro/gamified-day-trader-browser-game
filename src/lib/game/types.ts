export type Side = "long" | "short";

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetDef {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number; // per-candle stddev (fraction)
  tickSize: number;
  lotSize: number;
  unlockLevel: number;
  category: "acoes" | "cripto" | "futuros" | "forex";
  description: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: Side;
  qty: number;
  leverage: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: number; // unix seconds (sim time)
  marginUsed: number;
  fees: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: Side;
  qty: number;
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  fees: number;
  reason: "manual" | "stop" | "take" | "eod" | "liquidation";
  hadStop: boolean;
  hadTake: boolean;
  durationSec: number;
  day: number;
}

export interface NewsEvent {
  id: string;
  time: number;
  symbol: string | "ALL";
  headline: string;
  impact: number; // signed fraction, e.g. +0.02
  sentiment: "bull" | "bear" | "neutral";
  isHint?: boolean;
}

export interface PlayerState {
  id: number;
  name: string;
  balance: number;
  coins: number;
  xp: number;
  level: number;
  day: number;
  maxLeverage: number;
  feeRate: number;
  ownedItems: string[];
  unlockedAssets: string[];
  stats: Record<string, number>;
  bestDayPnl: number;
}

export interface MissionState {
  missionId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface DayStats {
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  stopsHit: number;
  takesHit: number;
  tradesWithStop: number;
  maxDrawdown: number;
  peakEquity: number;
  startBalance: number;
  streak: number;
  bestStreak: number;
  shortsWon: number;
  fastWins: number;
  symbolsTraded: string[];
  leveragedWins: number;
  newsTrades: number;
}
