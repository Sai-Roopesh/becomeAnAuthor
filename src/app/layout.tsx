import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/features/shared/components/ThemeProvider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/features/shared/components/ErrorBoundary";
import { AppProvider } from '@/infrastructure/di/AppContext';

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster richColors position="bottom-right" />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
