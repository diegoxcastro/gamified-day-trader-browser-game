# Gamified Day Trader (browser game)

Jogo de day trading gamificado que roda no navegador. Next.js (App Router), React 19, Tailwind 4, Drizzle ORM e PostgreSQL. Grafico de candles com lightweight-charts, loja de upgrades, missoes, progresso persistido no banco e leaderboard.

## Rodando localmente

1. Instale as dependencias: `npm install`
2. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`
3. Crie as tabelas: `npx drizzle-kit push`
4. Inicie: `npm run dev` e abra http://localhost:3000

## Scripts

- `npm run dev`: desenvolvimento
- `npm run build` + `npm start`: producao
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript
