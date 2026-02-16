"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Zap, Settings, Cloud, Users, LogOut } from "lucide-react";

export type SettingsTab = "ai-connections" | "general" | "backup" | "teams";

interface NavItem {
  id: SettingsTab;
  label: string;
  description: string;
  compactLabel?: string;
  icon: LucideIcon;
}

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    id: "ai-connections",
    label: "AI Connections",
    compactLabel: "AI",
    description: "Manage providers, models, and secure API keys.",
    icon: Zap,
  },
  {
    id: "general",
    label: "General Settings",
    compactLabel: "General",
    description: "Editor behavior, formatting defaults, and interface options.",
    icon: Settings,
  },
  {
    id: "backup",
    label: "Backup",
    compactLabel: "Backup",
    description: "Back up and restore local or cloud data safely.",
    icon: Cloud,
  },
  {
    id: "teams",
    label: "Teams",
    compactLabel: "Teams",
    description: "Collaboration room guidance and sync capabilities.",
    icon: Users,
  },
];

export function getSettingsTabMeta(tab: SettingsTab): NavItem {
  return (
    SETTINGS_NAV_ITEMS.find((item) => item.id === tab) ?? SETTINGS_NAV_ITEMS[0]!
  );
}

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onLogout?: () => void;
}

export function SettingsCompactNav({
  activeTab,
  onTabChange,
}: SettingsNavigationProps) {
  return (
    <div className="flex-shrink-0 overflow-x-auto">
      <div className="flex w-max min-w-full gap-2">
        {SETTINGS_NAV_ITEMS.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "outline"}
            size="sm"
            onClick={() => onTabChange(item.id)}
            className="whitespace-nowrap"
          >
            <item.icon className="h-4 w-4 mr-2" />
            {item.compactLabel || item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function SettingsSidebarNav({
  activeTab,
  onTabChange,
  onLogout,
}: SettingsNavigationProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-1">
        {SETTINGS_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full rounded-lg border px-3 py-3 text-left transition-colors",
              activeTab === item.id
                ? "border-primary/40 bg-primary/10"
                : "border-transparent hover:border-border hover:bg-muted/40",
            )}
          >
            <div className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.description}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-auto">
        <div className="my-2 border-t" />
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
        )}
      </div>
    </div>
  );
}
