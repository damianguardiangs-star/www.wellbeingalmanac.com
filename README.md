This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 24/7 Gap Intel (`/`, also `/intel`)

A 100-agent open-source intelligence watch on Indonesia, Thailand, Laos, Cambodia and Vietnam.

- **Agents** (`src/intel/agents.ts`): 5 countries × 20 roles. 19 collectors per country (weather, air quality,
  seismic, disasters, crime, security, politics, geopolitics, unrest, commodities, FX, shipping, transport,
  travel advisories, student safety, health, economy, cyber/scams, infrastructure & borders) plus 1 fusion lead.
- **Sources** (`src/intel/sources.ts`), all free and keyless: Google News RSS (Bing fallback), Open-Meteo forecast +
  air quality, USGS earthquakes, GDACS disaster alerts, open.er-api FX, US State Dept and UK FCDO advisories.
- **Agent bus / fusion** (`src/intel/fusion.ts`): collectors report to their country lead; leads corroborate the
  same event across disciplines, check cause→effect chains (hazard→shipping, unrest→students, geopolitics→markets)
  and task other agents; SEA-HQ raises cross-border alerts.
- **Knock-on effects** (`src/intel/impact.ts`): every significant incident is classed (storm, border confrontation,
  scam compounds, Mekong/dam, rice shock, unrest…) and pushed through a regional dependency model — borders, Mekong
  downstream flow, landlocked Laos' port dependence, Lao power exports, rice trade, migrant labour, scam trafficking
  routes, typhoon tracks, South China Sea — to predict effects on specific agents in the same country and abroad.
  Target agents get a heads-up, check the shared blackboard, and the most important unverified cross-border effects
  trigger targeted follow-up collection. Each effect is OBSERVED / CONFIRMED / PROJECTED / NOT SEEN, and every chain
  carries a geopolitical read. Inbound exposure feeds each country's risk score.
- **Map** (`src/components/intel/IntelMap.tsx`): every incident is plotted — exact coordinates for sensor feeds,
  gazetteer matches (`src/intel/gazetteer.ts`) for named places and border areas, dashed markers for country-level reports;
  knock-on arcs run from each incident to where its effects land (solid = verified, dashed = projected).
- **History & trends** (`src/intel/history.ts`, `src/intel/trends.ts`): every sweep is stored (Upstash Redis / Vercel KV
  if `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set, otherwise a local `.data/` file). Each country gets a risk time-series,
  24h change, rising/falling streaks and per-discipline escalation against its own 24h baseline; alerts show NEW / how long
  they've been active, and resolved alerts are listed. Big moves raise "Trend" alerts and task the relevant agents.
- **AI analyst** (`src/intel/analyst.ts`): with `ANTHROPIC_API_KEY` set, Claude (`claude-opus-5-5`, structured outputs)
  writes the regional bottom line and key judgements, per-country outlook and student/traveller guidance, an interpretation
  of each knock-on chain, and collection gaps that become searches by specific agents on the next sweep. Runs at most every
  `INTEL_AI_INTERVAL_MIN` minutes (default 30); falls back to the rule-based reads otherwise.
- **API**: `GET /api/intel` (cached 10 min), `GET /api/intel?refresh=1` forces a sweep (at most every 2 min).
  `GET /api/intel/sweep` with `Authorization: Bearer $CRON_SECRET` is for schedulers — `.github/workflows/intel-sweep.yml`
  calls it every 15 minutes once the `INTEL_SWEEP_URL` and `CRON_SECRET` repo secrets are set. See `.env.example`.
- The dashboard polls every 5 minutes and can raise browser notifications for new HIGH/CRITICAL fused alerts.
