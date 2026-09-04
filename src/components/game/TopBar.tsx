"use client";

import type { GameApi, Toast } from "@/lib/game/useGame";
import { formatBRL } from "@/lib/game/assets";
import { levelTitle } from "@/lib/game/missions";

interface Props {
  game: GameApi;
  onOpen: (m: "missions" | "shop" | "leaderboard" | "tutorial") => void;
  accent: string;
}

function simClock(t: number) {
  return new Date(t * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export default function TopBar({ game, onOpen, accent }: Props) {
  const { player, equity, available, progress, simTime, levelInfo, missions, paused, pausesLeft, togglePause } = game;
  const dayPnl = equity - game.dayStats.startBalance;
  const claimable = Object.values(missions).filter((m) => m.completed && !m.claimed).length;

  return (
    <header className="flex items-center gap-3 border-b border-[#1f2733] bg-[#0f131a] px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md text-lg font-black text-black" style={{ background: accent }}>
          T
        </div>
        <div className="leading-tight">
          <div className="text-sm font-extrabold tracking-tight text-white">Trader Arena</div>
          <div className="text-[10px] text-slate-500">Pregão {player.day} · {simClock(simTime)}</div>
        </div>
      </div>

      <div className="hidden min-w-[140px] flex-col gap-1 md:flex">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>10:00</span>
          <span>{paused ? "⏸ PAUSADO" : "sessão"}</span>
          <span>12:00</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded bg-[#1f2733]">
          <div className="h-full transition-all" style={{ width: `${progress * 100}%`, background: accent }} />
        </div>
      </div>

      <div className="mx-auto flex items-center gap-5 font-mono text-xs">
        <Stat label="Patrimônio" value={formatBRL(equity)} />
        <Stat label="Disponível" value={formatBRL(available)} muted />
        <Stat label="Resultado do dia" value={`${dayPnl >= 0 ? "+" : ""}${formatBRL(dayPnl)}`} color={dayPnl >= 0 ? "text-emerald-400" : "text-red-400"} />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-md border border-[#1f2733] px-2 py-1 lg:flex">
          <div className="leading-tight">
            <div className="text-[10px] text-slate-500">Nv {player.level} · {levelTitle(player.level)}</div>
            <div className="h-1 w-24 overflow-hidden rounded bg-[#1f2733]">
              <div className="h-full bg-sky-500" style={{ width: `${(levelInfo.into / levelInfo.need) * 100}%` }} />
            </div>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{levelInfo.into}/{levelInfo.need} XP</span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-amber-700/50 bg-amber-950/30 px-2 py-1 font-mono text-xs text-amber-300">
          🪙 {player.coins}
        </div>
        <button
          onClick={togglePause}
          className={`rounded-md border px-2 py-1 text-xs ${paused ? "border-amber-500 text-amber-300" : "border-[#1f2733] text-slate-300 hover:border-slate-500"}`}
          title="Botão de Pânico"
        >
          {paused ? "▶ Retomar" : `⏸ ${pausesLeft}`}
        </button>
        <button onClick={() => onOpen("missions")} className="relative rounded-md border border-[#1f2733] px-2 py-1 text-xs text-slate-200 hover:border-slate-500">
          🎯 Missões
          {claimable > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-black">{claimable}</span>
          )}
        </button>
        <button onClick={() => onOpen("shop")} className="rounded-md border border-[#1f2733] px-2 py-1 text-xs text-slate-200 hover:border-slate-500">
          🛒 Loja
        </button>
        <button onClick={() => onOpen("leaderboard")} className="rounded-md border border-[#1f2733] px-2 py-1 text-xs text-slate-200 hover:border-slate-500">
          🏆
        </button>
        <button onClick={() => onOpen("tutorial")} className="rounded-md border border-[#1f2733] px-2 py-1 text-xs text-slate-200 hover:border-slate-500">
          ?
        </button>
        <span className="hidden text-xs text-slate-400 xl:inline">👤 {player.name}</span>
      </div>
    </header>
  );
}

function Stat({ label, value, color, muted }: { label: string; value: string; color?: string; muted?: boolean }) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`font-bold ${color ?? (muted ? "text-slate-300" : "text-white")}`}>{value}</div>
    </div>
  );
}

export function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  const styles: Record<Toast["kind"], string> = {
    success: "border-emerald-600/60 bg-emerald-950/80",
    error: "border-red-600/60 bg-red-950/80",
    info: "border-sky-600/60 bg-sky-950/80",
    reward: "border-amber-500/60 bg-amber-950/80",
    levelup: "border-fuchsia-500/70 bg-fuchsia-950/90 shadow-[0_0_30px_rgba(217,70,239,0.4)]",
  };
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto cursor-pointer rounded-lg border px-3 py-2 text-xs text-white backdrop-blur animate-[slidein_.25s_ease-out] ${styles[t.kind]}`}
        >
          <div className="font-bold">{t.title}</div>
          {t.body && <div className="mt-0.5 text-slate-300">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
