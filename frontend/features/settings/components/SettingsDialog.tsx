"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Zap, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { AIConnectionsTab } from "./ai-connections-tab";
import { useTheme } from "next-themes";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  SettingsMobileNav,
  SettingsDesktopNav,
  type SettingsTab,
} from "./settings-navigation";
import {
  GeneralSettingsTab,
  BackupTab,
  TeamsTab,
  SharedTab,
  AccountTab,
  SubscriptionTab,
} from "./tabs";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai-connections");
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Zap className="h-5 w-5" />
      </Button>

      <DialogContent
        className="w-[95vw] md:max-w-5xl h-[85dvh] max-h-[85dvh] p-0 bg-background fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden"
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Settings</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col md:flex-row h-full bg-background overflow-hidden">
          {/* Mobile: Horizontal Scrolling Navigation */}
          <SettingsMobileNav activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Desktop: Sidebar Navigation */}
          <SettingsDesktopNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Theme Toggle - Desktop only */}
          <div className="hidden md:block absolute bottom-0 left-0 w-64 p-4 border-t bg-background border-r">
            <div className="text-xs text-muted-foreground mb-2">Theme:</div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="flex-1"
              >
                <Sun className="h-3 w-3 mr-1" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="flex-1"
              >
                <Moon className="h-3 w-3 mr-1" />
                Dark
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col bg-background overflow-hidden min-h-0">
            {activeTab === "ai-connections" && (
              <div className="flex-1 flex flex-col bg-background overflow-hidden min-h-0">
                <AIConnectionsTab />
              </div>
            )}

            {activeTab === "general" && <GeneralSettingsTab />}
            {activeTab === "backup" && <BackupTab />}
            {activeTab === "teams" && <TeamsTab />}
            {activeTab === "shared" && <SharedTab />}
            {activeTab === "account" && <AccountTab />}
            {activeTab === "subscription" && <SubscriptionTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
