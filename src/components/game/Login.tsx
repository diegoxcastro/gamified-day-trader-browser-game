"use client";

import { useEffect, useState } from "react";
import Game from "./Game";
import type { PlayerState } from "@/lib/game/types";

interface LoadedData {
  player: PlayerState;
  missions: { missionId: string; progress: number; completed: boolean; claimed: boolean }[];
}

export default function Login() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoadedData | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  const enter = async (n: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const d = (await res.json()) as LoadedData & { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Erro");
      localStorage.setItem("trader-arena-name", n);
      setData({ player: d.player, missions: d.missions });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("trader-arena-name");
    if (saved && !autoTried) {
      setAutoTried(true);
      setName(saved);
      void enter(saved);
    } else {
      setAutoTried(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (data) {
    return (
      <Game
        key={data.player.id}
        player={data.player}
        missions={data.missions}
        onLogout={() => {
          localStorage.removeItem("trader-arena-name");
          setData(null);
          setName("");
        }}
      />
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0e14] px-4">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,#0ea5e955,transparent_40%),radial-gradient(circle_at_80%_70%,#22c55e44,transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(#151b24_1px,transparent_1px),linear-gradient(90deg,#151b24_1px,transparent_1px)] [background-size:40px_40px] opacity-40" />

      <div className="relative w-full max-w-md rounded-2xl border border-[#2a3441] bg-[#0f131a]/90 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-400 text-2xl font-black text-black">T</div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Trader Arena</h1>
            <p className="text-xs text-slate-400">Simulador de day trade gamificado</p>
          </div>
        </div>

        <ul className="mb-6 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <li className="rounded-md border border-[#1f2733] px-2 py-1.5">📈 Gráfico estilo TradingView</li>
          <li className="rounded-md border border-[#1f2733] px-2 py-1.5">🎯 Missões & recompensas</li>
          <li className="rounded-md border border-[#1f2733] px-2 py-1.5">🛒 Loja com upgrades</li>
          <li className="rounded-md border border-[#1f2733] px-2 py-1.5">📰 Notícias em tempo real</li>
          <li className="rounded-md border border-[#1f2733] px-2 py-1.5">⚡ Alavancagem & short</li>
          <li className="rounded-md border border-[#1f2733] px-2 py-1.5">🏆 Ranking global</li>
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) void enter(name.trim());
          }}
          className="flex flex-col gap-3"
        >
          <label className="text-xs font-semibold text-slate-400">Nome do trader</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: LoboDaFariaLima"
            maxLength={24}
            autoFocus
            className="rounded-lg border border-[#2a3441] bg-[#0b0e14] px-4 py-3 text-white outline-none focus:border-sky-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || name.trim().length < 2}
            className="rounded-lg bg-sky-500 py-3 font-extrabold text-black transition hover:bg-sky-400 disabled:opacity-40"
          >
            {loading ? "Abrindo o mercado..." : "Entrar no pregão →"}
          </button>
          <p className="text-center text-[11px] text-slate-500">Seu progresso é salvo pelo nome. Use o mesmo nome para continuar.</p>
        </form>
      </div>
    </main>
  );
}
