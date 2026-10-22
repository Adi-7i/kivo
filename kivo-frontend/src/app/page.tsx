import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatInr } from "@/lib/formatters/currency";
import { formatDateDisplay } from "@/lib/formatters/date";
import { Info, CheckCircle2, ShieldCheck, Layers, Type, Palette, Component } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer>
        <AppNav />

        <main className="py-8 space-y-12">
          {/* Foundation Status Alert */}
          <Alert className="border-kivo-sage/60 bg-kivo-sage/10 text-foreground">
            <Info className="size-4 text-kivo-primary" />
            <AlertTitle className="font-semibold text-kivo-brand-dark dark:text-kivo-sage">
              Frontend Phase 1: Foundation & Architecture Ready
            </AlertTitle>
            <AlertDescription className="text-muted-foreground mt-1">
              This preview showcases the verified design system tokens, Plus Jakarta Sans
              typography, accessible shadcn/ui primitives, and typed API infrastructure. No
              financial ledger records are rendered; authentication and business workflows will be
              established in subsequent phases.
            </AlertDescription>
          </Alert>

          {/* Page Heading Section */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-semibold text-kivo-primary border-kivo-primary/30"
              >
                Design System v1.0
              </Badge>
              <span className="text-xs text-muted-foreground">
                Next.js 16.4.2 &bull; React 19 &bull; Tailwind CSS v4 &bull; Radix UI
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Kivo Global Design System
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Strictly engineered design tokens, integer-paise currency formatting,
              calendar-faithful date utilities, and accessible UI primitives for private personal
              finance management.
            </p>
          </section>

          <Separator />

          {/* Section 1: Brand & Semantic Palette */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-kivo-primary" />
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Color Palette & Financial Semantics
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Official Kivo Forest Green brand tokens and distinct semantic financial colors.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 shadow-xs">
                <div className="h-12 w-full rounded-lg bg-kivo-primary flex items-center justify-center text-white font-mono text-xs">
                  #3A5A40
                </div>
                <div>
                  <div className="text-xs font-semibold">Primary Green</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    --color-kivo-primary
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 shadow-xs">
                <div className="h-12 w-full rounded-lg bg-kivo-brand-dark flex items-center justify-center text-white font-mono text-xs">
                  #344E41
                </div>
                <div>
                  <div className="text-xs font-semibold">Brand Dark</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    --color-kivo-brand-dark
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 shadow-xs">
                <div className="h-12 w-full rounded-lg bg-kivo-secondary flex items-center justify-center text-white font-mono text-xs">
                  #588157
                </div>
                <div>
                  <div className="text-xs font-semibold">Secondary Green</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    --color-kivo-secondary
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 shadow-xs">
                <div className="h-12 w-full rounded-lg bg-kivo-sage flex items-center justify-center text-kivo-brand-dark font-mono text-xs font-semibold">
                  #A3B18A
                </div>
                <div>
                  <div className="text-xs font-semibold">Sage Accent</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    --color-kivo-sage
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 shadow-xs">
                <div className="h-12 w-full rounded-lg bg-kivo-stone flex items-center justify-center text-kivo-brand-dark font-mono text-xs font-semibold">
                  #DAD7CD
                </div>
                <div>
                  <div className="text-xs font-semibold">Warm Stone</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    --color-kivo-stone
                  </div>
                </div>
              </div>
            </div>

            {/* Semantic financial colors */}
            <div className="mt-4 pt-2">
              <h3 className="text-sm font-semibold mb-2 text-foreground">
                Semantic Financial Meaning
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                  <div className="h-7 w-full rounded-md bg-finance-income flex items-center justify-center text-white text-[11px] font-mono">
                    #2D6A4F
                  </div>
                  <div className="text-xs font-medium">Money Received</div>
                  <div className="text-[10px] text-muted-foreground">Inflows, allowances</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                  <div className="h-7 w-full rounded-md bg-finance-expense flex items-center justify-center text-white text-[11px] font-mono">
                    #B42318
                  </div>
                  <div className="text-xs font-medium">Personal Expenses</div>
                  <div className="text-[10px] text-muted-foreground">Outflows, purchases</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                  <div className="h-7 w-full rounded-md bg-finance-transfer flex items-center justify-center text-white text-[11px] font-mono">
                    #325E82
                  </div>
                  <div className="text-xs font-medium">Transfers</div>
                  <div className="text-[10px] text-muted-foreground">Account movements</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                  <div className="h-7 w-full rounded-md bg-finance-reserved flex items-center justify-center text-white text-[11px] font-mono">
                    #8F5E14
                  </div>
                  <div className="text-xs font-medium">Reserved / Pending</div>
                  <div className="text-[10px] text-muted-foreground">Rent, commitments</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                  <div className="h-7 w-full rounded-md bg-finance-neutral flex items-center justify-center text-white text-[11px] font-mono">
                    #5B685D
                  </div>
                  <div className="text-xs font-medium">Neutral</div>
                  <div className="text-[10px] text-muted-foreground">Audits, metadata</div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 2: Typography & Numeric Formatting */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Type className="size-5 text-kivo-primary" />
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Typography & Number Formatter Hierarchy
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Plus Jakarta Sans with tabular figures for numbers. Notice integer paise formatting
              below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Hierarchy Demonstration</CardTitle>
                  <CardDescription>Approved scale with tabular numerals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Page Heading (32px, 700)
                    </span>
                    <p className="text-2xl font-bold">Kivo Financial Suite</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Section Heading (20px, 600)
                    </span>
                    <p className="text-lg font-semibold">Monthly Expense Overview</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Body Copy (15px, 400)
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Precision money tracking with double-entry invariant verification and FIFO
                      fund attribution.
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Label & Metadata (12px, 500)
                    </span>
                    <p className="text-xs font-medium text-muted-foreground">
                      LAST RECONCILED: {formatDateDisplay("2026-10-17")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Integer-Paise INR Formatting
                  </CardTitle>
                  <CardDescription>
                    Strictly integer arithmetic — zero floating-point math
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/60 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Sample Balance Format (12,34,567 paise)
                    </span>
                    <div className="text-2xl font-bold font-tabular text-foreground">
                      {formatInr(1234567)}
                    </div>
                    <span className="text-[11px] text-muted-foreground italic">
                      *Demo placeholder using formatInr(1234567)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-md border border-border">
                      <div className="text-muted-foreground">Sample Inflow:</div>
                      <div className="font-semibold font-tabular text-finance-income">
                        {formatInr(5000000, { showSign: true })}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        formatInr(5000000)
                      </div>
                    </div>
                    <div className="p-2.5 rounded-md border border-border">
                      <div className="text-muted-foreground">Sample Outflow:</div>
                      <div className="font-semibold font-tabular text-finance-expense">
                        {formatInr(-184550)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        formatInr(-184550)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Section 3: UI Primitives */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Component className="size-5 text-kivo-primary" />
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                shadcn/ui Foundation Primitives
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Core interactive primitives configured with Kivo focus rings, states, and accessible
              semantics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Button Variants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Button Variants</CardTitle>
                  <CardDescription>
                    Primary, secondary, outline, destructive, and states
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="default">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button disabled variant="default">
                      Disabled
                    </Button>
                    <Button variant="outline" disabled>
                      <LoadingSpinner size="sm" className="mr-1.5" />
                      Loading
                    </Button>
                    <Button size="sm">Small</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Input & Form Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Inputs & Labels</CardTitle>
                  <CardDescription>Accessible form inputs with focus states</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-account">Account Identifier</Label>
                    <Input id="demo-account" placeholder="e.g. HDFC Salary Account" readOnly />
                    <span className="text-[11px] text-muted-foreground">
                      Standard text input primitive preview
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-amount">Amount (INR Decimal Input)</Label>
                    <Input id="demo-amount" placeholder="0.00" className="font-tabular" readOnly />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Section 4: Loading, Empty, and Feedback States */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-kivo-primary" />
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Loading & Empty State Patterns
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Predictable feedback patterns for async queries and empty lists.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Skeleton Loading Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Skeleton Preview</CardTitle>
                  <CardDescription>Card loading placeholder</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="pt-2 flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </CardContent>
              </Card>

              {/* Reusable Empty State */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Empty State Pattern</CardTitle>
                  <CardDescription>
                    Standard presentation when queries return zero results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={<ShieldCheck className="size-6 text-kivo-primary" />}
                    title="No Entries to Display"
                    description="This is a design preview of the shared EmptyState component."
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Section 5: Architecture Verification Matrix */}
          <section className="space-y-3 p-4 rounded-xl border border-border bg-card">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="size-4 text-finance-income" />
              Phase 1 Engineering Verification Matrix
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                <span className="font-semibold block text-foreground">Next.js 16.4.2</span>
                <span className="text-muted-foreground">App Router & TypeScript strict</span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                <span className="font-semibold block text-foreground">Forest Green Theme</span>
                <span className="text-muted-foreground">Tailwind CSS v4 CSS variables</span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                <span className="font-semibold block text-foreground">Native Fetch Transport</span>
                <span className="text-muted-foreground">Session credentials & CSRF</span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                <span className="font-semibold block text-foreground">TanStack Query v5</span>
                <span className="text-muted-foreground">Zero-retry mutation safety</span>
              </div>
            </div>
          </section>
        </main>
      </PageContainer>
    </div>
  );
}
