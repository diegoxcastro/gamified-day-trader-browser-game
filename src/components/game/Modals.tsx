"use client";

import { useEffect, useState } from "react";
import type { GameApi } from "@/lib/game/useGame";
import { MISSIONS } from "@/lib/game/missions";
import { SHOP_ITEMS, type ShopCategory } from "@/lib/game/shop";
import { formatBRL } from "@/lib/game/assets";
import { levelTitle } from "@/lib/game/missions";

export function Modal({ title, onClose, children, wide }: { title: string; onClose?: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-[#2a3441] bg-[#0f131a] shadow-2xl ${wide ? "max-w-4xl" : "max-w-2xl"}`}
      >
        <div className="flex items-center justify-between border-b border-[#1f2733] px-5 py-3">
          <h2 className="text-base font-bold text-white">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="rounded px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white">
              ✕
            </button>
          )}
        </div>
        <div className="overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function MissionsModal({ game, onClose }: { game: GameApi; onClose: () => void }) {
  const [scope, setScope] = useState<"daily" | "career">("daily");
  const list = MISSIONS.filter((m) => m.scope === scope);
  return (
    <Modal title="🎯 Missões & Objetivos" onClose={onClose} wide>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setScope("daily")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scope === "daily" ? "bg-sky-600 text-white" : "bg-[#1f2733] text-slate-300"}`}>
          Diárias (resetam a cada pregão)
        </button>
        <button onClick={() => setScope("career")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scope === "career" ? "bg-sky-600 text-white" : "bg-[#1f2733] text-slate-300"}`}>
          Carreira
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((m) => {
          const st = game.missions[m.id];
          const pct = Math.min(100, (st.progress / m.target) * 100);
          return (
            <div key={m.id} className={`rounded-lg border p-3 ${st.claimed ? "border-[#1f2733] opacity-50" : st.completed ? "border-emerald-500/60 bg-emerald-950/20" : "border-[#1f2733] bg-[#0b0e14]"}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">{m.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{m.title}</h4>
                    <span className="font-mono text-[10px] text-amber-300">+{m.rewardXp}XP · 🪙{m.rewardCoins}</span>
                  </div>
                  <p className="text-xs text-slate-300">{m.description}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-[#1f2733]">
                    <div className={`h-full ${st.completed ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500">
                      {st.progress}/{m.target}
                    </span>
                    {st.claimed ? (
                      <span className="text-[10px] text-slate-500">✓ Resgatado</span>
                    ) : st.completed ? (
                      <button onClick={() => game.claimMission(m.id)} className="rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-black hover:bg-emerald-400">
                        Resgatar
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 border-l-2 border-amber-500/50 pl-2 text-[11px] italic text-slate-400">💡 {m.tip}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function ShopModal({ game, onClose }: { game: GameApi; onClose: () => void }) {
  const [cat, setCat] = useState<ShopCategory>("indicadores");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const cats: { id: ShopCategory; label: string }[] = [
    { id: "indicadores", label: "📊 Indicadores" },
    { id: "upgrades", label: "🔧 Upgrades" },
    { id: "poderes", label: "✨ Poderes" },
    { id: "visual", label: "🎨 Visual" },
  ];
  const buy = async (id: string) => {
    setBusy(id);
    setErr(null);
    const e = await game.buyItem(id);
    if (e) setErr(e);
    setBusy(null);
  };
  return (
    <Modal title={`🛒 Loja do Trader · 🪙 ${game.player.coins} moedas`} onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${cat === c.id ? "bg-amber-500 text-black" : "bg-[#1f2733] text-slate-300"}`}>
            {c.label}
          </button>
        ))}
      </div>
      {err && <p className="mb-3 rounded bg-red-950/60 px-3 py-2 text-xs text-red-300">{err}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {SHOP_ITEMS.filter((i) => i.category === cat).map((item) => {
          const ownedItem = game.player.ownedItems.includes(item.id) && !item.consumable;
          const locked = (item.minLevel && game.player.level < item.minLevel) || (item.requires && !game.player.ownedItems.includes(item.requires));
          const canAfford = game.player.coins >= item.price;
          return (
            <div key={item.id} className={`flex flex-col rounded-lg border p-3 ${ownedItem ? "border-emerald-600/40 bg-emerald-950/10" : "border-[#1f2733] bg-[#0b0e14]"}`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">{item.icon}</div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">{item.name}</h4>
                  <p className="mt-0.5 text-xs text-slate-300">{item.description}</p>
                  {item.minLevel && <p className="mt-1 text-[10px] text-slate-500">Requer nível {item.minLevel}</p>}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-amber-300">🪙 {item.price}</span>
                {ownedItem ? (
                  <span className="text-xs font-semibold text-emerald-400">✓ Adquirido</span>
                ) : (
                  <button
                    disabled={!!locked || !canAfford || busy === item.id}
                    onClick={() => buy(item.id)}
                    className="rounded bg-amber-500 px-3 py-1 text-xs font-bold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {locked ? "🔒 Bloqueado" : busy === item.id ? "..." : "Comprar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-500">Ganhe moedas completando missões e fechando pregões no lucro.</p>
    </Modal>
  );
}

interface LeaderRow {
  id: number;
  name: string;
  balance: number;
  level: number;
  day: number;
  bestDayPnl: number;
}

export function LeaderboardModal({ game, onClose }: { game: GameApi; onClose: () => void }) {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d: { leaderboard: LeaderRow[] }) => setRows(d.leaderboard))
      .catch(() => setRows([]));
  }, []);
  return (
    <Modal title="🏆 Ranking de Traders" onClose={onClose}>
      {!rows ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1 font-normal">#</th>
              <th className="py-1 font-normal">Trader</th>
              <th className="py-1 font-normal">Nível</th>
              <th className="py-1 font-normal">Pregões</th>
              <th className="py-1 text-right font-normal">Melhor dia</th>
              <th className="py-1 text-right font-normal">Patrimônio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-t border-[#1f2733] ${r.id === game.player.id ? "bg-sky-500/10" : ""}`}>
                <td className="py-2 font-mono text-slate-400">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                <td className="py-2 font-semibold text-white">{r.name}</td>
                <td className="py-2 text-slate-300">
                  {r.level} <span className="text-[10px] text-slate-500">{levelTitle(r.level)}</span>
                </td>
                <td className="py-2 text-slate-300">{r.day - 1}</td>
                <td className="py-2 text-right font-mono text-emerald-400">{formatBRL(r.bestDayPnl)}</td>
                <td className="py-2 text-right font-mono font-bold text-white">{formatBRL(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

export function DaySummaryModal({ game }: { game: GameApi }) {
  const s = game.summary;
  const [loading, setLoading] = useState(false);
  if (!s) return null;
  const gradeColor: Record<string, string> = { S: "text-fuchsia-400", A: "text-emerald-400", B: "text-sky-400", C: "text-amber-400", D: "text-red-400" };
  const gradeMsg: Record<string, string> = {
    S: "Performance de elite! Você operou como um profissional.",
    A: "Excelente pregão. Consistência é o caminho.",
    B: "Dia positivo. Revise seus trades e melhore amanhã.",
    C: "Pequena perda. Faz parte — o importante é sobreviver.",
    D: "Dia difícil. Reduza o tamanho e respeite os stops amanhã.",
  };
  const winRate = s.trades ? Math.round((s.wins / s.trades) * 100) : 0;
  return (
    <Modal title={`🔔 Fechamento do Pregão ${s.day}`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`text-7xl font-black ${gradeColor[s.grade]}`}>{s.grade}</div>
        <p className="text-sm text-slate-300">{gradeMsg[s.grade]}</p>
        <div className={`font-mono text-3xl font-bold ${s.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {s.pnl >= 0 ? "+" : ""}
          {formatBRL(s.pnl)}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 text-left text-xs sm:grid-cols-3">
          <Box label="Operações" value={String(s.trades)} />
          <Box label="Taxa de acerto" value={`${winRate}%`} />
          <Box label="Melhor trade" value={formatBRL(s.bestTrade)} color="text-emerald-400" />
          <Box label="Pior trade" value={formatBRL(s.worstTrade)} color="text-red-400" />
          <Box label="XP ganho" value={`+${s.xpEarned}`} color="text-sky-400" />
          <Box label="Moedas ganhas" value={`+${s.coinsEarned} 🪙`} color="text-amber-300" />
        </div>
        {s.levelUp && (
          <div className="w-full rounded-lg border border-fuchsia-500/60 bg-fuchsia-950/40 p-3 text-sm font-bold text-fuchsia-200">
            🎉 Você subiu para o nível {game.player.level} — {levelTitle(game.player.level)}!
          </div>
        )}
        {game.player.balance < 500 && (
          <div className="w-full rounded-lg border border-red-500/60 bg-red-950/40 p-3 text-xs text-red-200">
            ⚠️ Conta quase zerada. Compre um &quot;Aporte&quot; na loja ou opere com muita cautela.
          </div>
        )}
        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await game.startNextDay();
            setLoading(false);
          }}
          className="w-full rounded-lg bg-sky-600 py-3 text-sm font-extrabold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Abrindo mercado..." : `Iniciar Pregão ${s.day + 1} →`}
        </button>
      </div>
    </Modal>
  );
}

function Box({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border border-[#1f2733] bg-[#0b0e14] p-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-bold ${color ?? "text-white"}`}>{value}</div>
    </div>
  );
}

export function TutorialModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Bem-vindo à Trader Arena 📈",
      body: "Você começa com R$ 10.000 e um objetivo: sobreviver e multiplicar. Cada pregão dura ~5 minutos reais (10:00–12:00 no mercado). Ao final, você recebe XP, moedas e uma nota de desempenho.",
    },
    {
      title: "O gráfico",
      body: "Painel estilo TradingView com candles de 1 minuto, volume e indicadores. Ative SMA/EMA/Bollinger/VWAP/RSI na barra do gráfico (alguns precisam ser comprados na loja). Passe o mouse para ver os valores.",
    },
    {
      title: "Como operar",
      body: "Na boleta à direita escolha COMPRAR (aposta na alta) ou VENDER (short — aposta na queda). Defina quantidade, alavancagem, stop loss e alvo. Suas posições aparecem como linhas no gráfico e na aba Posições.",
    },
    {
      title: "Gestão de risco é o jogo",
      body: "Regra de ouro: nunca arrisque mais de 2% do capital em um trade. Alavancagem multiplica lucros E prejuízos — posições com perda de 90% da margem são liquidadas. Stop loss não é opcional.",
    },
    {
      title: "Missões, loja e níveis",
      body: "Complete missões diárias e de carreira para ganhar XP e moedas 🪙. Gaste moedas na loja em indicadores, alavancagem, poderes especiais e temas. Suba de nível para desbloquear novos ativos: mini índice, dólar, Bitcoin, forex e NVIDIA.",
    },
    {
      title: "Notícias movem o mercado",
      body: "Manchetes aparecem em tempo real e causam movimentos bruscos. Um bom trader tem plano para a volatilidade. Compre a 'Fonte no Mercado' para receber avisos antecipados (só no jogo, hein!). Boa sorte!",
    },
  ];
  const s = steps[step];
  return (
    <Modal title="Tutorial" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-white">{s.title}</h3>
        <p className="text-sm leading-relaxed text-slate-300">{s.body}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded ${i === step ? "bg-sky-500" : "bg-[#1f2733]"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="rounded border border-[#2a3441] px-3 py-1.5 text-xs text-slate-300">
                Voltar
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="rounded bg-sky-600 px-3 py-1.5 text-xs font-bold text-white">
                Próximo
              </button>
            ) : (
              <button onClick={onClose} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                Começar a operar!
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
