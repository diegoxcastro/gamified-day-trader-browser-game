import type { DayStats } from "./types";

export type MissionScope = "daily" | "career";

export interface MissionDef {
  id: string;
  scope: MissionScope;
  title: string;
  description: string;
  tip: string; // real-world day trading lesson
  target: number;
  rewardXp: number;
  rewardCoins: number;
  icon: string;
  metric: (day: DayStats, career: Record<string, number>) => number;
}

export const MISSIONS: MissionDef[] = [
  // ---------- DAILY ----------
  {
    id: "d_first_trade",
    scope: "daily",
    title: "Abrir o pregão",
    description: "Feche 1 operação hoje",
    tip: "Todo trader começa com o primeiro clique. Mas lembre: o mercado paga quem espera o setup.",
    target: 1,
    rewardXp: 20,
    rewardCoins: 5,
    icon: "🔔",
    metric: (d) => d.trades,
  },
  {
    id: "d_three_wins",
    scope: "daily",
    title: "Hat-trick",
    description: "Feche 3 operações lucrativas hoje",
    tip: "Taxa de acerto importa menos que a razão risco/retorno. 40% de acerto com 1:3 já é lucrativo.",
    target: 3,
    rewardXp: 60,
    rewardCoins: 15,
    icon: "🎯",
    metric: (d) => d.wins,
  },
  {
    id: "d_stop_discipline",
    scope: "daily",
    title: "Disciplina de ferro",
    description: "Abra 4 operações com stop loss definido",
    tip: "Stop loss não é opcional. É o custo de estar errado — e você VAI estar errado muitas vezes.",
    target: 4,
    rewardXp: 50,
    rewardCoins: 12,
    icon: "🛡️",
    metric: (d) => d.tradesWithStop,
  },
  {
    id: "d_profit_500",
    scope: "daily",
    title: "Meta batida",
    description: "Termine o dia com lucro de R$ 500",
    tip: "Traders profissionais têm meta diária. Bateu a meta? Considere parar. A ganância devolve o lucro.",
    target: 500,
    rewardXp: 80,
    rewardCoins: 25,
    icon: "💰",
    metric: (d) => Math.max(0, d.pnl),
  },
  {
    id: "d_streak_3",
    scope: "daily",
    title: "Em chamas",
    description: "Faça 3 operações vencedoras seguidas",
    tip: "Sequências acontecem. Não aumente o tamanho da posição só porque está ganhando.",
    target: 3,
    rewardXp: 70,
    rewardCoins: 20,
    icon: "🔥",
    metric: (d) => d.bestStreak,
  },
  {
    id: "d_short_win",
    scope: "daily",
    title: "Urso lucrativo",
    description: "Lucre em 2 operações vendidas (short)",
    tip: "Mercado cai mais rápido do que sobe. Saber operar vendido dobra suas oportunidades.",
    target: 2,
    rewardXp: 55,
    rewardCoins: 15,
    icon: "🐻",
    metric: (d) => d.shortsWon,
  },
  {
    id: "d_scalp",
    scope: "daily",
    title: "Scalper",
    description: "Lucre em 2 operações com menos de 3 minutos de duração",
    tip: "Scalping exige execução rápida e custos baixos. Corretagem come scalpers vivos.",
    target: 2,
    rewardXp: 50,
    rewardCoins: 15,
    icon: "⚡",
    metric: (d) => d.fastWins,
  },
  {
    id: "d_diversify",
    scope: "daily",
    title: "Multi-mercado",
    description: "Opere 3 ativos diferentes no mesmo dia",
    tip: "Cada ativo tem personalidade. Conheça o ritmo antes de arriscar de verdade.",
    target: 3,
    rewardXp: 45,
    rewardCoins: 12,
    icon: "🌐",
    metric: (d) => d.symbolsTraded.length,
  },
  {
    id: "d_news_trade",
    scope: "daily",
    title: "Trader de notícias",
    description: "Lucre em 1 operação aberta até 1 minuto após uma notícia",
    tip: "Notícias geram volatilidade. Quem tem plano lucra; quem reage no impulso paga a conta.",
    target: 1,
    rewardXp: 60,
    rewardCoins: 20,
    icon: "📰",
    metric: (d) => d.newsTrades,
  },
  {
    id: "d_no_blowup",
    scope: "daily",
    title: "Gestão de risco",
    description: "Termine o dia positivo com drawdown máximo abaixo de R$ 800",
    tip: "Proteger o capital vem antes de multiplicá-lo. Drawdown de 50% exige 100% para recuperar.",
    target: 1,
    rewardXp: 90,
    rewardCoins: 30,
    icon: "📉",
    metric: (d) => (d.pnl > 0 && d.maxDrawdown < 800 && d.trades >= 2 ? 1 : 0),
  },
  // ---------- CAREER ----------
  {
    id: "c_trades_25",
    scope: "career",
    title: "Rodagem",
    description: "Feche 25 operações na carreira",
    tip: "Experiência se mede em trades, não em anos. Registre cada um no seu diário.",
    target: 25,
    rewardXp: 120,
    rewardCoins: 40,
    icon: "📒",
    metric: (_, c) => c.totalTrades ?? 0,
  },
  {
    id: "c_trades_100",
    scope: "career",
    title: "Veterano",
    description: "Feche 100 operações na carreira",
    tip: "Depois de 100 trades você começa a ver seus padrões — os bons e os ruins.",
    target: 100,
    rewardXp: 300,
    rewardCoins: 100,
    icon: "🎖️",
    metric: (_, c) => c.totalTrades ?? 0,
  },
  {
    id: "c_profit_5k",
    scope: "career",
    title: "Primeiros 5 mil",
    description: "Acumule R$ 5.000 de lucro líquido",
    tip: "Consistência > home run. Pequenos ganhos repetidos constroem contas grandes.",
    target: 5000,
    rewardXp: 200,
    rewardCoins: 60,
    icon: "💎",
    metric: (_, c) => Math.max(0, c.totalPnl ?? 0),
  },
  {
    id: "c_profit_25k",
    scope: "career",
    title: "Trader profissional",
    description: "Acumule R$ 25.000 de lucro líquido",
    tip: "Esse é o nível onde muitos largam o emprego. Não faça isso.",
    target: 25000,
    rewardXp: 600,
    rewardCoins: 200,
    icon: "👑",
    metric: (_, c) => Math.max(0, c.totalPnl ?? 0),
  },
  {
    id: "c_green_days_5",
    scope: "career",
    title: "Semana verde",
    description: "Termine 5 pregões no lucro",
    tip: "Dias verdes consecutivos vêm de rotina: pré-mercado, plano, execução, revisão.",
    target: 5,
    rewardXp: 250,
    rewardCoins: 80,
    icon: "🟢",
    metric: (_, c) => c.profitableDays ?? 0,
  },
  {
    id: "c_days_10",
    scope: "career",
    title: "Maratonista",
    description: "Complete 10 pregões",
    tip: "Sobreviver é a primeira meta de todo day trader. 90% quebram no primeiro ano.",
    target: 10,
    rewardXp: 200,
    rewardCoins: 70,
    icon: "📅",
    metric: (_, c) => c.daysPlayed ?? 0,
  },
  {
    id: "c_shopper",
    scope: "career",
    title: "Kit do trader",
    description: "Compre 3 itens na loja",
    tip: "Ferramentas ajudam, mas nenhum indicador substitui gestão de risco.",
    target: 3,
    rewardXp: 80,
    rewardCoins: 30,
    icon: "🛒",
    metric: (_, c) => c.itemsBought ?? 0,
  },
  {
    id: "c_big_win",
    scope: "career",
    title: "Tacada de mestre",
    description: "Feche uma única operação com lucro de R$ 1.500+",
    tip: "Deixe o lucro correr: mova o stop para o ponto de entrada e acompanhe a tendência.",
    target: 1500,
    rewardXp: 150,
    rewardCoins: 50,
    icon: "🚀",
    metric: (_, c) => c.maxWinPnl ?? 0,
  },
  {
    id: "c_stops_30",
    scope: "career",
    title: "Sempre protegido",
    description: "Abra 30 operações com stop loss",
    tip: "O stop é seu seguro. Não dirija sem cinto.",
    target: 30,
    rewardXp: 180,
    rewardCoins: 60,
    icon: "🧱",
    metric: (_, c) => c.tradesWithStop ?? 0,
  },
];

export const MISSION_MAP = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export function emptyDayStats(startBalance: number): DayStats {
  return {
    pnl: 0,
    trades: 0,
    wins: 0,
    losses: 0,
    stopsHit: 0,
    takesHit: 0,
    tradesWithStop: 0,
    maxDrawdown: 0,
    peakEquity: startBalance,
    startBalance,
    streak: 0,
    bestStreak: 0,
    shortsWon: 0,
    fastWins: 0,
    symbolsTraded: [],
    leveragedWins: 0,
    newsTrades: 0,
  };
}

// ---------- Levels ----------
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 90;
}

export function levelFromXp(totalXp: number): { level: number; into: number; need: number } {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level += 1;
  }
  return { level, into: remaining, need: xpToNext(level) };
}

export const LEVEL_TITLES = [
  "Sardinha",
  "Aprendiz",
  "Operador",
  "Scalper",
  "Swing Master",
  "Tubarão",
  "Gestor",
  "Lenda da Faria Lima",
];

export function levelTitle(level: number) {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, level - 1)];
}
