# CLAUDE.md — Finance Tracking Codebase Guide

This file provides AI assistants with the context needed to work effectively in this repository.

---

## Project Overview

**Personal Finance Tracker** — a full-stack Next.js application for tracking personal finances. Users upload CSV exports from their bank/credit card, which are automatically categorized using a locally-running Ollama LLM (Mistral), then stored in a local MySQL database. The app provides dashboards, budget tracking, income tracking, and spending analytics.

All data processing is **local-first** — no financial data is sent to external services.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TypeScript 5 |
| Styling | Tailwind CSS 3 + Radix UI (shadcn/ui) |
| Database | MySQL 8.0+ via `mysql2/promise` (connection pool) |
| AI / Categorization | Ollama (local) + Mistral model |
| Package Manager | pnpm |
| CSV Processing | Node.js scripts (not Next.js API routes) |

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

### Database Setup (run once)

```bash
# 1. Create DB and user
mysql -u root -p < sql/01_create_database.sql

# 2. Create tables
mysql -u finance_user -p finance_tracker < sql/02_create_tables.sql

# 3. (Optional) Load sample data
mysql -u finance_user -p finance_tracker < sql/03_sample_data.sql
```

### Required Environment Variables

Create a `.env` file at the root (not committed to git):

```
DB_HOST=localhost
DB_NAME=finance_tracker
DB_USER=finance_user
DB_PASSWORD=your_password
```

### Ollama Setup (required for AI categorization)

```bash
# Install and start Ollama, then pull the Mistral model
ollama pull mistral
# Ollama must be running at http://localhost:11434
```

---

## Directory Structure

```
finance-tracking/
├── app/
│   ├── api/                        # Next.js API route handlers
│   │   ├── categorize/route.ts     # LLM categorization endpoint
│   │   ├── budgets/route.ts        # Budget CRUD
│   │   ├── budgets/global/route.ts # Global (cross-month) budgets
│   │   ├── dashboard/route.ts      # Dashboard metrics aggregation
│   │   ├── income/route.ts         # Income CRUD
│   │   ├── months/route.ts         # Unique months across all tables
│   │   ├── savings/route.ts        # Savings CRUD
│   │   ├── transactions/route.ts   # Transaction CRUD
│   │   ├── transactions/[id]/route.ts  # Transaction update/delete by ID
│   │   ├── upload/route.ts         # CSV file upload + orchestration
│   │   └── upload/progress/route.ts    # In-memory upload progress store
│   ├── globals.css                 # Global Tailwind styles
│   ├── layout.tsx                  # Root layout (ThemeProvider + FinanceProvider + Toaster)
│   └── page.tsx                    # Root page with 4-tab layout
├── context/
│   └── finance-context.tsx         # FinanceProvider + useFinance() hook (shared state)
├── components/
│   ├── ui/                         # shadcn/ui primitives (DO NOT modify directly)
│   ├── dashboard-overview.tsx
│   ├── transaction-table.tsx       # Full transaction table with edit/delete
│   ├── transaction-modal.tsx       # Edit transaction modal
│   ├── upload-form.tsx             # CSV upload with bank type selection
│   ├── upload-progress-modal.tsx   # Real-time upload progress
│   ├── budget-panel.tsx
│   ├── budget-vs-actual-chart.tsx
│   ├── spending-chart.tsx
│   ├── spending-vs-budget-table.tsx
│   ├── monthly-trend-chart.tsx
│   ├── income-form.tsx
│   ├── category-badge.tsx
│   └── theme-provider.tsx
├── hooks/
│   ├── use-months.ts               # Thin wrappers that delegate to useFinance()
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   ├── types.ts                    # Canonical domain types (Transaction, Budget, etc.)
│   ├── api.ts                      # Pure functional client-side API service layer
│   ├── database.ts                 # OOP singleton DB pool + query() helper
│   ├── category-colors.ts          # Category → color mappings
│   └── utils.ts                    # cn() and misc utilities
├── scripts/                        # Standalone Node.js scripts (not bundled)
│   ├── categorize-csv.js           # LLM categorization via Ollama
│   ├── import-categorized-csv.js   # Import categorized CSV into MySQL
│   ├── process-and-import-csv.js   # Combined wrapper script
│   ├── check-database.js           # DB connectivity test
│   └── clear-database.js           # Dev/test cleanup
├── sql/
│   ├── 01_create_database.sql
│   ├── 02_create_tables.sql
│   └── 03_sample_data.sql
├── sample_transactions.csv         # AMEX format example data
└── uploads/                        # Runtime upload dir (gitignored)
```

---

## Architecture Overview

### OOP Layer: `lib/database.ts`

`DatabaseClient` is a **singleton class** that owns a `mysql2` connection pool.
Instead of creating one TCP connection per query (the old approach), the pool
reuses connections across requests — significantly faster under concurrent load.

```typescript
// Only the module-level function is exported; the class stays internal.
export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T>
export function convertDecimalToNumber(value: unknown): number
```

All API routes call `query()`. Never call `mysql.createConnection()` directly.

### Functional Layer: `lib/api.ts`

