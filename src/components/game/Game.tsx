"use client";

import { useMemo, useState } from "react";
import TradingChart, { type IndicatorToggles } from "./TradingChart";
import { OrderPanel, Watchlist, OrderBook } from "./Sidebar";
import BottomPanel from "./BottomPanel";
import TopBar, { Toasts } from "./TopBar";
import { MissionsModal, ShopModal, LeaderboardModal, DaySummaryModal, TutorialModal } from "./Modals";
import { useGame } from "@/lib/game/useGame";
import type { PlayerState } from "@/lib/game/types";
import { MISSIONS } from "@/lib/game/missions";

interface Props {
  player: PlayerState;
  missions: { missionId: string; progress: number; completed: boolean; claimed: boolean }[];
  onLogout: () => void;
}

type ModalKind = "missions" | "shop" | "leaderboard" | "tutorial" | null;

export default function Game({ player, missions, onLogout }: Props) {
  const game = useGame(player, missions);
  const [modal, setModal] = useState<ModalKind>(game.tutorialSeen ? null : "tutorial");
  const [ind, setInd] = useState<IndicatorToggles>({ sma: true, ema: false, bb: false, vwap: false, rsi: false });

  const owned = (id: string) => game.player.ownedItems.includes(id);
  const accent = owned("theme_gold") ? "#f5b942" : owned("theme_matrix") ? "#39ff14" : "#38bdf8";

  const toggle = (k: keyof IndicatorToggles, itemId?: string) => {
    if (itemId && !owned(itemId)) {
      setModal("shop");
      return;
    }
    setInd((p) => ({ ...p, [k]: !p[k] }));
  };

  const activeMissions = useMemo(
    () => MISSIONS.filter((m) => m.scope === "daily" && !game.missions[m.id].claimed).slice(0, 3),
    [game.missions],
  );

  const indBtn = (label: string, k: keyof IndicatorToggles, itemId?: string, color?: string) => {
    const locked = itemId && !owned(itemId);
    return (
      <button
        key={k}
        onClick={() => toggle(k, itemId)}
        className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${ind[k] ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"} ${locked ? "opacity-50" : ""}`}
        style={ind[k] && color ? { color } : undefined}
        title={locked ? "Compre na loja" : label}
      >
        {locked ? "🔒 " : ""}
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-[#0b0e14] text-slate-200" style={{ ["--accent" as string]: accent }}>
      <TopBar game={game} onOpen={setModal} accent={accent} />

      <div className="flex min-h-0 flex-1 gap-2 p-2">
        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#1f2733] bg-[#0b0e14]">
            <div className="flex items-center gap-1 border-b border-[#1f2733] bg-[#0f131a] px-2 py-1">
              <span className="mr-1 text-[10px] uppercase tracking-wider text-slate-500">Indicadores</span>
              {indBtn("SMA 9", "sma", undefined, "#f5b942")}
              {indBtn("EMA 21", "ema", "ind_ema", "#42a5f5")}
              {indBtn("VWAP", "vwap", "ind_vwap", "#ff7043")}
              {indBtn("Bollinger", "bb", "ind_bb", "#ab47bc")}
              {indBtn("RSI", "rsi", "ind_rsi", "#ce93d8")}
              <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
                {activeMissions.map((m) => {
                  const st = game.missions[m.id];
                  return (
                    <button key={m.id} onClick={() => setModal("missions")} className="hidden items-center gap-1 rounded border border-[#1f2733] px-1.5 py-0.5 hover:border-slate-500 xl:flex" title={m.description}>
                      <span>{m.icon}</span>
                      <span className={st.completed ? "text-emerald-400" : "text-slate-300"}>
                        {st.progress}/{m.target}
                      </span>
                    </button>
                  );
                })}
                <button onClick={onLogout} className="rounded border border-[#1f2733] px-1.5 py-0.5 hover:border-slate-500">
                  Sair
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <TradingChart
                symbol={game.symbol}
                candles={game.candles}
                dayStartTime={game.dayStartTime}
                indicators={ind}
                positions={game.positions}
                markers={game.markers}
                accent={accent}
              />
            </div>
          </div>
          <div className="h-[200px] shrink-0">
            <BottomPanel game={game} />
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="hidden w-[300px] shrink-0 flex-col gap-2 overflow-y-auto lg:flex">
          <OrderPanel game={game} />
          <Watchlist game={game} />
          <OrderBook game={game} />
        </aside>
      </div>

      {/* Mobile order panel */}
      <div className="lg:hidden">
        <details className="border-t border-[#1f2733] bg-[#0f131a]">
          <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-white">Boleta / Watchlist</summary>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-auto p-2">
            <OrderPanel game={game} />
            <Watchlist game={game} />
          </div>
        </details>
      </div>

      <Toasts toasts={game.toasts} dismiss={game.dismissToast} />

      {modal === "missions" && <MissionsModal game={game} onClose={() => setModal(null)} />}
      {modal === "shop" && <ShopModal game={game} onClose={() => setModal(null)} />}
      {modal === "leaderboard" && <LeaderboardModal game={game} onClose={() => setModal(null)} />}
      {modal === "tutorial" && (
        <TutorialModal
          onClose={() => {
            setModal(null);
            game.setTutorialSeen(true);
          }}
        />
      )}
      {game.dayOver && game.summary && <DaySummaryModal game={game} />}
    </div>
  );
}
