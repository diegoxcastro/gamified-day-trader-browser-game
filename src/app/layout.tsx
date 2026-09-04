import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trader Arena — Simulador de Day Trade",
  description: "Jogo de day trade no navegador com gráfico estilo TradingView, missões, loja e ranking.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0b0e14] text-slate-200 antialiased">{children}</body>
    </html>
  );
}
