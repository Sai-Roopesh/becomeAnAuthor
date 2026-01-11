"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder?: string;
  isGenerating?: boolean;
  onCancel?: () => void;
}

/**
 * Chat Input Component
 * Handles user message input and send action
 * Supports cancel during generation
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Ask anything...",
  isGenerating = false,
  onCancel,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Ctrl/Cmd + Enter
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 bg-transparent relative z-20">
      <div className="max-w-3xl mx-auto relative group">
        <div className="relative flex flex-col gap-2 bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg p-2 transition-all focus-within:shadow-xl focus-within:border-primary/20">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2 text-base"
          />

          <div className="flex justify-between items-center px-2 pb-1">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary/50" />
              <span>AI Assistant</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground hidden sm:inline-block">
                ⌘ + Enter to send
              </span>
              {isGenerating ? (
                <Button
                  onClick={onCancel}
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8 rounded-lg"
                  title="Cancel generation"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={onSend}
                  disabled={disabled || !value.trim()}
                  size="icon"
                  data-chat-send
                  className={cn(
                    "h-8 w-8 rounded-lg transition-all",
                    value.trim()
                      ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
