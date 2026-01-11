/**
 * TippyPopover
 *
 * Standardized wrapper around tippy.js for consistent popover behavior.
 * Use this instead of Radix Popover for positioning-critical popovers.
 */

"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import tippy, {
  type Instance as TippyInstance,
  type Placement,
} from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/animations/shift-away.css";
import { cn } from "@/lib/utils";

interface TippyPopoverProps {
  /** The trigger element */
  children: ReactNode;
  /** The popover content */
  content: ReactNode;
  /** Whether the popover is open (controlled) */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Placement relative to trigger */
  placement?: Placement;
  /** Whether clicks inside popover should be allowed */
  interactive?: boolean;
  /** Offset from trigger [skidding, distance] */
  offset?: [number, number];
  /** CSS class for the popover container */
  className?: string;
  /** Maximum width */
  maxWidth?: number | string;
  /** Animation type */
  animation?: "fade" | "shift-away" | "scale" | false;
  /** Delay before showing [show, hide] */
  delay?: [number, number];
  /** Trigger type */
  trigger?: "click" | "mouseenter focus" | "manual";
  /** Append to element */
  appendTo?: Element | "parent" | (() => Element);
}

export function TippyPopover({
  children,
  content,
  open,
  onOpenChange,
  placement = "bottom",
  interactive = true,
  offset = [0, 8],
  className,
  maxWidth = 350,
  animation = "shift-away",
  delay = [0, 0],
  trigger = "click",
  appendTo,
}: TippyPopoverProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<TippyInstance | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize tippy
  useEffect(() => {
    if (!triggerRef.current || !contentRef.current) return;

    const instance = tippy(triggerRef.current, {
      content: contentRef.current,
      placement,
      interactive,
      offset,
      maxWidth,
      animation: animation === false ? false : animation || "shift-away",
      delay,
      trigger: open !== undefined ? "manual" : trigger,
      appendTo: appendTo || (() => document.body),
      onShow: () => {
        onOpenChange?.(true);
      },
      onHide: () => {
        onOpenChange?.(false);
      },
    });

    tippyRef.current = instance;
    setIsReady(true);

    return () => {
      instance.destroy();
      tippyRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update instance when props change
  useEffect(() => {
    if (!tippyRef.current) return;

    tippyRef.current.setProps({
      placement,
      interactive,
      offset,
      maxWidth,
    });
  }, [placement, interactive, offset, maxWidth]);

  // Handle controlled open state
  useEffect(() => {
    if (!tippyRef.current || open === undefined) return;

    if (open) {
      tippyRef.current.show();
    } else {
      tippyRef.current.hide();
    }
  }, [open]);

  return (
    <>
      <div ref={triggerRef} className="inline-block">
        {children}
      </div>
      <div
        ref={contentRef}
        className={cn(
          "bg-popover text-popover-foreground rounded-md border shadow-md",
          "outline-none",
          className,
        )}
        style={{ display: isReady ? undefined : "none" }}
      >
        {content}
      </div>
    </>
  );
}

/**
 * Hook for imperative tippy control
 */

export function useTippy() {
  const instanceRef = useRef<TippyInstance | null>(null);

  const show = () => instanceRef.current?.show();
  const hide = () => instanceRef.current?.hide();
  const toggle = () => {
    if (instanceRef.current?.state.isVisible) {
      hide();
    } else {
      show();
    }
  };

  return {
    instanceRef,
    show,
    hide,
    toggle,
  };
}
