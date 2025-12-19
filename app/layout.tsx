import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/features/shared/components/ThemeProvider";
import { ErrorBoundary } from "@/features/shared/components/ErrorBoundary";
import { AppProvider } from '@/infrastructure/di/AppContext';
import { ClientToaster } from '@/components/client-toaster';
import { AppCleanup } from '@/components/app-cleanup';

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
              <AppCleanup />
              {children}
            </ErrorBoundary>
          </AppProvider>
        </ThemeProvider>
        <ClientToaster />
      </body>
    </html>
  );
}