**Pure async functions** for every API endpoint. No React hooks, no side effects
beyond the HTTP call. Import these in client components instead of writing raw `fetch`.

```typescript
// Transactions
getTransactions(filters?)     → { transactions: Transaction[] }
createTransaction(data)       → { success, id }
updateTransaction(id, data)   → { success }
deleteTransaction(id)         → { success }

// Dashboard
getDashboard(month)           → DashboardData

// Months
getMonths()                   → { months: MonthOption[] }

// Budgets
getGlobalBudgets()            → { budgets: Budget[] }
saveGlobalBudget(cat, amount) → { success }

// Income
getIncome(month?)             → { income: IncomeEntry[] }
createIncome(data)            → { success, id }

// Savings
getSavings(month?)            → { savings: SavingsEntry[] }
createSavings(data)           → { success, id }
```

### Shared State: `context/finance-context.tsx`

`FinanceProvider` wraps the entire app (mounted in `app/layout.tsx`).
Every feature tab reads from the same context via `useFinance()`:

```typescript
const {
  selectedMonth,      // YYYY-MM — shared across Dashboard, Budget, Income, Transactions
  setSelectedMonth,
  months,             // MonthOption[] — fetched once, refreshed on demand
  monthsLoading,
  triggerRefresh,     // call after any mutation to invalidate all tab data
  refreshKey,         // pass as key= prop to force component remounts
} = useFinance()
```

**Why this matters for data consistency:** Previously each tab had its own
`useDefaultMonth()` call, meaning the Dashboard could be on January while Budget
showed March. Now all tabs share one `selectedMonth`.

### Type Contracts: `lib/types.ts`

All domain interfaces live here. Import types from this module to avoid drift:

```typescript
import type { Transaction, Budget, BudgetItem, IncomeEntry, SavingsEntry,
              MonthOption, DashboardMetrics, CategorySpending, DashboardData } from '@/lib/types'
```

---

## Database Schema

### `transactions`
| Column | Type | Notes |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| date | DATE | |
| description | VARCHAR(500) | Raw transaction description |
| amount | DECIMAL(10,2) | Always negative for expenses |
| category | VARCHAR(100) | One of 10 standard categories |
| bank | VARCHAR(50) | e.g. `amex`, `bofa` |
| month | VARCHAR(7) | Format: `YYYY-MM` |
| llmCategorized | BOOLEAN | Whether Ollama assigned the category |
| created_at | TIMESTAMP | |

Indexes on: `month`, `category`, `date`

### `budgets`
| Column | Type | Notes |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| category | VARCHAR(100) | |
| budgeted | DECIMAL(10,2) | |
| month | VARCHAR(7) | Empty string `''` for global budgets |
| created_at | TIMESTAMP | |

> **Important:** The `budgets` table does NOT have `spent` or `remaining` columns.
> Those values are computed at runtime by joining with `transactions`. Never try
> to INSERT or UPDATE `spent`/`remaining` in this table.

### `income`
| Column | Type | Notes |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| month | VARCHAR(7) | `YYYY-MM` |
| amount | DECIMAL(10,2) | |
| type | VARCHAR(100) | e.g. `salary`, `freelance` |
| description | VARCHAR(500) | |
| created_at | TIMESTAMP | |

### `savings`
| Column | Type | Notes |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| month | VARCHAR(7) | `YYYY-MM` |
| amount | DECIMAL(10,2) | |
| type | VARCHAR(100) | e.g. `emergency_fund`, `401k` |
| description | VARCHAR(500) | |
| created_at | TIMESTAMP | |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/transactions` | List transactions (query: `month`, `category`, `limit`) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/[id]` | Update transaction fields |
| DELETE | `/api/transactions/[id]` | Delete transaction |
| GET | `/api/dashboard` | Aggregated dashboard metrics (query: `month`) |
| GET | `/api/months` | Unique months across all tables, newest first |
| GET | `/api/budgets` | List budgets (query: `month`) |
| POST | `/api/budgets` | Create/update budget (only stores `month`, `category`, `budgeted`) |
| GET | `/api/budgets/global` | List global (cross-month) budgets |
| POST | `/api/budgets/global` | Upsert global budget for a category |
| GET | `/api/income` | List income entries (query: `month`) |
| POST | `/api/income` | Create income entry |
| GET | `/api/savings` | List savings entries (query: `month`) |
| POST | `/api/savings` | Create savings entry |
| POST | `/api/upload` | Upload CSV file; triggers categorization pipeline |
| GET | `/api/upload/progress` | Poll upload progress by `uploadId` |
| POST | `/api/categorize` | (Internal) LLM categorization endpoint |

---

## Spending Categories

These are the **exact** 10 category strings used throughout the codebase. Always use them verbatim:

1. `Food & Drink`
2. `Groceries`
3. `Transportation`
4. `Lifestyle & Entertainment`
5. `Shopping`
6. `Subscriptions`
7. `Health & Wellness`
8. `Gifts & Donations`
9. `Travel`
10. `Miscellaneous`

Category→color mappings are in `lib/category-colors.ts`.

---

## CSV Upload Data Flow

