import { ASSETS } from "./assets";
import type { AssetDef, Candle, NewsEvent } from "./types";

export const CANDLES_PER_DAY = 120;
export const CANDLE_MS = 2500;
export const TICKS_PER_CANDLE = 10;
export const TICK_MS = CANDLE_MS / TICKS_PER_CANDLE;
export const CANDLE_SECONDS = 60; // each candle represents 1 minute of "market time"
export const HISTORY_CANDLES = 80;

const NEWS_TEMPLATES: Record<
  string,
  { bull: string[]; bear: string[] }
> = {
  PETR4: {
    bull: [
      "Petróleo Brent dispara 4% após corte da OPEP+",
      "Petrobras anuncia dividendos extraordinários bilionários",
      "Descoberta de novo campo no pré-sal anima investidores",
    ],
    bear: [
      "Governo sinaliza intervenção na política de preços da Petrobras",
      "Brent despenca com temor de recessão global",
      "Rumores de troca no comando da estatal derrubam ações",
    ],
  },
  VALE3: {
    bull: [
      "Minério de ferro sobe forte em Dalian com estímulo chinês",
      "Vale supera estimativas de produção no trimestre",
      "China anuncia pacote de infraestrutura bilionário",
    ],
    bear: [
      "Minério cai 5% com dados fracos da indústria chinesa",
      "Justiça amplia indenização por Brumadinho",
      "Chuvas interrompem operações em Carajás",
    ],
  },
  MGLU3: {
    bull: [
      "Copom sinaliza corte de juros mais agressivo",
      "Magalu reporta lucro surpresa e ação dispara",
      "Vendas online crescem 30% no trimestre",
    ],
    bear: [
      "Inflação acima do esperado adia corte da Selic",
      "Magalu anuncia nova oferta de ações com desconto",
      "Concorrência asiática pressiona margens do varejo",
    ],
  },
  WINFUT: {
    bull: [
      "Ibovespa renova máxima histórica com fluxo estrangeiro",
      "Fitch eleva nota de crédito do Brasil",
      "Payroll fraco nos EUA anima mercados emergentes",
    ],
    bear: [
      "Risco fiscal: ruído em Brasília derruba a bolsa",
      "Treasuries disparam e pressionam emergentes",
      "S&P 500 abre em forte queda com temor de guerra comercial",
    ],
  },
  WDOFUT: {
    bull: [
      "Dólar dispara com aumento da aversão ao risco global",
      "Fed indica juros altos por mais tempo",
      "Incerteza fiscal leva investidores ao dólar",
    ],
    bear: [
      "Banco Central intervém com leilão de swaps",
      "Fluxo cambial positivo derruba o dólar",
      "Dólar cai com dados de inflação benignos nos EUA",
    ],
  },
  BTCUSD: {
    bull: [
      "ETF de Bitcoin registra entrada recorde de US$ 1 bi",
      "Grande banco anuncia custódia de cripto para clientes",
      "Halving impulsiona narrativa de escassez",
    ],
    bear: [
      "Exchange sofre hack de US$ 500 milhões",
      "SEC processa grande corretora de cripto",
      "Baleia move 10 mil BTC para exchange — mercado teme venda",
    ],
  },
  EURUSD: {
    bull: [
      "BCE mantém juros e surpreende com tom hawkish",
      "PMI da zona do euro supera expectativas",
      "Dólar enfraquece com dados fracos de emprego nos EUA",
    ],
    bear: [
      "Fed sinaliza mais altas e dólar ganha força",
      "PIB alemão contrai pelo segundo trimestre",
      "Crise política na França pressiona o euro",
    ],
  },
  NVDA: {
    bull: [
      "NVIDIA supera estimativas e eleva guidance de receita",
      "Nova geração de GPUs esgota em pré-venda",
      "Hyperscalers anunciam aumento de capex em IA",
    ],
    bear: [
      "EUA restringem exportação de chips para a China",
      "Concorrente anuncia chip 40% mais barato",
      "Investidores questionam retorno dos gastos em IA",
    ],
  },
};

const GLOBAL_NEWS = {
  bull: [
    "Fed corta juros em 50 pontos e mercados globais disparam",
    "Acordo comercial EUA-China surpreende e derruba aversão ao risco",
  ],
  bear: [
    "Flash crash: algoritmos derrubam mercados globais",
    "Tensão geopolítica dispara e investidores correm para proteção",
  ],
};

