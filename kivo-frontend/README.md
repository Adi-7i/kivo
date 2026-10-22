# Kivo — Frontend Web Application

The frontend client for **Kivo**, a private, manual-entry personal finance and expense management web application.

Built with **Next.js 16.4.2** (App Router), **React 19**, **TypeScript (Strict)**, **Tailwind CSS v4**, and **shadcn/ui**.

---

## 1. Confirmed Technology Stack

| Layer                    | Component                      | Version / Specification                          |
| ------------------------ | ------------------------------ | ------------------------------------------------ |
| **Framework**            | Next.js                        | 16.4.2 (App Router)                              |
| **UI Library**           | React                          | 19.3.0                                           |
| **Language**             | TypeScript                     | 5.9.3 (Strict mode, noUncheckedIndexedAccess)    |
| **Styling**              | Tailwind CSS                   | 4.3.3                                            |
| **Component System**     | shadcn/ui                      | 4.22.0 (Radix UI primitives)                     |
| **Typography**           | Plus Jakarta Sans              | `next/font/google` (Weights: 400, 500, 600, 700) |
| **State Management**     | TanStack Query                 | 5.104.3                                          |
| **Forms & Validation**   | React Hook Form & Zod          | RHF 7.90.0, Zod 4.6.7                            |
| **Date Utility**         | date-fns                       | 4.4.0 (UTC-shift resilient parsers)              |
| **Notifications**        | Sonner                         | 2.0.8                                            |
| **Icons**                | Lucide React                   | 1.58.0                                           |
| **Unit Testing**         | Vitest & React Testing Library | Vitest 5.0.5, RTL 16.3.3                         |
| **E2E Testing**          | Playwright                     | 1.64.1 (Chromium Desktop & Mobile)               |
| **Linting & Formatting** | ESLint & Prettier              | ESLint 9.39.5, Prettier 3.9.10                   |
| **Package Manager**      | pnpm                           | 12.10.1                                          |

---

## 2. Prerequisites & Setup

- **Node.js:** v24.x LTS (tested on v24.21.0)
- **pnpm:** 12.x+
- **Django Backend:** Running at `http://localhost:8000` (or configured via environment)

### Installation

```bash
# Navigate to the frontend directory
cd kivo-frontend

# Install dependencies using pnpm
pnpm install
```

### Environment Configuration

Copy the sample environment file to `.env.local`:

```bash
cp .env.example .env.local
```

Contents of `.env.local`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 3. Local Development Scripts

```bash
# Start Next.js development server (runs on port 3000)
pnpm run dev

# Execute strict TypeScript typecheck
pnpm run typecheck

# Run ESLint check
pnpm run lint

# Check code formatting with Prettier
pnpm run format:check

# Auto-format all files with Prettier
pnpm run format

# Run Vitest unit & component test suite (36 tests)
pnpm run test

# Run Playwright end-to-end browser tests (10 tests)
pnpm run test:e2e

# Build optimized production bundle
pnpm run build

# Start production server
pnpm run start
```

---

## 4. Architecture & Design System Overview

- **Forest Green Brand Palette:** `#3A5A40` (Primary), `#344E41` (Brand Dark), `#588157` (Secondary), `#A3B18A` (Sage), `#DAD7CD` (Stone).
- **Semantic Financial Colors:** `#2D6A4F` (Income), `#B42318` (Expenses), `#325E82` (Transfers), `#8F5E14` (Reserved), `#5B685D` (Neutral).
- **Exact Monetary Precision:** All money amounts are calculated and formatted in **integer paise** (1 INR = 100 paise) using `formatInr()`. Floating-point arithmetic is strictly prohibited.
- **Calendar-Safe Dates:** Date-only strings (`YYYY-MM-DD`) are parsed with noon local anchoring to avoid cross-timezone day shift bugs.
- **Django Auth Alignment:** The API client uses native `fetch` with `credentials: "include"` and automatically manages the `X-CSRFToken` header for state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).

Detailed architectural documentation: [docs/architecture/frontend-architecture.md](docs/architecture/frontend-architecture.md).

---

## 5. Phase 1 Scope & Boundaries

Phase 1 establishes the verified foundation:

- Next.js 16.4.2 App Router scaffold.
- Complete Kivo design tokens and typography.
- Foundational layout and accessible primitives.
- Centralized fetch transport with error normalization and CSRF handling.
- TanStack Query provider with financial zero-retry policies.
- Unit and browser E2E test suites.

> [!NOTE]
> Authentication workflows (login, register), user sessions, and domain financial features (accounts, transactions, budgets, rent, analytics) belong strictly to subsequent phases.
