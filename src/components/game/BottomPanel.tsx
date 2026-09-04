"use client";

import { useState } from "react";
import type { GameApi } from "@/lib/game/useGame";
import { formatBRL, formatPrice, ASSET_MAP } from "@/lib/game/assets";

type Tab = "positions" | "history" | "news";

function fmtTime(t: number) {
  return new Date(t * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export default function BottomPanel({ game }: { game: GameApi }) {
  const [tab, setTab] = useState<Tab>("positions");
  const { positions, closedTrades, news, hints, prices, unrealizedFor, closePosition, closeAll, updatePositionLevels, dayStats } = game;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "positions", label: "Posições", badge: positions.length },
    { id: "history", label: "Histórico", badge: closedTrades.length },
    { id: "news", label: "Notícias", badge: news.length + hints.length },
  ];

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1f2733] bg-[#0f131a]">
      <div className="flex items-center justify-between border-b border-[#1f2733] px-2">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 text-xs font-semibold ${tab === t.id ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              {t.label}
              {t.badge ? <span className="ml-1 rounded-full bg-slate-700 px-1.5 text-[10px] text-slate-200">{t.badge}</span> : null}
              {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-sky-500" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pr-1 font-mono text-[11px]">
          <span className="text-slate-500">
            Dia: <span className={dayStats.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>{formatBRL(dayStats.pnl)}</span>
          </span>
          <span className="text-slate-500">
            Win rate: <span className="text-slate-200">{dayStats.trades ? Math.round((dayStats.wins / dayStats.trades) * 100) : 0}%</span>
          </span>
          {positions.length > 0 && (
            <button onClick={closeAll} className="rounded bg-red-600/80 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-red-500">
              ZERAR TUDO (F)
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1">
        {tab === "positions" && (
          positions.length === 0 ? (
            <Empty text="Nenhuma posição aberta. Analise o gráfico e envie uma ordem pela boleta." />
          ) : (
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-1 font-normal">Ativo</th>
                  <th className="px-2 py-1 font-normal">Lado</th>
                  <th className="px-2 py-1 font-normal">Qtd</th>
                  <th className="px-2 py-1 font-normal">Entrada</th>
                  <th className="px-2 py-1 font-normal">Atual</th>
                  <th className="px-2 py-1 font-normal">Stop</th>
                  <th className="px-2 py-1 font-normal">Alvo</th>
                  <th className="px-2 py-1 font-normal">P&L</th>
                  <th className="px-2 py-1 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const px = prices[p.symbol] ?? p.entryPrice;
                  const pnl = unrealizedFor(p, px);
                  const pct = (pnl / p.marginUsed) * 100;
                  const tick = ASSET_MAP[p.symbol].tickSize;
                  const step = tick * 10;
                  return (
                    <tr key={p.id} className="border-t border-[#151b24] text-slate-200">
                      <td className="px-2 py-1.5 font-bold">{p.symbol}</td>
                      <td className={`px-2 py-1.5 font-bold ${p.side === "long" ? "text-emerald-400" : "text-red-400"}`}>
                        {p.side === "long" ? "COMPRA" : "VENDA"} {p.leverage > 1 && <span className="text-amber-400">{p.leverage}x</span>}
                      </td>
                      <td className="px-2 py-1.5">{p.qty}</td>
                      <td className="px-2 py-1.5">{formatPrice(p.symbol, p.entryPrice)}</td>
                      <td className="px-2 py-1.5">{formatPrice(p.symbol, px)}</td>
                      <td className="px-2 py-1.5">
                        <LevelEditor
                          value={p.stopLoss}
                          symbol={p.symbol}
                          step={step}
                          color="text-red-400"
                          onChange={(v) => updatePositionLevels(p.id, v, p.takeProfit)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <LevelEditor
                          value={p.takeProfit}
                          symbol={p.symbol}
                          step={step}
                          color="text-emerald-400"
                          onChange={(v) => updatePositionLevels(p.id, p.stopLoss, v)}
                        />
                      </td>
                      <td className={`px-2 py-1.5 font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatBRL(pnl)} <span className="text-[10px] opacity-70">({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)</span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button onClick={() => closePosition(p.id)} className="rounded border border-slate-600 px-2 py-0.5 hover:border-white hover:text-white">
                          Fechar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {tab === "history" && (
          closedTrades.length === 0 ? (
            <Empty text="Nenhuma operação fechada hoje." />
          ) : (
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-1 font-normal">Ativo</th>
                  <th className="px-2 py-1 font-normal">Lado</th>
                  <th className="px-2 py-1 font-normal">Qtd</th>
                  <th className="px-2 py-1 font-normal">Entrada</th>
                  <th className="px-2 py-1 font-normal">Saída</th>
                  <th className="px-2 py-1 font-normal">Duração</th>
                  <th className="px-2 py-1 font-normal">Motivo</th>
                  <th className="px-2 py-1 font-normal">Taxas</th>
                  <th className="px-2 py-1 font-normal">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.map((t) => (
                  <tr key={t.id} className="border-t border-[#151b24] text-slate-300">
                    <td className="px-2 py-1 font-bold text-slate-100">{t.symbol}</td>
                    <td className={`px-2 py-1 ${t.side === "long" ? "text-emerald-400" : "text-red-400"}`}>
                      {t.side === "long" ? "C" : "V"} {t.leverage > 1 ? `${t.leverage}x` : ""}
                    </td>
                    <td className="px-2 py-1">{t.qty}</td>
                    <td className="px-2 py-1">{formatPrice(t.symbol, t.entryPrice)}</td>
                    <td className="px-2 py-1">{formatPrice(t.symbol, t.exitPrice)}</td>
                    <td className="px-2 py-1">{Math.floor(t.durationSec / 60)}m</td>
                    <td className="px-2 py-1">
                      {{ manual: "Manual", stop: "🛑 Stop", take: "🎯 Alvo", eod: "🔔 Fech.", liquidation: "💀 Liq." }[t.reason]}
                    </td>
                    <td className="px-2 py-1 text-slate-500">{formatBRL(t.fees)}</td>
                    <td className={`px-2 py-1 font-bold ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatBRL(t.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === "news" && (
          <div className="flex flex-col gap-1 p-1">
            {hints.map((h) => (
              <div key={h.id} className="rounded border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-xs">
                <span className="mr-2 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">🕵️ FONTE</span>
                <span className="text-violet-200">
                  Em breve sobre <b>{h.symbol === "ALL" ? "o MERCADO" : h.symbol}</b>: notícia{" "}
                  <b className={h.sentiment === "bull" ? "text-emerald-400" : "text-red-400"}>{h.sentiment === "bull" ? "POSITIVA" : "NEGATIVA"}</b>{" "}
                  em ~{Math.max(1, h.time - Math.floor((game.simTime - game.dayStartTime) / 60))} min
                </span>
              </div>
            ))}
            {news.length === 0 && hints.length === 0 && <Empty text="Sem notícias por enquanto. Fique atento — o mercado reage forte a manchetes." />}
            {news.map((n) => (
              <div key={n.id} className="flex items-start gap-2 rounded border border-[#1f2733] bg-[#0b0e14] px-3 py-2 text-xs">
                <span className="font-mono text-slate-500">{fmtTime(n.time)}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${n.sentiment === "bull" ? "bg-emerald-600/30 text-emerald-300" : "bg-red-600/30 text-red-300"}`}>
                  {n.symbol === "ALL" ? "MERCADO" : n.symbol}
                </span>
                <span className="text-slate-200">{n.headline}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full min-h-[80px] items-center justify-center px-4 text-center text-xs text-slate-500">{text}</div>;
}

function LevelEditor({
  value,
  symbol,
  step,
  color,
  onChange,
}: {
  value: number | null;
  symbol: string;
  step: number;
  color: string;
  onChange: (v: number | null) => void;
}) {
  if (value === null) return <span className="text-slate-600">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      <button onClick={() => onChange(Number((value - step).toFixed(6)))} className="rounded px-1 text-slate-500 hover:bg-white/10 hover:text-white">
        −
      </button>
      <span className={color}>{formatPrice(symbol, value)}</span>
      <button onClick={() => onChange(Number((value + step).toFixed(6)))} className="rounded px-1 text-slate-500 hover:bg-white/10 hover:text-white">
        +
      </button>
    </span>
  );
}
