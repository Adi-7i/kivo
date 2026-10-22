import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kivo — Personal Money & Expense Management",
  description:
    "Private, manual-entry personal finance, budgeting, and living expense management application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} font-sans`}>
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
