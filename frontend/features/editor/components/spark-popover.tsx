"use client";

/**
 * SparkPopover
 *
 * AI-powered writing prompts popover for the Spark Engine.
 * Shows context-aware prompts with model selection.
 * Uses tippy.js for reliable positioning above cursor.
 */

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { logger } from "@/shared/utils/logger";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";

const log = logger.scope("SparkPopover");

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  RefreshCw,
  Wand2,
  MessageCircle,
  Swords,
  Mountain,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generate, generateObject, getEnabledConnections } from "@/lib/ai";
import { storage } from "@/core/storage/safe-storage";
import type { AIConnection } from "@/lib/config/ai-vendors";

interface SparkPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number } | null;
  sceneContext?: string;
  onInsert: (text: string) => void;
}

type SparkCategory = "all" | "dialogue" | "action" | "description";

interface SparkPrompt {
  id: string;
  category: SparkCategory;
  text: string;
}

const CATEGORY_CONFIG = {
  all: { label: "All", icon: Sparkles },
  dialogue: { label: "Dialogue", icon: MessageCircle },
  action: { label: "Action", icon: Swords },
  description: { label: "Setting", icon: Mountain },
};

const SPARK_SYSTEM_PROMPT = `You are a creative writing assistant that generates short, evocative writing prompts.

Generate 4-5 unique, specific writing prompts based on the given context.
Each prompt should be 1-2 sentences that spark creativity.

Categorize each prompt as:
- dialogue: Character speech, conversation starters
- action: Physical actions, movements, events
- description: Settings, atmosphere, sensory details

Be specific, vivid, and actionable. Avoid clichés.`;

// Zod schema for structured output
const SparkPromptsSchema = z.array(
  z.object({
    category: z.enum(["dialogue", "action", "description"]),
    text: z.string(),
  }),
);

const SPARK_JSON_FALLBACK_PROMPT = `Return ONLY valid JSON (no markdown, no explanation).
Output exactly an array of 4-5 objects in this shape:
[
  { "category": "dialogue" | "action" | "description", "text": "prompt text" }
]`;

function mapSparkPrompts(
  items: Array<{
    category: "dialogue" | "action" | "description";
    text: string;
  }>,
): SparkPrompt[] {
  const timestamp = Date.now();
  return items.map((p, i) => ({
    id: `${timestamp}-${i}`,
    category: p.category,
    text: p.text,
  }));
}

function extractJsonArray(rawText: string): string | null {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] ?? rawText).trim();
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start < 0 || end <= start) {
    return null;
  }
  return candidate.slice(start, end + 1);
}

