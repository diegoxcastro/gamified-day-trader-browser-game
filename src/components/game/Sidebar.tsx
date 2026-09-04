"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameApi } from "@/lib/game/useGame";
import { ASSETS, ASSET_MAP, formatBRL, formatPrice, notional, pointValue, intradayFactor } from "@/lib/game/assets";
import type { Side } from "@/lib/game/types";

export function OrderPanel({ game }: { game: GameApi }) {
  const { symbol, prices, player, available, openPosition } = game;
  const asset = ASSET_MAP[symbol];
  const price = prices[symbol] ?? asset.basePrice;
  const [side, setSide] = useState<Side>("long");
  const [qty, setQty] = useState<number>(asset.lotSize);
  const [leverage, setLeverage] = useState(1);
  const [useStop, setUseStop] = useState(true);
  const [useTake, setUseTake] = useState(true);
  const [stopPct, setStopPct] = useState(0.5);
  const [takePct, setTakePct] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQty(ASSET_MAP[symbol].lotSize);
  }, [symbol]);

  useEffect(() => {
    if (leverage > player.maxLeverage) setLeverage(player.maxLeverage);
  }, [player.maxLeverage, leverage]);

  const stopPrice = useMemo(() => {
    const raw = side === "long" ? price * (1 - stopPct / 100) : price * (1 + stopPct / 100);
    return Math.round(raw / asset.tickSize) * asset.tickSize;
  }, [price, side, stopPct, asset.tickSize]);
  const takePrice = useMemo(() => {
    const raw = side === "long" ? price * (1 + takePct / 100) : price * (1 - takePct / 100);
    return Math.round(raw / asset.tickSize) * asset.tickSize;
  }, [price, side, takePct, asset.tickSize]);

  const nt = notional(symbol, qty, price);
  const margin = nt / leverage / intradayFactor(symbol);
  const fee = nt * player.feeRate;
  const riskBRL = Math.abs(price - stopPrice) * qty * pointValue(symbol);
  const rewardBRL = Math.abs(takePrice - price) * qty * pointValue(symbol);
  const rr = riskBRL > 0 ? rewardBRL / riskBRL : 0;
  const riskPct = available > 0 ? (riskBRL / (available + game.marginUsed)) * 100 : 0;

  const submit = () => {
    const err = openPosition({
      side,
      qty,
      leverage,
      stopLoss: useStop ? stopPrice : null,
      takeProfit: useTake ? takePrice : null,
    });
    setError(err);
    if (err) setTimeout(() => setError(null), 2500);
  };

  // hotkeys
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "b" || e.key === "B") {
        setSide("long");
      } else if (e.key === "s" || e.key === "S") {
        setSide("short");
      } else if (e.key === "f" || e.key === "F") {
        game.closeAll();
      } else if (e.key === "Enter") {
        submit();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, qty, leverage, useStop, useTake, stopPrice, takePrice]);

  const levOptions = [1, 2, 3, 5, 10].filter((l) => l <= player.maxLeverage);
  const qtySteps = [1, 2, 5, 10].map((m) => asset.lotSize * m);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#1f2733] bg-[#0f131a] p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Boleta</h3>
        <span className="font-mono text-xs text-slate-500">{asset.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-md bg-[#0b0e14] p-1">
        <button
          onClick={() => setSide("long")}
          className={`rounded px-2 py-2 text-sm font-bold transition ${side === "long" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          COMPRAR
        </button>
        <button
          onClick={() => setSide("short")}
          className={`rounded px-2 py-2 text-sm font-bold transition ${side === "short" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          VENDER
        </button>
      </div>

      <div className="text-center font-mono text-2xl font-bold text-white">{formatPrice(symbol, price)}</div>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Quantidade
        <div className="flex gap-1">
          <input
            type="number"
            min={asset.lotSize}
            step={asset.lotSize}
            value={qty}
            onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
            className="w-full rounded border border-[#1f2733] bg-[#0b0e14] px-2 py-1.5 font-mono text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="grid grid-cols-4 gap-1">
          {qtySteps.map((q) => (
            <button
              key={q}
              onClick={() => setQty(q)}
              className={`rounded border px-1 py-0.5 font-mono text-[11px] ${qty === q ? "border-sky-500 text-sky-400" : "border-[#1f2733] text-slate-400 hover:border-slate-500"}`}
            >
              {q}
            </button>
          ))}
        </div>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        <span className="flex justify-between">
          Alavancagem <span className="text-slate-500">máx {player.maxLeverage}x</span>
        </span>
        <div className="grid grid-cols-5 gap-1">
          {[1, 2, 3, 5, 10].map((l) => {
            const enabled = levOptions.includes(l);
            return (
              <button
                key={l}
                disabled={!enabled}
                onClick={() => setLeverage(l)}
                className={`rounded border px-1 py-1 font-mono text-[11px] ${leverage === l ? "border-amber-500 bg-amber-500/10 text-amber-400" : enabled ? "border-[#1f2733] text-slate-400 hover:border-slate-500" : "cursor-not-allowed border-[#1f2733] text-slate-700"}`}
                title={enabled ? "" : "Compre na loja"}
              >
                {l}x{!enabled && " 🔒"}
              </button>
            );
          })}
        </div>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded border p-2 ${useStop ? "border-red-900/60 bg-red-950/20" : "border-[#1f2733]"}`}>
          <label className="flex cursor-pointer items-center justify-between text-xs text-slate-300">
            <span>Stop Loss</span>
            <input type="checkbox" checked={useStop} onChange={(e) => setUseStop(e.target.checked)} className="accent-red-500" />
          </label>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={stopPct}
            disabled={!useStop}
            onChange={(e) => setStopPct(Number(e.target.value))}
            className="mt-1 w-full accent-red-500"
          />
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-slate-500">{stopPct.toFixed(1)}%</span>
            <span className="text-red-400">{formatPrice(symbol, stopPrice)}</span>
          </div>
        </div>
        <div className={`rounded border p-2 ${useTake ? "border-emerald-900/60 bg-emerald-950/20" : "border-[#1f2733]"}`}>
          <label className="flex cursor-pointer items-center justify-between text-xs text-slate-300">
            <span>Alvo</span>
            <input type="checkbox" checked={useTake} onChange={(e) => setUseTake(e.target.checked)} className="accent-emerald-500" />
          </label>
          <input
            type="range"
            min={0.1}
            max={6}
            step={0.1}
            value={takePct}
            disabled={!useTake}
            onChange={(e) => setTakePct(Number(e.target.value))}
            className="mt-1 w-full accent-emerald-500"
          />
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-slate-500">{takePct.toFixed(1)}%</span>
            <span className="text-emerald-400">{formatPrice(symbol, takePrice)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded bg-[#0b0e14] p-2 font-mono text-[11px]">
        <span className="text-slate-500">Exposição</span>
        <span className="text-right text-slate-200">{formatBRL(nt)}</span>
        <span className="text-slate-500">Margem</span>
        <span className="text-right text-slate-200">{formatBRL(margin)}</span>
        <span className="text-slate-500">Corretagem</span>
        <span className="text-right text-slate-200">{formatBRL(fee)}</span>
        {useStop && (
          <>
            <span className="text-slate-500">Risco</span>
            <span className={`text-right ${riskPct > 2 ? "text-red-400" : "text-amber-300"}`}>
              -{formatBRL(riskBRL)} ({riskPct.toFixed(1)}%)
            </span>
          </>
        )}
        {useStop && useTake && (
          <>
            <span className="text-slate-500">Risco/Retorno</span>
            <span className={`text-right ${rr >= 2 ? "text-emerald-400" : rr >= 1 ? "text-amber-300" : "text-red-400"}`}>
              1 : {rr.toFixed(2)}
            </span>
          </>
        )}
      </div>

      {riskPct > 2 && useStop && (
        <p className="rounded border border-amber-900/50 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300">
          ⚠️ Regra dos 2%: profissionais não arriscam mais de 2% do capital por operação.
        </p>
      )}

      {error && <p className="rounded bg-red-950/50 px-2 py-1 text-xs text-red-300">{error}</p>}

      <button
        onClick={submit}
        disabled={game.dayOver}
        className={`rounded-md py-3 text-sm font-extrabold tracking-wide text-white shadow-lg transition disabled:opacity-40 ${side === "long" ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40" : "bg-red-600 hover:bg-red-500 shadow-red-900/40"}`}
      >
        {side === "long" ? "COMPRAR" : "VENDER"} {qty} {symbol} {leverage > 1 ? `· ${leverage}x` : ""}
      </button>
      <p className="text-center text-[10px] text-slate-600">
        Atalhos: <kbd>B</kbd> compra · <kbd>S</kbd> venda · <kbd>Enter</kbd> envia · <kbd>F</kbd> zera tudo
      </p>
    </div>
  );
}

export function Watchlist({ game }: { game: GameApi }) {
  const { prices, dayOpens, symbol, selectSymbol, unlockedSymbols, player } = game;
  return (
    <div className="rounded-lg border border-[#1f2733] bg-[#0f131a] p-2">
      <h3 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Watchlist</h3>
      <div className="flex flex-col">
        {ASSETS.map((a) => {
          const unlocked = unlockedSymbols.includes(a.symbol);
          const p = prices[a.symbol] ?? a.basePrice;
          const ch = ((p - (dayOpens[a.symbol] ?? p)) / (dayOpens[a.symbol] ?? p)) * 100;
          return (
            <button
              key={a.symbol}
              disabled={!unlocked}
              onClick={() => selectSymbol(a.symbol)}
              className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-xs transition ${symbol === a.symbol ? "bg-sky-500/10 ring-1 ring-sky-500/40" : "hover:bg-white/5"} ${!unlocked ? "opacity-40" : ""}`}
              title={unlocked ? a.description : `Desbloqueia no nível ${a.unlockLevel}`}
            >
              <span>
                <span className="font-bold text-white">{a.symbol}</span>
                <span className="ml-1 text-[10px] text-slate-500">{unlocked ? a.category : `🔒 Nv ${a.unlockLevel}`}</span>
              </span>
              <span className="text-right font-mono">
                <span className="text-slate-200">{formatPrice(a.symbol, p)}</span>
                <span className={`ml-2 ${ch >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {ch >= 0 ? "+" : ""}
                  {ch.toFixed(2)}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 px-1 text-[10px] text-slate-600">Nível {player.level} · suba de nível para desbloquear ativos</p>
    </div>
  );
}

export function OrderBook({ game }: { game: GameApi }) {
  const { book, symbol, player } = game;
  if (!player.ownedItems.includes("orderbook")) {
    return (
      <div className="rounded-lg border border-dashed border-[#1f2733] bg-[#0f131a] p-3 text-center text-xs text-slate-500">
        📚 Book de Ofertas bloqueado — disponível na loja
      </div>
    );
  }
  const maxVol = Math.max(1, ...book.bids.map((b) => b[1]), ...book.asks.map((a) => a[1]));
  return (
    <div className="rounded-lg border border-[#1f2733] bg-[#0f131a] p-2">
      <h3 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Book de Ofertas</h3>
      <div className="font-mono text-[11px]">
        {[...book.asks].reverse().map(([p, v]) => (
          <div key={`a${p}`} className="relative flex justify-between px-1 py-0.5">
            <div className="absolute inset-y-0 right-0 bg-red-500/10" style={{ width: `${(v / maxVol) * 100}%` }} />
            <span className="relative text-red-400">{formatPrice(symbol, p)}</span>
            <span className="relative text-slate-400">{v}</span>
          </div>
        ))}
        <div className="my-0.5 border-t border-[#1f2733]" />
        {book.bids.map(([p, v]) => (
          <div key={`b${p}`} className="relative flex justify-between px-1 py-0.5">
            <div className="absolute inset-y-0 right-0 bg-emerald-500/10" style={{ width: `${(v / maxVol) * 100}%` }} />
            <span className="relative text-emerald-400">{formatPrice(symbol, p)}</span>
            <span className="relative text-slate-400">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