function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function roundTick(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

interface AssetSim {
  def: AssetDef;
  price: number;
  candles: Candle[];
  current: Candle;
  drift: number;
  volMult: number;
  shock: number; // remaining impact to apply
  shockTicks: number;
  vwapNum: number;
  vwapDen: number;
}

export interface MarketSnapshot {
  candles: Candle[];
  price: number;
  change: number; // fraction from day open
  dayOpen: number;
}

export class MarketEngine {
  private sims = new Map<string, AssetSim>();
  private tickInCandle = 0;
  public candleIndex = 0; // candles completed today
  public time: number; // unix seconds (sim)
  public news: NewsEvent[] = [];
  private scheduled: NewsEvent[] = [];
  private dayOpen = new Map<string, number>();

  constructor(day: number, lastPrices?: Record<string, number>) {
    // Sim date: start at 10:00 on a business day
    const base = Math.floor(Date.UTC(2025, 0, 6, 13, 0, 0) / 1000); // 10:00 BRT
    this.time = base + (day - 1) * 86400;
    for (const def of ASSETS) {
      const startPrice = lastPrices?.[def.symbol] ?? def.basePrice * (0.97 + Math.random() * 0.06);
      const sim: AssetSim = {
        def,
        price: startPrice,
        candles: [],
        current: {
          time: this.time,
          open: startPrice,
          high: startPrice,
          low: startPrice,
          close: startPrice,
          volume: 0,
        },
        drift: 0,
        volMult: 1,
        shock: 0,
        shockTicks: 0,
        vwapNum: 0,
        vwapDen: 0,
      };
      this.sims.set(def.symbol, sim);
      this.generateHistory(sim);
      this.dayOpen.set(def.symbol, sim.price);
    }
    this.scheduleNews();
  }

  private generateHistory(sim: AssetSim) {
    let t = this.time - HISTORY_CANDLES * CANDLE_SECONDS;
    let p = sim.price;
    let drift = 0;
    for (let i = 0; i < HISTORY_CANDLES; i++) {
      if (Math.random() < 0.08) drift = randn() * sim.def.volatility * 0.4;
      const o = p;
      let h = o;
      let l = o;
      for (let k = 0; k < TICKS_PER_CANDLE; k++) {
        p = p * (1 + drift / TICKS_PER_CANDLE + (randn() * sim.def.volatility) / Math.sqrt(TICKS_PER_CANDLE));
        h = Math.max(h, p);
        l = Math.min(l, p);
      }
      const c = roundTick(p, sim.def.tickSize);
      const vol = Math.round(500 + Math.random() * 1500 + (Math.abs(c - o) / o) * 200000);
      sim.candles.push({
        time: t,
        open: roundTick(o, sim.def.tickSize),
        high: roundTick(h, sim.def.tickSize),
        low: roundTick(l, sim.def.tickSize),
        close: c,
        volume: vol,
      });
      t += CANDLE_SECONDS;
    }
    sim.price = p;
    sim.current = { time: this.time, open: p, high: p, low: p, close: p, volume: 0 };
    sim.drift = drift;
  }

  private scheduleNews() {
    this.scheduled = [];
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const candleAt = 8 + Math.floor(Math.random() * (CANDLES_PER_DAY - 16));
      const isGlobal = Math.random() < 0.15;
      const bull = Math.random() < 0.5;
      const sentiment = bull ? "bull" : "bear";
      let symbol: string;
      let headline: string;
      if (isGlobal) {
        symbol = "ALL";
        const arr = GLOBAL_NEWS[sentiment];
        headline = arr[Math.floor(Math.random() * arr.length)];
      } else {
        const def = ASSETS[Math.floor(Math.random() * ASSETS.length)];
        symbol = def.symbol;
        const arr = NEWS_TEMPLATES[symbol][sentiment];
        headline = arr[Math.floor(Math.random() * arr.length)];
      }
      const magnitude = 0.008 + Math.random() * 0.022;
      this.scheduled.push({
        id: `n-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        time: candleAt,
        symbol,
        headline,
        impact: bull ? magnitude : -magnitude,
        sentiment,
      });
    }
    this.scheduled.sort((a, b) => a.time - b.time);
  }

  /** Returns upcoming news within `lookahead` candles (for the Insider item). */
  upcomingNews(lookahead: number): NewsEvent[] {
    return this.scheduled.filter(
      (n) => n.time > this.candleIndex && n.time <= this.candleIndex + lookahead,
    );
  }

  get isDayOver(): boolean {
    return this.candleIndex >= CANDLES_PER_DAY;
  }

  get progress(): number {
    return Math.min(1, (this.candleIndex + this.tickInCandle / TICKS_PER_CANDLE) / CANDLES_PER_DAY);
  }

  /** Advance one tick. Returns news that fired this tick. */
  tick(): NewsEvent[] {
    const fired: NewsEvent[] = [];
    if (this.isDayOver) return fired;

    // fire scheduled news at candle start
    if (this.tickInCandle === 0) {
      while (this.scheduled.length && this.scheduled[0].time <= this.candleIndex) {
        const n = this.scheduled.shift()!;
        const ev = { ...n, time: this.time };
        this.news.unshift(ev);
        fired.push(ev);
        const targets = n.symbol === "ALL" ? [...this.sims.values()] : [this.sims.get(n.symbol)!];
        for (const s of targets) {
          const scale = n.symbol === "ALL" ? (s.def.symbol === "WDOFUT" ? -0.6 : 0.6) : 1;
          s.shock += n.impact * scale;
          s.shockTicks = 6 + Math.floor(Math.random() * 6);
          s.volMult = Math.max(s.volMult, 2.2);
        }
      }
    }

    for (const s of this.sims.values()) {
      // regime changes
      if (Math.random() < 0.012) s.drift = randn() * s.def.volatility * 0.5;
      if (Math.random() < 0.03) s.volMult = Math.max(0.6, Math.min(3, s.volMult + randn() * 0.4));
      s.volMult += (1 - s.volMult) * 0.02; // decay to 1
      s.drift *= 0.995;

      let ret = s.drift / TICKS_PER_CANDLE + (randn() * s.def.volatility * s.volMult) / Math.sqrt(TICKS_PER_CANDLE);
      if (s.shockTicks > 0) {
        const part = s.shock / s.shockTicks;
        ret += part;
        s.shock -= part;
        s.shockTicks -= 1;
      }
      // slight mean reversion to session VWAP
      if (s.vwapDen > 0) {
        const vwap = s.vwapNum / s.vwapDen;
        ret += ((vwap - s.price) / s.price) * 0.004;
      }
      s.price = s.price * (1 + ret);
      const p = roundTick(s.price, s.def.tickSize);
      s.current.close = p;
      s.current.high = Math.max(s.current.high, p);
      s.current.low = Math.min(s.current.low, p);
      const v = Math.round(30 + Math.random() * 120 + Math.abs(ret) * 60000 * s.volMult);
      s.current.volume += v;
      s.vwapNum += p * v;
      s.vwapDen += v;
    }

    this.tickInCandle += 1;
    if (this.tickInCandle >= TICKS_PER_CANDLE) {
      this.tickInCandle = 0;
      this.candleIndex += 1;
      this.time += CANDLE_SECONDS;
      for (const s of this.sims.values()) {
        s.candles.push({ ...s.current });
        if (s.candles.length > 400) s.candles.shift();
        const p = s.current.close;
        s.current = { time: this.time, open: p, high: p, low: p, close: p, volume: 0 };
      }
    }
    return fired;
  }

  price(symbol: string): number {
    return this.sims.get(symbol)!.current.close;
  }

  lastPrices(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, s] of this.sims) out[k] = s.current.close;
    return out;
  }

  snapshot(symbol: string): MarketSnapshot {
    const s = this.sims.get(symbol)!;
    const open = this.dayOpen.get(symbol) ?? s.current.open;
    return {
      candles: [...s.candles, s.current],
      price: s.current.close,
      change: (s.current.close - open) / open,
      dayOpen: open,
    };
  }

  vwap(symbol: string): number | null {
    const s = this.sims.get(symbol)!;
    return s.vwapDen > 0 ? s.vwapNum / s.vwapDen : null;
  }

  /** Synthetic order book around current price. */
  orderBook(symbol: string, depth = 6): { bids: [number, number][]; asks: [number, number][] } {
    const s = this.sims.get(symbol)!;
    const t = s.def.tickSize;
    const p = s.current.close;
    const bids: [number, number][] = [];
    const asks: [number, number][] = [];
    for (let i = 1; i <= depth; i++) {
      bids.push([roundTick(p - i * t, t), Math.round(100 + Math.random() * 900 * (1 + i * 0.3))]);
      asks.push([roundTick(p + i * t, t), Math.round(100 + Math.random() * 900 * (1 + i * 0.3))]);
    }
    return { bids, asks };
  }
}

// ---------- Indicators ----------

export function sma(candles: Candle[], period: number) {
  const out: { time: number; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

export function ema(candles: Candle[], period: number) {
  const out: { time: number; value: number }[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i].close;
    prev = prev === null ? c : c * k + prev * (1 - k);
    if (i >= period - 1) out.push({ time: candles[i].time, value: prev });
  }
  return out;
}

export function rsi(candles: Candle[], period = 14) {
  const out: { time: number; value: number }[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      out.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
    }
  }
  return out;
}

export function bollinger(candles: Candle[], period = 20, mult = 2) {
  const upper: { time: number; value: number }[] = [];
  const lower: { time: number; value: number }[] = [];
  const mid: { time: number; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const mean = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (candles[j].close - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    upper.push({ time: candles[i].time, value: mean + mult * sd });
    lower.push({ time: candles[i].time, value: mean - mult * sd });
    mid.push({ time: candles[i].time, value: mean });
  }
  return { upper, lower, mid };
}

export function vwapSeries(candles: Candle[], fromTime: number) {
  const out: { time: number; value: number }[] = [];
  let num = 0;
  let den = 0;
  for (const c of candles) {
    if (c.time < fromTime) continue;
    const tp = (c.high + c.low + c.close) / 3;
    num += tp * c.volume;
    den += c.volume;
    if (den > 0) out.push({ time: c.time, value: num / den });
  }
  return out;
}
