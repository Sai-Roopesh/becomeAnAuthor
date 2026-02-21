"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIConnection, AI_VENDORS } from "@/lib/config/ai-vendors";
import { cn } from "@/lib/utils";
import { VendorLogo } from "@/features/shared/components/VendorLogo";

interface ConnectionListProps {
  connections: AIConnection[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}

export function ConnectionList({
  connections,
  selectedId,
  onSelect,
  onAddNew,
}: ConnectionListProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-card p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Connections</h4>
        <span className="text-xs text-muted-foreground">
          {connections.length}
        </span>
      </div>

      <ScrollArea className="h-[50dvh] max-h-[24rem]">
        <div className="space-y-2 pr-2">
          {connections.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No connections yet
            </div>
          ) : (
            connections.map((connection) => {
              const vendor = AI_VENDORS[connection.provider];

              return (
                <button
                  key={connection.id}
                  onClick={() => onSelect(connection.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                    selectedId === connection.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <div className="mb-1 flex min-w-0 items-center gap-2">
                    <VendorLogo providerId={connection.provider} size={20} />
                    <span className="truncate text-sm font-medium">
                      {connection.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="truncate text-muted-foreground">
                      {vendor.name}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5",
                        connection.enabled
                          ? "bg-green-500/20 text-green-700 dark:text-green-400"
                          : "bg-zinc-500/20 text-zinc-700 dark:text-zinc-400",
                      )}
                    >
                      {connection.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      <Button
        onClick={onAddNew}
        className="mt-3 w-full whitespace-normal text-center"
        variant="outline"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add New Connection
      </Button>
    </div>
  );
}
