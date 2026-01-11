"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Zap,
  Settings,
  Cloud,
  Users,
  Share2,
  Lock,
  CreditCard,
  LogOut,
} from "lucide-react";

export type SettingsTab =
  | "ai-connections"
  | "general"
  | "backup"
  | "teams"
  | "shared"
  | "account"
  | "subscription";

interface NavItem {
  id: SettingsTab;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  separator?: "after";
}

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { id: "ai-connections", label: "AI Connections", icon: Zap },
  {
    id: "general",
    label: "General Settings",
    mobileLabel: "General",
    icon: Settings,
  },
  { id: "backup", label: "Backup", icon: Cloud },
  { id: "teams", label: "Teams", icon: Users },
  {
    id: "shared",
    label: "Shared with me",
    mobileLabel: "Shared",
    icon: Share2,
    separator: "after",
  },
  {
    id: "account",
    label: "Account / Security",
    mobileLabel: "Account",
    icon: Lock,
  },
  {
    id: "subscription",
    label: "Manage Subscription",
    mobileLabel: "Subscription",
    icon: CreditCard,
  },
];

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onLogout?: () => void;
}

/**
 * Mobile horizontal navigation for Settings
 */
export function SettingsMobileNav({
  activeTab,
  onTabChange,
}: SettingsNavigationProps) {
  return (
    <div className="md:hidden flex-shrink-0 border-b bg-secondary/30 overflow-x-auto">
      <div className="flex p-2 gap-2 min-w-max">
        {SETTINGS_NAV_ITEMS.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onTabChange(item.id)}
            className="whitespace-nowrap"
          >
            <item.icon className="h-4 w-4 mr-2" />
            {item.mobileLabel || item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Desktop sidebar navigation for Settings
 */
export function SettingsDesktopNav({
  activeTab,
  onTabChange,
  onLogout,
}: SettingsNavigationProps) {
  return (
    <div className="hidden md:flex w-64 border-r bg-secondary/30 flex-col flex-shrink-0">
      <div className="p-4 border-b bg-background">
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      <div className="flex-1 p-2 space-y-1 bg-secondary/30 overflow-y-auto">
        {SETTINGS_NAV_ITEMS.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                activeTab === item.id
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm">{item.label}</span>
            </button>
            {item.separator === "after" && <div className="my-2 border-t" />}
          </div>
        ))}

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
