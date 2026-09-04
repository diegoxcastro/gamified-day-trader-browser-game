"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarketEngine, TICK_MS, CANDLES_PER_DAY } from "./market";
import { ASSETS, ASSET_MAP, notional, pointValue, intradayFactor } from "./assets";
import { MISSIONS, MISSION_MAP, emptyDayStats, levelFromXp } from "./missions";
import { SHOP_MAP } from "./shop";
import type {
  Candle,
  ClosedTrade,
  DayStats,
  MissionState,
  NewsEvent,
  PlayerState,
  Position,
  Side,
} from "./types";
import type { ChartMarker } from "@/components/game/TradingChart";

export interface Toast {
  id: string;
  kind: "success" | "error" | "info" | "reward" | "levelup";
  title: string;
  body?: string;
}

export interface DaySummary {
  day: number;
  pnl: number;
  trades: number;
  wins: number;
  xpEarned: number;
  coinsEarned: number;
  grade: string;
  bestTrade: number;
  worstTrade: number;
  levelUp: boolean;
}

export interface OrderInput {
  side: Side;
  qty: number;
  leverage: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

interface DbMission {
  missionId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useGame(initialPlayer: PlayerState, initialMissions: DbMission[]) {
  const engineRef = useRef<MarketEngine | null>(null);
  if (!engineRef.current) engineRef.current = new MarketEngine(initialPlayer.day);

  const [player, setPlayer] = useState<PlayerState>(initialPlayer);
  const playerRef = useRef(player);
  playerRef.current = player;

  const [missions, setMissions] = useState<Record<string, MissionState>>(() => {
    const m: Record<string, MissionState> = {};
    for (const def of MISSIONS) {
      const row = initialMissions.find((r) => r.missionId === def.id);
      m[def.id] = row
        ? { missionId: def.id, progress: row.progress, completed: row.completed, claimed: row.claimed }
        : { missionId: def.id, progress: 0, completed: false, claimed: false };
    }
    return m;
  });
  const missionsRef = useRef(missions);
  missionsRef.current = missions;

  const [symbol, setSymbol] = useState<string>(
    ASSETS.find((a) => a.unlockLevel <= initialPlayer.level)?.symbol ?? "PETR4",
  );
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  const [positions, setPositions] = useState<Position[]>([]);
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [dayStats, setDayStats] = useState<DayStats>(() => emptyDayStats(initialPlayer.balance));
  const dayStatsRef = useRef(dayStats);
  dayStatsRef.current = dayStats;

  const [candles, setCandles] = useState<Candle[]>(() => engineRef.current!.snapshot(symbol).candles);
  const [prices, setPrices] = useState<Record<string, number>>(() => engineRef.current!.lastPrices());
  const [dayOpens] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    for (const a of ASSETS) o[a.symbol] = engineRef.current!.snapshot(a.symbol).dayOpen;
    return o;
  });
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [hints, setHints] = useState<NewsEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [simTime, setSimTime] = useState(engineRef.current.time);
  const [dayStartTime] = useState(engineRef.current.time);
  const [paused, setPaused] = useState(false);
  const [pausesLeft, setPausesLeft] = useState(3);
  const [dayOver, setDayOver] = useState(false);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [markers, setMarkers] = useState<ChartMarker[]>([]);
  const [book, setBook] = useState<{ bids: [number, number][]; asks: [number, number][] }>({ bids: [], asks: [] });
  const [tutorialSeen, setTutorialSeen] = useState(initialPlayer.day > 1 || (initialPlayer.stats.totalTrades ?? 0) > 0);

  const insuranceUsedRef = useRef(false);
  const lastNewsTimeRef = useRef<Record<string, number>>({});
  const pendingTradesRef = useRef<ClosedTrade[]>([]);
  const dayTradesRef = useRef<ClosedTrade[]>([]);
  const finishedRef = useRef(false);
  const dirtyRef = useRef(false);
  const dayStartBalanceRef = useRef(initialPlayer.balance);
  const dayXpRef = useRef(0);
  const dayCoinsRef = useRef(0);

