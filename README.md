# Khmere Botanical Intelligence

A private field-intelligence platform for Cambodian fragrance plant genetics, extraction chemistry, and commercial analysis.

Built for serious botanical research — not wellness, not retail. Think private lab meets family-office intelligence system.

---

## Stack

- **Next.js 16** — App Router
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Zustand 5** — client-side state (MVP; swap for Supabase server state in production)
- **Recharts 3** — dashboard charts
- **Supabase** — PostgreSQL + Auth + Storage (production)

---

## Quick Start (MVP / Demo Mode)

The MVP runs entirely client-side with Zustand + localStorage. No backend required.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and use any demo credential:

| Email | Role | Password |
|---|---|---|
| admin@khmere.co | Administrator | demo |
| collector@khmere.co | Field Collector | demo |
| analyst@khmere.co | Lab Analyst | demo |
| commercial@khmere.co | Commercial Reviewer | demo |

---

## Supabase Setup (Production)

### 1. Create a Supabase project

Go to supabase.com and create a new project.

### 2. Run the schema

In the Supabase SQL editor, paste and run:

```
supabase/schema.sql
supabase/seed.sql
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

### 4. Install Supabase client

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 5. Replace Zustand store with Supabase client

The store at `src/lib/store.ts` has a clear interface matching the database schema. Replace each action with a Supabase client call.

---

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated routes (sidebar + header)
│   │   ├── layout.tsx      # App shell
│   │   ├── dashboard/      # Main dashboard with 4 charts
│   │   ├── species/        # Species library
│   │   ├── samples/        # Field samples
│   │   ├── extractions/    # Extraction batches
│   │   ├── aroma/          # Aroma profiles
│   │   ├── chemistry/      # GC-MS results
│   │   └── commercial/     # Commercial scores
│   ├── login/              # Auth page
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/             # Sidebar, Header
│   ├── charts/             # Dashboard charts
│   └── ui/                 # Badge, Button, Card, ScoreBar
└── lib/
    ├── types.ts            # All TypeScript types
    ├── store.ts            # Zustand store + seed data bootstrap
    ├── seed-data.ts        # 6 Cambodian plant records
    ├── csv.ts              # CSV export/import
    └── utils.ts            # Helpers

supabase/
├── schema.sql              # Full PostgreSQL schema with RLS
└── seed.sql                # Initial data
```

---

## Modules

| Module | Path | Description |
|---|---|---|
| Dashboard | `/dashboard` | KPI cards + 4 analytics charts |
| Species Library | `/species` | Aromatic plant catalogue |
| Field Samples | `/samples` | Collection records with GPS + conditions |
| Extraction Batches | `/extractions` | Process parameters and yield data |
| Aroma Profiles | `/aroma` | Olfactory evaluation + note structure |
| GC-MS Chemistry | `/chemistry` | Compound identification and percentages |
| Commercial Scores | `/commercial` | 7-axis commercial viability scoring |

---

## User Roles

| Role | Species | Samples | Extractions | Aroma | Chemistry | Commercial | Delete |
|---|---|---|---|---|---|---|---|
| Admin | RW | RW | RW | RW | RW | RW | Yes |
| Field Collector | R | RW | R | R | R | R | No |
| Lab Analyst | RW | R | RW | RW | RW | R | No |
| Commercial Reviewer | R | R | R | R | R | RW | No |

---

## Plant Coverage

Six Cambodian aromatic species seeded by default:

1. **Rumduol** (*Mitrella mesnyi* / ក្រមួន) — Cambodia's national flower
2. **Sacred Lotus** (*Nelumbo nucifera* / ផ្កាប្ដំ) — Spiritual premium
3. **Ylang-Ylang** (*Cananga odorata* / ក្លាំងខ្លឹម) — Global commercial ingredient
4. **Siam Benzoin** (*Styrax tonkinensis* / ស្ត្រុការ) — Resin/fixative
5. **Patchouli** (*Pogostemon cablin* / ប៉ាចូលី) — Kampot terroir opportunity
6. **Ivy Gourd** (*Coccinia grandis* / ប្រែក) — Exploratory green-floral research

---

## Development Roadmap

### Phase 2
- [ ] Connect real Supabase auth
- [ ] Photo upload to Supabase Storage
- [ ] GPS map view of collection sites
- [ ] GC-MS compound library with NIST cross-reference
- [ ] CSV import for bulk data entry

### Phase 3
- [ ] Mobile PWA for field collectors (offline-first)
- [ ] PDF report generation per species/batch
- [ ] Seasonal harvest planning calendar
- [ ] Supplier and buyer CRM module

### Phase 4
- [ ] API access for partner labs
- [ ] Comparative analysis vs published GC-MS literature
- [ ] Geographical Indication tracking
- [ ] CITES/export compliance tracker

---

## Licence

Private and proprietary.

© 2024 Khmere Botanical Intelligence