```
User uploads CSV (AMEX or BofA format)
        ↓
POST /api/upload
  → saves file to uploads/
  → spawns scripts/categorize-csv.js (child process)
        ↓
categorize-csv.js
  → detects bank type (AMEX / BofA)
  → cleans descriptions
  → calls Ollama (Mistral) per transaction
  → writes categorized CSV to uploads/
  → updates progress via POST /api/upload/progress
        ↓
import-categorized-csv.js
  → reads categorized CSV
  → deduplicates against existing DB records
  → inserts new transactions into MySQL
        ↓
Frontend polls GET /api/upload/progress
  → shows real-time progress modal
  → calls triggerRefresh() on completion → all tabs update
```

**Supported bank formats:**
- **AMEX**: columns — Date, Description, Amount, Extended Details, Appears On Your Statement As, Address, City/State, Zip Code, Country, Reference, Category, Note
- **BofA**: columns — Date, Description, Amount, Running Bal.

---

## Key Code Conventions

### TypeScript / React
- All feature components use `"use client"` at the top
- Domain types are imported from `@/lib/types` — never redeclare them inline
- API calls use functions from `@/lib/api` — never write raw `fetch()` in components
- Shared month/refresh state comes from `useFinance()` — never from `useDefaultMonth()` (deprecated wrapper)
- `useCallback` for callbacks passed to child components
- `Suspense` boundaries around lazily-loaded tabs in `app/page.tsx`

### Path Aliases
Use `@/` for all internal imports (maps to repo root):
```typescript
import { query } from '@/lib/database'
import { getTransactions } from '@/lib/api'
import type { Transaction } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/context/finance-context'
```

### Database Queries
Always use the `query()` helper from `lib/database.ts`. Use typed generics:
```typescript
import { query, convertDecimalToNumber } from '@/lib/database'

const rows = await query<MyRowType[]>('SELECT * FROM transactions WHERE month = ?', [month])
// MySQL DECIMALs come back as strings — use convertDecimalToNumber()
```

### API Route Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const rows = await query('SELECT ...', [month])
    return NextResponse.json(rows)
  } catch (error) {
    console.error('...:', error)
    return NextResponse.json({ error: 'Failed to ...' }, { status: 500 })
  }
}
```

### Amount Convention
Transaction amounts are **always stored as negative numbers** for expenses (e.g., `-42.50`). The API normalizes amounts on POST. Income and savings amounts are positive.

### Month Format
Months are stored and queried as `YYYY-MM` strings (e.g., `2024-01`). Display formatting to `"January 2024"` happens in the API (`/api/months`) and components.

### Styling
- Use `cn()` from `@/lib/utils` to merge Tailwind classes conditionally
- Dark mode is supported via CSS variables (`hsl(var(--background))` pattern)
- shadcn/ui components are in `components/ui/` — do not edit them directly; extend by wrapping
- Chart colors are defined as `--chart-1` through `--chart-5` CSS variables in `globals.css`

---

## Important Architectural Notes

1. **Progress tracking is in-memory** — `upload/progress/route.ts` uses a `Map`. This resets on server restart and is not suitable for multi-instance deployment.

2. **No test suite** — The project has no test files. Validate changes manually via the UI and `pnpm lint`.

3. **Build tolerates errors** — `next.config.mjs` sets `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true`. Don't rely on the build to catch type errors; run `tsc --noEmit` locally.

4. **Scripts run as child processes** — `scripts/` are plain Node.js (CommonJS, not ESM). They use `dotenv` to load `.env` and are spawned by the upload API route via `child_process.spawn`.

5. **No ORM** — Raw SQL via `mysql2`. Be careful with SQL injection; always use parameterized queries with `?` placeholders.

6. **`uploads/` directory** — Created at runtime and gitignored. The upload API expects it to exist; create it manually if missing (`mkdir uploads`).

7. **`spent` and `remaining` are never stored** — The `budgets` table only has `(id, category, budgeted, month, created_at)`. Budget utilization is always computed at runtime by joining with `transactions`.

---

## Development Workflow

When adding a new feature:

1. **New domain type** → add to `lib/types.ts`
2. **New API route** → create `app/api/<feature>/route.ts` following the existing pattern
3. **New client API function** → add to `lib/api.ts` following the pure-function pattern
4. **New component** → add to `components/<feature>.tsx` with `"use client"` if interactive; use `useFinance()` for month/refresh state
5. **New DB column** → add a migration SQL statement; update `lib/types.ts` accordingly
6. **New category** → update `lib/category-colors.ts` AND `scripts/categorize-csv.js` (the category list is duplicated there)
7. **Environment variable** → add to `.env`, document here and in `README.md`

---

## No Tests — Manual Validation Checklist

Since there is no test suite, after making changes verify:

- [ ] `pnpm lint` passes (or warnings are understood)
- [ ] `pnpm build` succeeds
- [ ] `pnpm dev` starts without errors
- [ ] Affected API routes return correct data in browser/curl
- [ ] Database queries execute correctly (check `scripts/check-database.js`)
- [ ] Upload flow works end-to-end with a sample CSV if upload code was changed
- [ ] Changing month on one tab is reflected immediately on other tabs (FinanceContext)