export const SparkPopover = memo(function SparkPopover({
  isOpen,
  onClose,
  position,
  sceneContext = "",
  onInsert,
}: SparkPopoverProps) {
  const [connections, setConnections] = useState<AIConnection[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [prompts, setPrompts] = useState<SparkPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SparkCategory>("all");
  const popoverRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<TippyInstance | null>(null);

  // Load connections and saved model on mount
  useEffect(() => {
    const enabledConnections = getEnabledConnections();
    setConnections(enabledConnections);

    // Load saved model preference
    const savedModel = storage.getItem<string>("spark_last_model", "");
    if (
      savedModel &&
      enabledConnections.some((c) => c.models?.includes(savedModel))
    ) {
      setSelectedModel(savedModel);
    } else if (
      enabledConnections.length > 0 &&
      enabledConnections[0]?.models?.[0]
    ) {
      setSelectedModel(enabledConnections[0]?.models?.[0] ?? "");
    }
  }, []);

  // Save model preference when changed
  useEffect(() => {
    if (selectedModel) {
      storage.setItem("spark_last_model", selectedModel);
    }
  }, [selectedModel]);

  const generatePrompts = useCallback(async () => {
    if (!selectedModel) {
      setError("Please select an AI model");
      return;
    }

    setIsLoading(true);
    setError(null);

    const contextPrompt = sceneContext
      ? `Based on this scene context:\n\n"${sceneContext.slice(-500)}"\n\nGenerate writing prompts that could continue or enhance this scene.`
      : "Generate general creative writing prompts for fiction.";

    try {
      const response = await generateObject({
        model: selectedModel,
        schema: SparkPromptsSchema,
        messages: [
          { role: "system", content: SPARK_SYSTEM_PROMPT },
          { role: "user", content: contextPrompt },
        ],
        maxTokens: 500,
        temperature: 0.8,
      });

      // Type-safe structured output - no JSON parsing needed
      setPrompts(mapSparkPrompts(response.object));
    } catch (err) {
      const isStructuredOutputError =
        err instanceof Error &&
        (err.name === "AI_NoObjectGeneratedError" ||
          err.message.toLowerCase().includes("no object generated") ||
          err.message.toLowerCase().includes("could not parse"));

      if (isStructuredOutputError) {
        try {
          log.warn(
            "Structured output failed, retrying Spark with JSON text fallback",
            err,
          );
          const fallbackResponse = await generate({
            model: selectedModel,
            messages: [
              {
                role: "system",
                content: `${SPARK_SYSTEM_PROMPT}\n\n${SPARK_JSON_FALLBACK_PROMPT}`,
              },
              { role: "user", content: contextPrompt },
            ],
            maxTokens: 600,
            temperature: 0.8,
          });

          const jsonArray = extractJsonArray(fallbackResponse.text ?? "");
          if (!jsonArray) {
            throw new Error("Model returned non-JSON content");
          }

          const parsed = JSON.parse(jsonArray) as unknown;
          const validated = SparkPromptsSchema.safeParse(parsed);
          if (!validated.success) {
            throw new Error("Model returned invalid prompt structure");
          }

          setPrompts(mapSparkPrompts(validated.data));
          return;
        } catch (fallbackErr) {
          log.error("Spark fallback generation error:", fallbackErr);
          setError(
            fallbackErr instanceof Error
              ? fallbackErr.message
              : "Failed to generate prompts",
          );
          return;
        }
      }

      log.error("Spark generation error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate prompts",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, sceneContext]);

  // Generate prompts when opened
  useEffect(() => {
    if (isOpen && selectedModel && prompts.length === 0) {
      generatePrompts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedModel]);

  // Set up tippy.js for positioning
  useEffect(() => {
    if (!popoverRef.current) return;

    const tippyInstance = tippy(document.body, {
      getReferenceClientRect: () => {
        if (!position) {
          return new DOMRect(-1000, -1000, 0, 0);
        }
        return new DOMRect(position.x, position.y, 0, 0);
      },
      appendTo: () => document.body,
      content: popoverRef.current,
      showOnCreate: false,
      interactive: true,
      trigger: "manual",
      placement: "bottom-start",
      offset: [0, 8],
      animation: "fade",
      duration: 150,
    });

    tippyRef.current = tippyInstance;

    return () => {
      tippyInstance.destroy();
      tippyRef.current = null;
    };
  }, [position]);

  // Show/hide tippy based on isOpen
  useEffect(() => {
    if (!tippyRef.current) return;

    if (isOpen && position) {
      tippyRef.current.setProps({
        getReferenceClientRect: () => new DOMRect(position.x, position.y, 0, 0),
      });
      tippyRef.current.show();
    } else {
      tippyRef.current.hide();
    }
  }, [isOpen, position]);

  const handleInsert = (prompt: SparkPrompt) => {
    onInsert(prompt.text);
    onClose();
  };

  const filteredPrompts =
    activeCategory === "all"
      ? prompts
      : prompts.filter((p) => p.category === activeCategory);

  // Get all models from all connections
  const allModels = useMemo(
    () => Array.from(new Set(connections.flatMap((c) => c.models || []))),
    [connections],
  );

  return (
    <div ref={popoverRef}>
      <Card className="w-popover-lg shadow-xl border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-muted border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="font-semibold">Spark Ideas</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Model Selector */}
        <div className="px-4 py-2 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                {allModels.map((model) => (
                  <SelectItem key={model} value={model} className="text-xs">
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={generatePrompts}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2 border-b flex gap-1.5">
          {(Object.keys(CATEGORY_CONFIG) as SparkCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const count =
              cat === "all"
                ? prompts.length
                : prompts.filter((p) => p.category === cat).length;

            return (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                className={cn(
                  "cursor-pointer text-xs px-2 py-0.5 h-6 gap-1",
                  activeCategory !== cat && "hover:bg-muted",
                )}
                onClick={() => setActiveCategory(cat)}
              >
                <Icon className="h-3 w-3" />
                {config.label}
                {count > 0 && <span className="opacity-60">({count})</span>}
              </Badge>
            );
          })}
        </div>

        {/* Prompts */}
        <div className="flex-1 overflow-y-auto max-h-64">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">
                Generating ideas...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={generatePrompts}>
                Try Again
              </Button>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="p-6 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {prompts.length === 0
                  ? "Click refresh to generate prompts"
                  : "No prompts in this category"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredPrompts.map((prompt) => {
                const Icon = CATEGORY_CONFIG[prompt.category]?.icon || Sparkles;
                return (
                  <button
                    key={prompt.id}
                    onClick={() => handleInsert(prompt)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/70 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                      <p className="text-sm leading-relaxed">{prompt.text}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/10 text-xs text-muted-foreground">
          Click a prompt to insert at cursor
        </div>
      </Card>
    </div>
  );
});
