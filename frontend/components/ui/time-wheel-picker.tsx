"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WorldEventTemporal } from "@/domain/entities/types";
import {
  daysInMonth,
  normalizeWorldEventTemporal,
  MIN_WORLD_YEAR,
  MAX_WORLD_YEAR,
} from "@/shared/utils/world-event-temporal";

const ITEM_HEIGHT = 40;
const SCROLL_SETTLE_MS = 120;
const VISIBLE_PADDING_ROWS = 2;

type WheelOption = {
  label: string;
  value: number;
};

interface WheelColumnProps {
  label: string;
  value: number;
  options: WheelOption[];
  onChange: (next: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildYearOptions(center: number, min: number, max: number): WheelOption[] {
  const start = clamp(center - 180, min, max);
  const end = clamp(center + 180, min, max);
  const options: WheelOption[] = [];
  for (let year = start; year <= end; year += 1) {
    options.push({ label: `${year}`, value: year });
  }
  return options;
}

function WheelColumn({ label, value, options, onChange }: WheelColumnProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const index = options.findIndex((option) => option.value === value);
    if (index < 0 || !scrollerRef.current) return;
    scrollerRef.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: "smooth",
    });
  }, [options, value]);

  const handleScroll = () => {
    if (!scrollerRef.current) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      if (!scrollerRef.current) return;
      const rawIndex = Math.round(scrollerRef.current.scrollTop / ITEM_HEIGHT);
      const index = clamp(rawIndex, 0, options.length - 1);
      const option = options[index];
      scrollerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: "smooth",
      });
      if (option && option.value !== value) {
        onChange(option.value);
      }
    }, SCROLL_SETTLE_MS);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="relative rounded-md border bg-background">
        <div
          ref={scrollerRef}
          className="h-52 overflow-y-auto snap-y"
          onScroll={handleScroll}
        >
          <div style={{ height: ITEM_HEIGHT * VISIBLE_PADDING_ROWS }} />
          {options.map((option) => (
            <button
              key={`${label}-${option.value}`}
              type="button"
              className={cn(
                "h-10 w-full snap-center text-center text-sm transition-colors",
                option.value === value
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
          <div style={{ height: ITEM_HEIGHT * VISIBLE_PADDING_ROWS }} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-none border-y bg-accent/30" />
      </div>
    </div>
  );
}

interface TimeWheelPickerProps {
  value: WorldEventTemporal;
  onChange: (value: WorldEventTemporal) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export function TimeWheelPicker({
  value,
  onChange,
  minYear = MIN_WORLD_YEAR,
  maxYear = MAX_WORLD_YEAR,
  className,
}: TimeWheelPickerProps) {
  const normalized = useMemo(() => normalizeWorldEventTemporal(value), [value]);

  const yearOptions = useMemo(
    () => buildYearOptions(normalized.year, minYear, maxYear),
    [normalized.year, minYear, maxYear],
  );

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 })),
    [],
  );

  const dayOptions = useMemo(
    () =>
      Array.from({ length: daysInMonth(normalized.year, normalized.month) }, (_, i) => ({
        label: `${i + 1}`,
        value: i + 1,
      })),
    [normalized.year, normalized.month],
  );

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ label: i.toString().padStart(2, "0"), value: i })),
    [],
  );

  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ label: i.toString().padStart(2, "0"), value: i })),
    [],
  );

  const update = (patch: Partial<WorldEventTemporal>) => {
    onChange(normalizeWorldEventTemporal({ ...normalized, ...patch }));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={normalized.precision === "year" ? "default" : "outline"}
          onClick={() => update({ precision: "year" })}
        >
          Year
        </Button>
        <Button
          type="button"
          size="sm"
          variant={normalized.precision === "date" ? "default" : "outline"}
          onClick={() => update({ precision: "date" })}
        >
          Date
        </Button>
        <Button
          type="button"
          size="sm"
          variant={normalized.precision === "date-time" ? "default" : "outline"}
          onClick={() => update({ precision: "date-time" })}
        >
          Date + Time
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <WheelColumn
          label="Year"
          value={normalized.year}
          options={yearOptions}
          onChange={(year) => update({ year })}
        />

        {normalized.precision !== "year" && (
          <>
            <WheelColumn
              label="Month"
              value={normalized.month}
              options={monthOptions}
              onChange={(month) => update({ month })}
            />
            <WheelColumn
              label="Day"
              value={normalized.day}
              options={dayOptions}
              onChange={(day) => update({ day })}
            />
          </>
        )}

        {normalized.precision === "date-time" && (
          <>
            <WheelColumn
              label="Hour"
              value={normalized.hour}
              options={hourOptions}
              onChange={(hour) => update({ hour })}
            />
            <WheelColumn
              label="Minute"
              value={normalized.minute}
              options={minuteOptions}
              onChange={(minute) => update({ minute })}
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Set exact year</span>
        <Input
          className="max-w-32"
          type="number"
          value={normalized.year}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            if (Number.isFinite(parsed)) {
              update({ year: parsed });
            }
          }}
        />
      </div>
    </div>
  );
}
