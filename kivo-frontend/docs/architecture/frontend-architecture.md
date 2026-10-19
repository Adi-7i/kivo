# Kivo Frontend Architecture — Phase 1 Baseline

## 1. Architectural Philosophy & Boundaries

Kivo is a private, manual-entry personal finance and expense management application.
The frontend is architected as an **API-first presentation and client-state orchestration layer** built with **Next.js 16.4.2** (App Router), **TypeScript (Strict Mode)**, **Tailwind CSS v4**, and **shadcn/ui**.

### Sole Source of Truth

**The Django backend is the sole financial authority and source of truth.**
The frontend never executes or replicates:

- Competing ledgers or journal balance calculations.
- Fund allocation or FIFO attribution engines.
- Shared rent calculation engines or expense allocation logic.
- Floating-point financial math.

All monetary amounts are treated as **integer paise** (1 INR = 100 paise) or exact decimal strings received from the Django REST API.

---

## 2. Directory Layout & Module Structure

```text
kivo-frontend/
├── e2e/                           # Playwright end-to-end browser test suites
│   └── phase1.spec.ts
├── public/                        # Static assets (favicons, icons)
├── src/
│   ├── app/                       # Next.js App Router (pages, layouts, route boundaries)
│   │   ├── error.tsx              # Route error boundary
│   │   ├── globals.css            # Tailwind CSS v4 @theme & Kivo CSS design tokens
│   │   ├── layout.tsx             # Root layout with Plus Jakarta Sans & Providers
│   │   ├── not-found.tsx          # 404 handler
│   │   ├── page.tsx               # Phase 1 foundation & design system showcase
│   │   └── providers.tsx          # QueryClientProvider & Sonner Toaster
│   ├── components/
│   │   ├── layout/                # Global shell components (AppHeader, AppNav, PageContainer)
│   │   ├── shared/                # Cross-cutting UX components (LoadingSpinner, EmptyState, ErrorBoundary)
│   │   └── ui/                    # shadcn/ui accessible primitives (Button, Card, Input, Label, etc.)
│   ├── hooks/                     # Custom React and TanStack Query hooks
│   ├── lib/
│   │   ├── api/                   # API transport layer (client.ts, csrf.ts, errors.ts)
│   │   ├── config/                # Environment variable parsing (env.ts)
│   │   ├── formatters/            # Integer-paise currency (currency.ts) & calendar-safe date (date.ts)
│   │   └── utils/                 # Safe class composition (cn.ts)
│   ├── test/                      # Vitest unit & component test suites
│   │   ├── api/                   # Error normalization tests
│   │   ├── components/            # Primitive & shared component tests
│   │   ├── formatters/            # Currency and date utility tests
│   │   ├── setup.ts               # Testing library & jest-dom setup
│   │   └── utils/                 # Custom test render wrapper
│   └── types/                     # Shared TypeScript API envelope and utility types
├── components.json                # shadcn/ui configuration
├── eslint.config.mjs              # ESLint 9 flat configuration
├── next.config.ts                 # Next.js configuration
├── package.json                   # Dependencies and npm scripts
├── playwright.config.ts           # Playwright cross-browser configuration
├── pnpm-lock.yaml                 # Pinned pnpm dependency lockfile
├── prettier.config.mjs            # Code formatting rules
├── tsconfig.json                  # Strict TypeScript configuration
└── vitest.config.mts              # Vitest runner configuration
```

---

## 3. Server vs. Client Component Boundaries

Next.js App Router utilizes React Server Components (RSC) by default. Boundaries are kept strict:

1. **Server Components:**
   - Root `layout.tsx` (loads Google Font, metadata, global styles).
   - High-level layout pages (`page.tsx`, `not-found.tsx`).
   - Pure presentational wrappers (`PageContainer.tsx`, `AppHeader.tsx`, `AppNav.tsx`).
2. **Client Components (`"use client"`):**
   - `providers.tsx`: TanStack Query `QueryClientProvider` and Sonner `Toaster`.
   - `error.tsx`: Next.js client-side route error boundary.
   - `src/components/shared/ErrorBoundary.tsx`: React lifecycle error boundary.
   - Interactive UI primitives that use DOM event handlers or React state.

---

## 4. Design System Tokens & Typography

Defined in `src/app/globals.css` using Tailwind CSS v4 `@theme inline` variables:

### Brand Palette

- `--color-kivo-primary`: `#3A5A40` (Primary Forest Green)
- `--color-kivo-brand-dark`: `#344E41` (Deep Forest)
- `--color-kivo-secondary`: `#588157` (Secondary Leaf)
- `--color-kivo-sage`: `#A3B18A` (Sage Accent)
- `--color-kivo-stone`: `#DAD7CD` (Warm Stone)

### Semantic Financial Palette

- `--color-finance-income`: `#2D6A4F` (Money Received / Inflows)
- `--color-finance-expense`: `#B42318` (Personal Expenses / Outflows)
- `--color-finance-transfer`: `#325E82` (Account Transfers)
- `--color-finance-reserved`: `#8F5E14` (Reserved / Pending Liabilities)
- `--color-finance-neutral`: `#5B685D` (Neutral / Audits)

### Typography

- **Plus Jakarta Sans** loaded via `next/font/google`.
- Tabular numerals utility `.font-tabular` applies `font-variant-numeric: tabular-nums` to ensure exact column alignment for monetary figures.

---

## 5. API Transport & Security Baseline

Implemented in `src/lib/api/`:

- **Native Fetch API:** No Axios or external transport dependencies.
- **Session Credentials:** `credentials: "include"` enabled across all requests to exchange Django session cookies.
- **CSRF Protection:** Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) automatically query and attach the `X-CSRFToken` header from the backend (`GET /api/v1/auth/csrf/` or cookie).
- **Idempotency Keys:** `request()` supports the `idempotencyKey` parameter for safe network retries on financial writes.
- **Typed Error Hierarchy:** All HTTP and network errors normalize to `KivoApiError` subclasses (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `ServerError`, `TimeoutError`, `NetworkError`).
- **No Private Secrets in Frontend:** Only `NEXT_PUBLIC_API_URL` is exposed to the browser.
