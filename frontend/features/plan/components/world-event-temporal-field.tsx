"use client";

import { useMemo, useState } from "react";
import type { WorldEventTemporal } from "@/domain/entities/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeWheelPicker } from "@/components/ui/time-wheel-picker";
import {
  formatWorldEventTemporal,
  normalizeWorldEventTemporal,
} from "@/shared/utils/world-event-temporal";

interface WorldEventTemporalFieldProps {
  value: WorldEventTemporal;
  onChange: (value: WorldEventTemporal) => void;
}

export function WorldEventTemporalField({
  value,
  onChange,
}: WorldEventTemporalFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = useMemo(() => normalizeWorldEventTemporal(value), [value]);
  const formatted = useMemo(
    () => formatWorldEventTemporal(normalized),
    [normalized],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          {formatted}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[95vw] max-w-3xl space-y-3 p-3" align="start">
        <div className="text-sm font-medium">Temporal Value</div>
        <div className="text-sm text-muted-foreground">{formatted}</div>
        <TimeWheelPicker value={normalized} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