  const owned = useCallback((id: string) => playerRef.current.ownedItems.includes(id), []);

  // ------- toasts -------
  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = uid();
    setToasts((prev) => [...prev, { ...t, id }].slice(-4));
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.kind === "levelup" ? 6000 : 3800);
  }, []);

  // ------- sync to server -------
  const flushSync = useCallback(async (missionsOverride?: MissionState[]) => {
    const p = playerRef.current;
    const tradesToSend = pendingTradesRef.current.splice(0);
    const ms = missionsOverride ?? Object.values(missionsRef.current);
    if (!dirtyRef.current && tradesToSend.length === 0 && !missionsOverride) return;
    dirtyRef.current = false;
    try {
      await fetch(`/api/player/${p.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: { balance: p.balance, coins: p.coins, xp: p.xp, level: p.level, stats: p.stats },
          trades: tradesToSend.map((t) => ({
            day: t.day,
            symbol: t.symbol,
            side: t.side,
            qty: t.qty,
            leverage: t.leverage,
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            pnl: t.pnl,
            fees: t.fees,
            reason: t.reason,
            hadStop: t.hadStop,
            hadTake: t.hadTake,
            durationSec: t.durationSec,
          })),
          missions: ms,
        }),
      });
    } catch {
      // will retry on next flush
      dirtyRef.current = true;
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(() => void flushSync(), 6000);
    return () => clearInterval(iv);
  }, [flushSync]);

  // ------- missions evaluation -------
  const evaluateMissions = useCallback((ds: DayStats, career: Record<string, number>) => {
    const prev = missionsRef.current;
    const next = { ...prev };
    let changed = false;
    const justCompleted: string[] = [];
    for (const def of MISSIONS) {
      const cur = prev[def.id];
      if (cur.claimed) continue;
      const val = Math.min(def.target, Math.floor(def.metric(ds, career)));
      const completed = cur.completed || val >= def.target;
      if (val !== cur.progress || completed !== cur.completed) {
        next[def.id] = { ...cur, progress: Math.max(completed ? def.target : val, 0), completed };
        changed = true;
        if (completed && !cur.completed) justCompleted.push(def.title);
      }
    }
    if (!changed) return;
    missionsRef.current = next;
    setMissions(next);
    dirtyRef.current = true;
    for (const title of justCompleted) {
      pushToast({ kind: "reward", title: `Missão concluída: ${title}`, body: "Resgate a recompensa no painel de missões." });
    }
  }, [pushToast]);

  const claimMission = useCallback(
    (missionId: string) => {
      const def = MISSION_MAP[missionId];
      const st = missionsRef.current[missionId];
      if (!def || !st || !st.completed || st.claimed) return;
      const p = playerRef.current;
      const newXp = p.xp + def.rewardXp;
      const lv = levelFromXp(newXp);
      const leveledUp = lv.level > p.level;
      const updated: PlayerState = { ...p, xp: newXp, coins: p.coins + def.rewardCoins, level: lv.level };
      dayXpRef.current += def.rewardXp;
      dayCoinsRef.current += def.rewardCoins;
      setPlayer(updated);
      playerRef.current = updated;
      const nextMissions = { ...missionsRef.current, [missionId]: { ...st, claimed: true } };
      setMissions(nextMissions);
      missionsRef.current = nextMissions;
      dirtyRef.current = true;
      pushToast({ kind: "reward", title: `+${def.rewardXp} XP · +${def.rewardCoins} moedas`, body: def.title });
      if (leveledUp) {
        const unlocked = ASSETS.filter((a) => a.unlockLevel === lv.level).map((a) => a.symbol);
        pushToast({
          kind: "levelup",
          title: `Nível ${lv.level} alcançado!`,
          body: unlocked.length ? `Novo ativo desbloqueado: ${unlocked.join(", ")}` : "Continue evoluindo!",
        });
      }
      void flushSync(Object.values(nextMissions));
    },
    [flushSync, pushToast],
  );

  // ------- trading -------
  const equity = useMemo(() => {
    let unreal = 0;
    for (const p of positions) {
      const px = prices[p.symbol] ?? p.entryPrice;
      const diff = p.side === "long" ? px - p.entryPrice : p.entryPrice - px;
      unreal += diff * p.qty * pointValue(p.symbol);
    }
    return player.balance + unreal;
  }, [positions, prices, player.balance]);

  const marginUsed = useMemo(() => positions.reduce((s, p) => s + p.marginUsed, 0), [positions]);
  const available = player.balance - marginUsed;

  const unrealizedFor = useCallback(
    (p: Position, px: number) => {
      const diff = p.side === "long" ? px - p.entryPrice : p.entryPrice - px;
      return diff * p.qty * pointValue(p.symbol);
    },
    [],
  );

  const closePositionInternal = useCallback(
    (p: Position, exitPrice: number, reason: ClosedTrade["reason"], now: number) => {
      const pl = playerRef.current;
      const closeFee = notional(p.symbol, p.qty, exitPrice) * pl.feeRate;
      let pnl = unrealizedFor(p, exitPrice) - closeFee - p.fees;
      let insured = false;
      if (reason === "stop" && pnl < 0 && owned("insurance") && !insuranceUsedRef.current) {
        insuranceUsedRef.current = true;
        pnl = pnl * 0.5;
        insured = true;
      }
      if (reason === "liquidation") pnl = Math.max(pnl, -p.marginUsed);

      const trade: ClosedTrade = {
        id: uid(),
        symbol: p.symbol,
        side: p.side,
        qty: p.qty,
        leverage: p.leverage,
        entryPrice: p.entryPrice,
        exitPrice,
        pnl,
        fees: closeFee + p.fees,
        reason,
        hadStop: p.stopLoss !== null,
        hadTake: p.takeProfit !== null,
        durationSec: now - p.openedAt,
        day: pl.day,
      };

      const newBalance = pl.balance + pnl;
      const isWin = pnl > 0;
      const ds = dayStatsRef.current;
      const streak = isWin ? ds.streak + 1 : 0;
      const newsT = lastNewsTimeRef.current[p.symbol] ?? lastNewsTimeRef.current.ALL ?? -Infinity;
      const openedNearNews = Math.abs(p.openedAt - newsT) <= 60 || (p.openedAt >= newsT && p.openedAt - newsT <= 60);
      const nextDs: DayStats = {
        ...ds,
        pnl: ds.pnl + pnl,
        trades: ds.trades + 1,
        wins: ds.wins + (isWin ? 1 : 0),
        losses: ds.losses + (isWin ? 0 : 1),
        stopsHit: ds.stopsHit + (reason === "stop" ? 1 : 0),
        takesHit: ds.takesHit + (reason === "take" ? 1 : 0),
        streak,
        bestStreak: Math.max(ds.bestStreak, streak),
        shortsWon: ds.shortsWon + (isWin && p.side === "short" ? 1 : 0),
        fastWins: ds.fastWins + (isWin && trade.durationSec < 180 ? 1 : 0),
        leveragedWins: ds.leveragedWins + (isWin && p.leverage >= 5 ? 1 : 0),
        newsTrades: ds.newsTrades + (isWin && openedNearNews ? 1 : 0),
      };
      const career = { ...pl.stats };
      career.totalTrades = (career.totalTrades ?? 0) + 1;
      career.totalWins = (career.totalWins ?? 0) + (isWin ? 1 : 0);
      career.totalPnl = (career.totalPnl ?? 0) + pnl;
      career.maxWinPnl = Math.max(career.maxWinPnl ?? 0, pnl);
      career.totalFees = (career.totalFees ?? 0) + trade.fees;

      const updated: PlayerState = { ...pl, balance: newBalance, stats: career };
      playerRef.current = updated;
      setPlayer(updated);
      dayStatsRef.current = nextDs;
      setDayStats(nextDs);
      setClosedTrades((prev) => [trade, ...prev]);
      setMarkers((prev) => [
        ...prev,
        { time: now, side: "exit", text: `${isWin ? "+" : ""}${pnl.toFixed(0)}`, win: isWin, symbol: p.symbol },
      ]);
      pendingTradesRef.current.push(trade);
      dayTradesRef.current.push(trade);
      dirtyRef.current = true;
      evaluateMissions(nextDs, career);

      const reasonLabel =
        reason === "stop" ? "Stop atingido" : reason === "take" ? "Alvo atingido 🎯" : reason === "liquidation" ? "LIQUIDADO ⚠️" : reason === "eod" ? "Fechamento do pregão" : "Posição fechada";
      pushToast({
        kind: isWin ? "success" : "error",
        title: `${reasonLabel}: ${isWin ? "+" : ""}${pnl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
        body: `${p.symbol} ${p.side === "long" ? "compra" : "venda"} ${p.qty} @ ${exitPrice}${insured ? " · Seguro aplicado ☂️" : ""}`,
      });
      return trade;
    },
    [evaluateMissions, owned, pushToast, unrealizedFor],
  );

  const closePosition = useCallback(
    (id: string) => {
      const eng = engineRef.current!;
      const p = positionsRef.current.find((x) => x.id === id);
      if (!p) return;
      const px = eng.price(p.symbol);
      const next = positionsRef.current.filter((x) => x.id !== id);
      positionsRef.current = next;
      setPositions(next);
      closePositionInternal(p, px, "manual", eng.time);
      void flushSync();
    },
    [closePositionInternal, flushSync],
  );

  const closeAll = useCallback(() => {
    for (const p of [...positionsRef.current]) closePosition(p.id);
  }, [closePosition]);

  const openPosition = useCallback(
    (order: OrderInput): string | null => {
      const eng = engineRef.current!;
      if (dayOver) return "Pregão encerrado";
      const pl = playerRef.current;
      const sym = symbolRef.current;
      const px = eng.price(sym);
      const asset = ASSET_MAP[sym];
      if (order.qty <= 0) return "Quantidade inválida";
      if (order.leverage > pl.maxLeverage) return `Alavancagem máxima: ${pl.maxLeverage}x`;
      const nt = notional(sym, order.qty, px);
      const margin = nt / order.leverage / intradayFactor(sym);
      const fee = nt * pl.feeRate;
      const used = positionsRef.current.reduce((s, p) => s + p.marginUsed, 0);
      if (margin + fee > pl.balance - used) return "Margem insuficiente";
      if (order.stopLoss !== null) {
        if (order.side === "long" && order.stopLoss >= px) return "Stop deve ficar abaixo do preço";
        if (order.side === "short" && order.stopLoss <= px) return "Stop deve ficar acima do preço";
      }
      if (order.takeProfit !== null) {
        if (order.side === "long" && order.takeProfit <= px) return "Alvo deve ficar acima do preço";
        if (order.side === "short" && order.takeProfit >= px) return "Alvo deve ficar abaixo do preço";
      }
      // simulate slippage of one tick against the trader
      const fill = order.side === "long" ? px + asset.tickSize * (Math.random() < 0.5 ? 1 : 0) : px - asset.tickSize * (Math.random() < 0.5 ? 1 : 0);
      const pos: Position = {
        id: uid(),
        symbol: sym,
        side: order.side,
        qty: order.qty,
        leverage: order.leverage,
        entryPrice: Number(fill.toFixed(6)),
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        openedAt: eng.time,
        marginUsed: margin,
        fees: fee,
      };
      const next = [...positionsRef.current, pos];
      positionsRef.current = next;
      setPositions(next);
      const ds = dayStatsRef.current;
      const nextDs: DayStats = {
        ...ds,
        tradesWithStop: ds.tradesWithStop + (order.stopLoss !== null ? 1 : 0),
        symbolsTraded: ds.symbolsTraded.includes(sym) ? ds.symbolsTraded : [...ds.symbolsTraded, sym],
      };
      dayStatsRef.current = nextDs;
      setDayStats(nextDs);
      const career = { ...pl.stats, tradesWithStop: (pl.stats.tradesWithStop ?? 0) + (order.stopLoss !== null ? 1 : 0) };
      const updated = { ...pl, stats: career };
      playerRef.current = updated;
      setPlayer(updated);
      setMarkers((prev) => [...prev, { time: eng.time, side: order.side, text: order.side === "long" ? "C" : "V", symbol: sym }]);
      evaluateMissions(nextDs, career);
      dirtyRef.current = true;
      return null;
    },
    [dayOver, evaluateMissions],
  );

  const updatePositionLevels = useCallback((id: string, stopLoss: number | null, takeProfit: number | null) => {
    const next = positionsRef.current.map((p) => (p.id === id ? { ...p, stopLoss, takeProfit } : p));
    positionsRef.current = next;
    setPositions(next);
  }, []);

  // ------- day end -------
  const finishDay = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const eng = engineRef.current!;
    for (const p of [...positionsRef.current]) {
      positionsRef.current = positionsRef.current.filter((x) => x.id !== p.id);
      closePositionInternal(p, eng.price(p.symbol), "eod", eng.time);
    }
    setPositions([]);
    const ds = dayStatsRef.current;
    const pl = playerRef.current;
    const pnl = pl.balance - dayStartBalanceRef.current;
    const winRate = ds.trades > 0 ? ds.wins / ds.trades : 0;
    const baseXp = 25 + ds.trades * 4 + ds.wins * 8 + Math.floor(Math.max(0, pnl) / 40);
    const baseCoins = 8 + Math.floor(Math.max(0, pnl) / 120) + (ds.trades >= 3 ? 5 : 0);
    const newXp = pl.xp + baseXp;
    const lv = levelFromXp(newXp);
    const career = { ...pl.stats };
    career.daysPlayed = (career.daysPlayed ?? 0) + 1;
    career.profitableDays = (career.profitableDays ?? 0) + (pnl > 0 ? 1 : 0);
    const grade =
      pnl > 1500 && winRate >= 0.5 ? "S" : pnl > 500 ? "A" : pnl > 0 ? "B" : pnl > -500 ? "C" : "D";
    const updated: PlayerState = { ...pl, xp: newXp, level: lv.level, coins: pl.coins + baseCoins, stats: career };
    playerRef.current = updated;
    setPlayer(updated);
    const allPnls = dayTradesRef.current.map((t) => t.pnl);
    setSummary({
      day: pl.day,
      pnl,
      trades: ds.trades,
      wins: ds.wins,
      xpEarned: baseXp + dayXpRef.current,
      coinsEarned: baseCoins + dayCoinsRef.current,
      grade,
      bestTrade: allPnls.length ? Math.max(...allPnls) : 0,
      worstTrade: allPnls.length ? Math.min(...allPnls) : 0,
      levelUp: lv.level > pl.level,
    });
    evaluateMissions(ds, career);
    setDayOver(true);
    dirtyRef.current = true;
    void flushSync();
  }, [closePositionInternal, evaluateMissions, flushSync]);

  const startNextDay = useCallback(async () => {
    const pl = playerRef.current;
    const s = summary;
    if (!s) return;
    await flushSync();
    const res = await fetch(`/api/player/${pl.id}/end-day`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day: s.day,
        pnl: s.pnl,
        tradesCount: s.trades,
        wins: s.wins,
        xpEarned: s.xpEarned,
        coinsEarned: s.coinsEarned,
        balance: pl.balance,
        xp: pl.xp,
        level: pl.level,
        coins: pl.coins,
        stats: pl.stats,
      }),
    });
    const data = (await res.json()) as { player: PlayerState };
    const np: PlayerState = { ...pl, ...data.player };
    // reset daily missions
    const nextMissions = { ...missionsRef.current };
    for (const def of MISSIONS) {
      if (def.scope === "daily") nextMissions[def.id] = { missionId: def.id, progress: 0, completed: false, claimed: false };
    }
    missionsRef.current = nextMissions;
    setMissions(nextMissions);
    await fetch(`/api/player/${pl.id}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missions: Object.values(nextMissions) }),
    });

    const eng = new MarketEngine(np.day, engineRef.current!.lastPrices());
    engineRef.current = eng;
    playerRef.current = np;
    setPlayer(np);
    dayStartBalanceRef.current = np.balance;
    dayXpRef.current = 0;
    dayCoinsRef.current = 0;
    insuranceUsedRef.current = false;
    lastNewsTimeRef.current = {};
    dayTradesRef.current = [];
    finishedRef.current = false;
    const ds = emptyDayStats(np.balance);
    dayStatsRef.current = ds;
    setDayStats(ds);
    setClosedTrades([]);
    setMarkers([]);
    setNews([]);
    setHints([]);
    setPausesLeft(3);
    setPaused(false);
    setSummary(null);
    setDayOver(false);
    setProgress(0);
    setSimTime(eng.time);
    setCandles(eng.snapshot(symbolRef.current).candles);
    setPrices(eng.lastPrices());
    pushToast({ kind: "info", title: `Pregão ${np.day} aberto!`, body: "Boa sorte, trader." });
  }, [flushSync, pushToast, summary]);

  // ------- market loop -------
  useEffect(() => {
    if (dayOver) return;
    const iv = setInterval(() => {
      if (paused) return;
      const eng = engineRef.current!;
      const fired = eng.tick();
      const now = eng.time;
      if (fired.length) {
        setNews((prev) => [...fired, ...prev].slice(0, 30));
        for (const n of fired) {
          lastNewsTimeRef.current[n.symbol] = now;
          pushToast({
            kind: "info",
            title: `📰 ${n.symbol === "ALL" ? "MERCADO" : n.symbol}: ${n.sentiment === "bull" ? "📈" : "📉"}`,
            body: n.headline,
          });
        }
      }
      // stops / takes / liquidation
      const px = eng.lastPrices();
      let remaining = positionsRef.current;
      const toClose: { p: Position; price: number; reason: ClosedTrade["reason"] }[] = [];
      for (const p of remaining) {
        const cp = px[p.symbol];
        const unreal = unrealizedFor(p, cp);
        if (unreal <= -p.marginUsed * 0.9) {
          toClose.push({ p, price: cp, reason: "liquidation" });
          continue;
        }
        if (p.stopLoss !== null) {
          if ((p.side === "long" && cp <= p.stopLoss) || (p.side === "short" && cp >= p.stopLoss)) {
            toClose.push({ p, price: p.stopLoss, reason: "stop" });
            continue;
          }
        }
        if (p.takeProfit !== null) {
          if ((p.side === "long" && cp >= p.takeProfit) || (p.side === "short" && cp <= p.takeProfit)) {
            toClose.push({ p, price: p.takeProfit, reason: "take" });
          }
        }
      }
      if (toClose.length) {
        remaining = remaining.filter((p) => !toClose.some((c) => c.p.id === p.id));
        positionsRef.current = remaining;
        setPositions(remaining);
        for (const c of toClose) closePositionInternal(c.p, c.price, c.reason, now);
        void flushSync();
      }
      // drawdown tracking
      let unreal = 0;
      for (const p of positionsRef.current) unreal += unrealizedFor(p, px[p.symbol]);
      const eq = playerRef.current.balance + unreal;
      const ds = dayStatsRef.current;
      const peak = Math.max(ds.peakEquity, eq);
      const dd = peak - eq;
      if (peak !== ds.peakEquity || dd > ds.maxDrawdown) {
        const nds = { ...ds, peakEquity: peak, maxDrawdown: Math.max(ds.maxDrawdown, dd) };
        dayStatsRef.current = nds;
        setDayStats(nds);
      }

      setPrices(px);
      setCandles(eng.snapshot(symbolRef.current).candles);
      setProgress(eng.progress);
      setSimTime(now);
      if (eng.candleIndex % 2 === 0) setBook(eng.orderBook(symbolRef.current));
      if (playerRef.current.ownedItems.includes("insider")) setHints(eng.upcomingNews(5));

      if (eng.isDayOver) finishDay();
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [paused, dayOver, closePositionInternal, finishDay, flushSync, pushToast, unrealizedFor]);

  // Switch the active asset atomically: symbol + its candles + book update in the
  // same render, so the chart never sees a (new symbol, old asset's candles) pair.
  const selectSymbol = useCallback((sym: string) => {
    const eng = engineRef.current!;
    if (symbolRef.current === sym) return;
    symbolRef.current = sym;
    setSymbol(sym);
    setCandles(eng.snapshot(sym).candles);
    setBook(eng.orderBook(sym));
  }, []);

  // ------- shop -------
  const buyItem = useCallback(
    async (itemId: string): Promise<string | null> => {
      const item = SHOP_MAP[itemId];
      if (!item) return "Item inválido";
      const res = await fetch(`/api/player/${playerRef.current.id}/shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = (await res.json()) as { player?: PlayerState; error?: string };
      if (!res.ok || !data.player) return data.error ?? "Erro na compra";
      const np: PlayerState = { ...playerRef.current, ...data.player };
      playerRef.current = np;
      setPlayer(np);
      pushToast({ kind: "reward", title: `${item.icon} ${item.name}`, body: "Item adquirido!" });
      evaluateMissions(dayStatsRef.current, np.stats);
      return null;
    },
    [evaluateMissions, pushToast],
  );

  const togglePause = useCallback(() => {
    if (paused) {
      setPaused(false);
      return;
    }
    if (!owned("pause")) {
      pushToast({ kind: "error", title: "Botão de Pânico bloqueado", body: "Compre na loja para pausar o mercado." });
      return;
    }
    if (pausesLeft <= 0) {
      pushToast({ kind: "error", title: "Sem pausas restantes hoje" });
      return;
    }
    setPausesLeft((n) => n - 1);
    setPaused(true);
  }, [owned, paused, pausesLeft, pushToast]);

  const levelInfo = useMemo(() => levelFromXp(player.xp), [player.xp]);
  const unlockedSymbols = useMemo(
    () => ASSETS.filter((a) => a.unlockLevel <= player.level).map((a) => a.symbol),
    [player.level],
  );

  return {
    player,
    missions,
    symbol,
    selectSymbol,
    positions,
    closedTrades,
    dayStats,
    candles,
    prices,
    dayOpens,
    news,
    hints,
    progress,
    simTime,
    dayStartTime,
    paused,
    pausesLeft,
    togglePause,
    dayOver,
    summary,
    toasts,
    markers,
    book,
    equity,
    marginUsed,
    available,
    levelInfo,
    unlockedSymbols,
    openPosition,
    closePosition,
    closeAll,
    updatePositionLevels,
    claimMission,
    buyItem,
    startNextDay,
    unrealizedFor,
    tutorialSeen,
    setTutorialSeen,
    candlesPerDay: CANDLES_PER_DAY,
    dismissToast: (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
  };
}

export type GameApi = ReturnType<typeof useGame>;
