"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIConnectionsTab } from "./ai-connections-tab";
import {
  getSettingsTabMeta,
  SettingsCompactNav,
  SettingsSidebarNav,
  type SettingsTab,
} from "./settings-navigation";
import { BackupTab, GeneralSettingsTab, TeamsTab } from "./tabs";

function ThemeControls({
  theme,
  setTheme,
}: {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        variant={theme === "light" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("light")}
        className="flex-1"
      >
        <Sun className="mr-1.5 h-3.5 w-3.5" />
        Light
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("dark")}
        className="flex-1"
      >
        <Moon className="mr-1.5 h-3.5 w-3.5" />
        Dark
      </Button>
    </div>
  );
}

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai-connections");
  const { theme, setTheme } = useTheme();
  const activeMeta = getSettingsTabMeta(activeTab);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Zap className="h-5 w-5" />
      </Button>

      <DialogContent
        aria-describedby={undefined}
        className="h-[min(94dvh,56rem)] w-[min(96vw,78rem)] !max-w-none overflow-hidden p-0"
      >
        <VisuallyHidden>
          <DialogTitle>Settings</DialogTitle>
        </VisuallyHidden>

        <div className="flex h-full min-h-0 min-w-0 flex-col xl:flex-row">
          <aside className="hidden w-[clamp(15rem,24vw,19rem)] shrink-0 border-r bg-muted/20 xl:flex xl:min-h-0 xl:flex-col">
            <div className="border-b px-5 py-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                Settings
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure your writing environment.
              </p>
            </div>

            <ScrollArea className="flex-1 px-3 py-3">
              <SettingsSidebarNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </ScrollArea>

            <div className="border-t p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Theme
              </p>
              <ThemeControls theme={theme} setTheme={setTheme} />
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            <header className="border-b px-4 py-4 md:px-6 md:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold md:text-xl">
                    {activeMeta.label}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeMeta.description}
                  </p>
                </div>
                <div className="w-[10rem] shrink-0 xl:hidden">
                  <ThemeControls theme={theme} setTheme={setTheme} />
                </div>
              </div>

              <div className="mt-4 xl:hidden">
                <SettingsCompactNav
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden">
              {activeTab === "ai-connections" && <AIConnectionsTab />}
              {activeTab === "general" && <GeneralSettingsTab />}
              {activeTab === "backup" && <BackupTab />}
              {activeTab === "teams" && <TeamsTab />}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
