"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle, Position } from "@/lib/game/types";
import { sma, ema, bollinger, rsi, vwapSeries } from "@/lib/game/market";
import { ASSET_MAP, formatPrice } from "@/lib/game/assets";

export interface ChartMarker {
  time: number;
  side: "long" | "short" | "exit";
  text: string;
  win?: boolean;
}

export interface IndicatorToggles {
  sma: boolean;
  ema: boolean;
  bb: boolean;
  vwap: boolean;
  rsi: boolean;
}

interface Props {
  symbol: string;
  candles: Candle[];
  dayStartTime: number;
  indicators: IndicatorToggles;
  positions: Position[];
  markers: ChartMarker[];
  accent: string;
}

const UP = "#26a69a";
const DOWN = "#ef5350";

export default function TradingChart({
  symbol,
  candles,
  dayStartTime,
  indicators,
  positions,
  markers,
  accent,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbURef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiHiRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiLoRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markersApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const lastSymbolRef = useRef<string>("");
  const lastLenRef = useRef<number>(0);

  // Create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0e14" },
        textColor: "#9aa4b2",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        panes: { separatorColor: "#1f2733", separatorHoverColor: "#2a3441" },
      },
      grid: {
        vertLines: { color: "#151b24" },
        horzLines: { color: "#151b24" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1f2733", scaleMargins: { top: 0.08, bottom: 0.25 } },
      timeScale: {
        borderColor: "#1f2733",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 8,
      },
      localization: {
        timeFormatter: (t: Time) => {
          const d = new Date((t as number) * 1000);
          return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
        },
      },
      autoSize: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const mkLine = (color: string, width: 1 | 2 = 1, style = LineStyle.Solid, pane = 0) =>
      chart.addSeries(
        LineSeries,
        { color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false },
        pane,
      );

    smaRef.current = mkLine("#f5b942", 1);
    emaRef.current = mkLine("#42a5f5", 1);
    bbURef.current = mkLine("#ab47bc", 1, LineStyle.Dotted);
    bbLRef.current = mkLine("#ab47bc", 1, LineStyle.Dotted);
    bbMRef.current = mkLine("#ab47bc", 1, LineStyle.Dashed);
    vwapRef.current = mkLine("#ff7043", 2);

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volRef.current = vol;
    markersApiRef.current = createSeriesMarkers(candleSeries, []);
    lastSymbolRef.current = "";
    lastLenRef.current = 0;
    priceLinesRef.current = [];

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      rsiRef.current = null;
      rsiHiRef.current = null;
      rsiLoRef.current = null;
    };
  }, []);

  // RSI pane creation / removal
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (indicators.rsi && !rsiRef.current) {
      rsiRef.current = chart.addSeries(
        LineSeries,
        { color: "#ce93d8", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false },
        1,
      );
      rsiHiRef.current = chart.addSeries(
        LineSeries,
        { color: "#ef535066", lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false },
        1,
      );
      rsiLoRef.current = chart.addSeries(
        LineSeries,
        { color: "#26a69a66", lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false },
        1,
      );
      const panes = chart.panes();
      if (panes[1]) panes[1].setHeight(110);
    } else if (!indicators.rsi && rsiRef.current) {
      chart.removeSeries(rsiRef.current);
      if (rsiHiRef.current) chart.removeSeries(rsiHiRef.current);
      if (rsiLoRef.current) chart.removeSeries(rsiLoRef.current);
      rsiRef.current = null;
      rsiHiRef.current = null;
      rsiLoRef.current = null;
    }
  }, [indicators.rsi]);

  // Data updates
  useEffect(() => {
    const chart = chartRef.current;
    const cs = candleRef.current;
    const vol = volRef.current;
    if (!chart || !cs || !vol || candles.length === 0) return;

    const asset = ASSET_MAP[symbol];
    const symbolChanged = lastSymbolRef.current !== symbol;
    if (symbolChanged) {
      const precision = asset.tickSize >= 1 ? 0 : Math.ceil(-Math.log10(asset.tickSize));
      cs.applyOptions({ priceFormat: { type: "price", precision, minMove: asset.tickSize } });
    }

    const toBar = (c: Candle) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });
    const toVol = (c: Candle) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? "#26a69a55" : "#ef535055",
    });

    if (symbolChanged || Math.abs(candles.length - lastLenRef.current) > 2) {
      cs.setData(candles.map(toBar));
      vol.setData(candles.map(toVol));
      chart.timeScale().scrollToRealTime();
    } else {
      const n = candles.length;
      if (n >= 2 && n !== lastLenRef.current) {
        cs.update(toBar(candles[n - 2]));
        vol.update(toVol(candles[n - 2]));
      }
      cs.update(toBar(candles[n - 1]));
      vol.update(toVol(candles[n - 1]));
    }
    lastSymbolRef.current = symbol;
    lastLenRef.current = candles.length;

    const asLine = (arr: { time: number; value: number }[]) =>
      arr.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));

    smaRef.current?.setData(indicators.sma ? asLine(sma(candles, 9)) : []);
    emaRef.current?.setData(indicators.ema ? asLine(ema(candles, 21)) : []);
    if (indicators.bb) {
      const b = bollinger(candles, 20, 2);
      bbURef.current?.setData(asLine(b.upper));
      bbLRef.current?.setData(asLine(b.lower));
      bbMRef.current?.setData(asLine(b.mid));
    } else {
      bbURef.current?.setData([]);
      bbLRef.current?.setData([]);
      bbMRef.current?.setData([]);
    }
    vwapRef.current?.setData(indicators.vwap ? asLine(vwapSeries(candles, dayStartTime)) : []);
    if (rsiRef.current) {
      const r = rsi(candles, 14);
      rsiRef.current.setData(asLine(r));
      rsiHiRef.current?.setData(r.map((p) => ({ time: p.time as UTCTimestamp, value: 70 })));
      rsiLoRef.current?.setData(r.map((p) => ({ time: p.time as UTCTimestamp, value: 30 })));
    }
  }, [candles, symbol, indicators, dayStartTime]);

  // Position price lines
  useEffect(() => {
    const cs = candleRef.current;
    if (!cs) return;
    for (const pl of priceLinesRef.current) cs.removePriceLine(pl);
    priceLinesRef.current = [];
    for (const p of positions) {
      if (p.symbol !== symbol) continue;
      priceLinesRef.current.push(
        cs.createPriceLine({
          price: p.entryPrice,
          color: p.side === "long" ? UP : DOWN,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${p.side === "long" ? "COMPRA" : "VENDA"} ${p.qty}`,
        }),
      );
      if (p.stopLoss) {
        priceLinesRef.current.push(
          cs.createPriceLine({
            price: p.stopLoss,
            color: "#ff5252",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "STOP",
          }),
        );
      }
      if (p.takeProfit) {
        priceLinesRef.current.push(
          cs.createPriceLine({
            price: p.takeProfit,
            color: "#69f0ae",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "ALVO",
          }),
        );
      }
    }
  }, [positions, symbol]);

  // Markers
  useEffect(() => {
    const api = markersApiRef.current;
    if (!api) return;
    const ms: SeriesMarker<Time>[] = markers
      .slice()
      .sort((a, b) => a.time - b.time)
      .map((m) => ({
        time: m.time as UTCTimestamp,
        position: m.side === "long" ? "belowBar" : m.side === "short" ? "aboveBar" : "inBar",
        color: m.side === "long" ? UP : m.side === "short" ? DOWN : m.win ? "#ffd54f" : "#90a4ae",
        shape: m.side === "long" ? "arrowUp" : m.side === "short" ? "arrowDown" : "circle",
        text: m.text,
        size: 1,
      }));
    api.setMarkers(ms);
  }, [markers]);

  const last = candles[candles.length - 1];
  const first = candles.find((c) => c.time >= dayStartTime) ?? candles[0];
  const change = last && first ? ((last.close - first.open) / first.open) * 100 : 0;

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute left-3 top-2 z-10 flex flex-col gap-0.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">{symbol}</span>
          <span className="text-slate-400">· 1m · Trader Arena</span>
          {last && (
            <span className={`font-mono font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatPrice(symbol, last.close)} ({change >= 0 ? "+" : ""}
              {change.toFixed(2)}%)
            </span>
          )}
        </div>
        {last && (
          <div className="flex gap-3 font-mono text-[11px] text-slate-400">
            <span>A <span className={last.close >= last.open ? "text-emerald-400" : "text-red-400"}>{formatPrice(symbol, last.open)}</span></span>
            <span>M <span className={last.close >= last.open ? "text-emerald-400" : "text-red-400"}>{formatPrice(symbol, last.high)}</span></span>
            <span>m <span className={last.close >= last.open ? "text-emerald-400" : "text-red-400"}>{formatPrice(symbol, last.low)}</span></span>
            <span>F <span className={last.close >= last.open ? "text-emerald-400" : "text-red-400"}>{formatPrice(symbol, last.close)}</span></span>
          </div>
        )}
        <div className="flex gap-3 text-[11px]">
          {indicators.sma && <span style={{ color: "#f5b942" }}>SMA 9</span>}
          {indicators.ema && <span style={{ color: "#42a5f5" }}>EMA 21</span>}
          {indicators.bb && <span style={{ color: "#ab47bc" }}>BB 20,2</span>}
          {indicators.vwap && <span style={{ color: "#ff7043" }}>VWAP</span>}
        </div>
      </div>
      <div ref={containerRef} className="h-full w-full" style={{ borderTop: `2px solid ${accent}22` }} />
    </div>
  );
}
