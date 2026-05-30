import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/features/shared/components/ThemeProvider";
import { ErrorBoundary } from "@/features/shared/components/ErrorBoundary";
import { AppStateHydrator } from "@/features/shared/components/AppStateHydrator";
import { TauriGuard } from "@/features/shared/components/TauriGuard";
import { RootErrorFallback } from "@/features/shared/components/RootErrorFallback";
import { AppProvider } from "@/infrastructure/di/AppContext";
import { ToastProvider } from "@/components/toast-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateNotifier } from "@/features/updater/components/UpdateNotifier";

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
          <TauriGuard>
            <AppStateHydrator>
              <TooltipProvider delayDuration={300}>
                <AppProvider>
                  <ErrorBoundary name="Root" fallback={<RootErrorFallback />}>
                    {children}
                    <UpdateNotifier />
                  </ErrorBoundary>
                </AppProvider>
              </TooltipProvider>
            </AppStateHydrator>
          </TauriGuard>
        </ThemeProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
