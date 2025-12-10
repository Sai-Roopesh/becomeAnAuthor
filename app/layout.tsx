import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/features/shared/components/ThemeProvider";
import { ErrorBoundary } from "@/features/shared/components/ErrorBoundary";
import { AppProvider } from '@/infrastructure/di/AppContext';
import { ClientToaster } from '@/components/client-toaster';
import { AppCleanup } from '@/components/app-cleanup';
import { useAPIKeyMigration } from '@/hooks/use-api-key-migration';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "OpenSource Novel Writer",
  description: "Local-first AI writing assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProvider>
            <ErrorBoundary>
              <MigrationWrapper>
                {children}
              </MigrationWrapper>
            </ErrorBoundary>
          </AppProvider>
        </ThemeProvider>
        <ClientToaster />
      </body>
    </html>
  );
}

/**
 * Wrapper component to handle API key migration on mount
 * Runs migration in background without blocking UI
 */
function MigrationWrapper({ children }: { children: React.ReactNode }) {
  'use client';

  const { migrated } = useAPIKeyMigration();

  // Don't block rendering - migration happens in background
  return (
    <>
      <AppCleanup />
      {children}
    </>
  );
}
