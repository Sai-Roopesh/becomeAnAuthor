"use client";

import { Button } from "@/components/ui/button";
import { useProjectStore, ViewMode } from "@/store/use-project-store";
import {
  LayoutTemplate,
  PenTool,
  MessageSquare,
  Home,
  Search,
} from "lucide-react";
import { SettingsDialog } from "../../settings/components/SettingsDialog";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortcuts } from "@/shared/utils/platform";

interface TopNavigationProps {
  onOpenSearch?: () => void;
}

export function TopNavigation({ onOpenSearch }: TopNavigationProps) {
  const { viewMode, setViewMode } = useProjectStore();

  const modes: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: "plan", label: "Plan", icon: LayoutTemplate },
    { id: "write", label: "Write", icon: PenTool },
    { id: "chat", label: "Chat", icon: MessageSquare },
  ];

  const handleModeChange = (mode: ViewMode) => setViewMode(mode);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border-b bg-background px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {/* Home Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="mr-1 sm:mr-2">
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Home</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Back to Dashboard</TooltipContent>
            </Tooltip>

            <div className="mr-1 h-6 w-px bg-border sm:mr-2" />

            {modes.map((mode) => (
              <Button
                key={mode.id}
                variant={viewMode === mode.id ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange(mode.id)}
                className="gap-2"
              >
                <mode.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{mode.label}</span>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {onOpenSearch && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={onOpenSearch}
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden md:inline">Search</span>
                    <kbd className="hidden xl:inline-flex rounded bg-muted px-1.5 py-0.5 text-2xs font-mono text-muted-foreground">
                      {shortcuts.search.display}
                    </kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search manuscript and codex</TooltipContent>
              </Tooltip>
            )}
            <SettingsDialog />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
