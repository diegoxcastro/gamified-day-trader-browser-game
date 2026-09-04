export type ShopCategory = "indicadores" | "upgrades" | "poderes" | "visual";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ShopCategory;
  icon: string;
  requires?: string;
  consumable?: boolean;
  minLevel?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "ind_ema",
    name: "Média Móvel Exponencial (EMA 21)",
    description: "Plota a EMA de 21 períodos no gráfico. Ótima para identificar tendência de curto prazo.",
    price: 30,
    category: "indicadores",
    icon: "📈",
  },
  {
    id: "ind_vwap",
    name: "VWAP",
    description: "Preço médio ponderado por volume. O nível que os institucionais respeitam.",
    price: 35,
    category: "indicadores",
    icon: "⚖️",
  },
  {
    id: "ind_rsi",
    name: "RSI (14)",
    description: "Índice de Força Relativa. Acima de 70 = sobrecomprado, abaixo de 30 = sobrevendido.",
    price: 40,
    category: "indicadores",
    icon: "🌡️",
  },
  {
    id: "ind_bb",
    name: "Bandas de Bollinger",
    description: "Bandas de volatilidade (20, 2σ). Preço tocando a banda costuma reverter.",
    price: 50,
    category: "indicadores",
    icon: "🎚️",
  },
  {
    id: "orderbook",
    name: "Book de Ofertas",
    description: "Veja a profundidade do mercado: ordens de compra e venda em tempo real.",
    price: 30,
    category: "indicadores",
    icon: "📚",
  },
  {
    id: "lev_5",
    name: "Alavancagem 5x",
    description: "Desbloqueia alavancagem de até 5x. Multiplica ganhos... e perdas.",
    price: 80,
    category: "upgrades",
    icon: "🔧",
    minLevel: 2,
  },
  {
    id: "lev_10",
    name: "Alavancagem 10x",
    description: "Para os corajosos. 10x de alavancagem — liquidação a 10% contra.",
    price: 180,
    category: "upgrades",
    icon: "⚙️",
    requires: "lev_5",
    minLevel: 4,
  },
  {
    id: "fee_discount",
    name: "Corretora Zero",
    description: "Reduz suas taxas de corretagem em 60%. Scalpers agradecem.",
    price: 100,
    category: "upgrades",
    icon: "🏦",
  },
  {
    id: "capital_5k",
    name: "Aporte de R$ 5.000",
    description: "Injeção de capital na conta. Pode ser comprado várias vezes.",
    price: 90,
    category: "upgrades",
    icon: "💵",
    consumable: true,
  },
  {
    id: "insider",
    name: "Fonte no Mercado",
    description: "Um contato misterioso te avisa das notícias 5 minutos antes de saírem. (Isso seria crime na vida real!)",
    price: 220,
    category: "poderes",
    icon: "🕵️",
    minLevel: 3,
  },
  {
    id: "pause",
    name: "Botão de Pânico",
    description: "Permite pausar o mercado até 3x por pregão para pensar com calma.",
    price: 60,
    category: "poderes",
    icon: "⏸️",
  },
  {
    id: "insurance",
    name: "Seguro de Stop",
    description: "Uma vez por dia, o primeiro stop loss atingido é reembolsado em 50%.",
    price: 130,
    category: "poderes",
    icon: "☂️",
    minLevel: 2,
  },
  {
    id: "theme_gold",
    name: "Tema Ouro",
    description: "Interface dourada para quem já é lenda.",
    price: 70,
    category: "visual",
    icon: "✨",
  },
  {
    id: "theme_matrix",
    name: "Tema Matrix",
    description: "Verde neon. Você vê o código do mercado.",
    price: 70,
    category: "visual",
    icon: "🟩",
  },
];

export const SHOP_MAP = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));
