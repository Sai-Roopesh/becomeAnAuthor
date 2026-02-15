"use client";

import { Button } from "@/components/ui/button";
import { useProjectStore, ViewMode } from "@/store/use-project-store";
import { LayoutTemplate, PenTool, MessageSquare, Home } from "lucide-react";
import { SettingsDialog } from "../../settings/components/SettingsDialog";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getEnabledConnections } from "@/lib/ai";
import { toast } from "@/shared/utils/toast-service";

export function TopNavigation() {
  const { viewMode, setViewMode } = useProjectStore();

  const modes: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: "plan", label: "Plan", icon: LayoutTemplate },
    { id: "write", label: "Write", icon: PenTool },
    { id: "chat", label: "Chat", icon: MessageSquare },
  ];

  const handleModeChange = (mode: ViewMode) => {
    const hasAIConnection = getEnabledConnections().length > 0;
    if (mode === "chat" && !hasAIConnection) {
      toast.info(
        "AI is not configured. Click the settings button to add a connection.",
      );
      return;
    }
    setViewMode(mode);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-1">
          {/* Home Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Home</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Back to Dashboard</TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border mr-2" />

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
          <SettingsDialog />
        </div>
      </div>
    </TooltipProvider>
  );
}
