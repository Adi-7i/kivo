import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Wallet } from "lucide-react";

interface AuthPageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthPageLayout({ children, title, subtitle }: AuthPageLayoutProps) {
  return (
    <div className="grid min-h-dvh min-w-0 bg-background lg:grid-cols-[minmax(20rem,0.85fr)_minmax(28rem,1.15fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between bg-kivo-brand-dark p-8 text-white lg:flex xl:p-12">
        <Link href="/" prefetch={false} className="inline-flex w-fit items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-kivo-sage text-xl font-bold text-kivo-brand-dark">
            K
          </span>
          <span className="text-2xl font-bold tracking-tight">Kivo</span>
        </Link>
        <div className="max-w-md space-y-5 py-8">
          <h1 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">{title}</h1>
          <p className="text-sm leading-relaxed text-kivo-stone">{subtitle}</p>
          <div className="space-y-4 border-t border-white/15 pt-6 text-sm text-kivo-stone">
            <p className="flex items-start gap-3">
              <Wallet className="mt-0.5 size-4 shrink-0 text-kivo-sage" />
              All your accounts, spending and plans in one place.
            </p>
            <p className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-kivo-sage" />
              Private by design. Your money stays in your hands.
            </p>
          </div>
        </div>
        <p className="text-xs text-kivo-stone">A clearer picture of your money.</p>
      </aside>
      <main className="flex min-w-0 flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        <Link
          href="/"
          prefetch={false}
          className="mb-6 flex w-full max-w-md items-center gap-2 font-bold text-kivo-brand-dark lg:hidden"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-kivo-primary text-lg text-white">
            K
          </span>
          <span className="text-lg">Kivo</span>
        </Link>
        <div className="w-full max-w-md min-w-0">{children}</div>
      </main>
    </div>
  );
}
