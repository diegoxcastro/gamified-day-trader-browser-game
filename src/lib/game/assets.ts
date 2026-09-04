import type { AssetDef } from "./types";

export const ASSETS: AssetDef[] = [
  {
    symbol: "PETR4",
    name: "Petrobras PN",
    basePrice: 38.5,
    volatility: 0.0022,
    tickSize: 0.01,
    lotSize: 100,
    unlockLevel: 1,
    category: "acoes",
    description: "Blue chip brasileira, sensível ao petróleo e à política.",
  },
  {
    symbol: "VALE3",
    name: "Vale ON",
    basePrice: 62.3,
    volatility: 0.002,
    tickSize: 0.01,
    lotSize: 100,
    unlockLevel: 1,
    category: "acoes",
    description: "Mineradora gigante. Segue o minério de ferro e a China.",
  },
  {
    symbol: "MGLU3",
    name: "Magazine Luiza ON",
    basePrice: 9.8,
    volatility: 0.0045,
    tickSize: 0.01,
    lotSize: 100,
    unlockLevel: 2,
    category: "acoes",
    description: "Varejo de alta volatilidade. Reage forte a juros.",
  },
  {
    symbol: "WINFUT",
    name: "Mini Índice Bovespa",
    basePrice: 128500,
    volatility: 0.0015,
    tickSize: 5,
    lotSize: 1,
    unlockLevel: 3,
    category: "futuros",
    description: "O queridinho dos day traders brasileiros. Cada ponto vale R$0,20.",
  },
  {
    symbol: "WDOFUT",
    name: "Mini Dólar",
    basePrice: 5120,
    volatility: 0.0012,
    tickSize: 0.5,
    lotSize: 1,
    unlockLevel: 4,
    category: "futuros",
    description: "Dólar futuro. Cada ponto vale R$10 — cuidado!",
  },
  {
    symbol: "BTCUSD",
    name: "Bitcoin",
    basePrice: 67400,
    volatility: 0.0035,
    tickSize: 1,
    lotSize: 0.01,
    unlockLevel: 5,
    category: "cripto",
    description: "Mercado 24/7 e volatilidade brutal. Alto risco, alta recompensa.",
  },
  {
    symbol: "EURUSD",
    name: "Euro / Dólar",
    basePrice: 1.085,
    volatility: 0.0006,
    tickSize: 0.0001,
    lotSize: 10000,
    unlockLevel: 6,
    category: "forex",
    description: "O par mais líquido do mundo. Movimentos pequenos, alavancagem alta.",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    basePrice: 118.5,
    volatility: 0.003,
    tickSize: 0.01,
    lotSize: 10,
    unlockLevel: 7,
    category: "acoes",
    description: "A rainha da IA. Sobe e desce com cada manchete sobre chips.",
  },
];

export const ASSET_MAP: Record<string, AssetDef> = Object.fromEntries(
  ASSETS.map((a) => [a.symbol, a]),
);

/** Value in R$ of a 1.0 price move per 1 unit of quantity. */
export function pointValue(symbol: string): number {
  switch (symbol) {
    case "WINFUT":
      return 0.2;
    case "WDOFUT":
      return 10;
    case "EURUSD":
      return 5.1; // ~R$ per pip-unit for a 1 unit contract, converted
    case "BTCUSD":
      return 5.1; // USD → BRL approx
    case "NVDA":
      return 5.1;
    default:
      return 1;
  }
}

/**
 * Intraday margin factor: brokers require only a fraction of the notional
 * as margin for day trades in futures/forex. Margin = notional / leverage / factor.
 */
export function intradayFactor(symbol: string): number {
  const a = ASSET_MAP[symbol];
  if (!a) return 1;
  if (a.category === "futuros") return 10;
  if (a.category === "forex") return 20;
  return 1;
}

/** Notional value in R$ of a position of `qty` at `price`. */
export function notional(symbol: string, qty: number, price: number): number {
  switch (symbol) {
    case "WINFUT":
      return qty * price * 0.2;
    case "WDOFUT":
      return qty * price * 10;
    default:
      return qty * price * pointValue(symbol);
  }
}

export function formatPrice(symbol: string, price: number): string {
  const a = ASSET_MAP[symbol];
  if (!a) return price.toFixed(2);
  if (a.tickSize >= 1) return price.toFixed(0);
  const decimals = Math.max(0, Math.ceil(-Math.log10(a.tickSize)));
  return price.toFixed(decimals);
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}
