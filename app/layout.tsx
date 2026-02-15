import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/features/shared/components/ThemeProvider";
import { ErrorBoundary } from "@/features/shared/components/ErrorBoundary";
import { AppProvider } from '@/infrastructure/di/AppContext';
import { ToastProvider } from '@/components/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

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
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={300}>
            <AppProvider>
              <ErrorBoundary>

                {children}
              </ErrorBoundary>
            </AppProvider>
          </TooltipProvider>
        </ThemeProvider>
        <ToastProvider />
      </body>
    </html>
  );
}

