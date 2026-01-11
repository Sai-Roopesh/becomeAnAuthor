"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  tinkerInstructionSchema,
  type TinkerInstructionFormData,
} from "@/shared/schemas/forms";
import { Editor } from "@tiptap/react";
import { useAI } from "@/hooks/use-ai";
import { ModelSelector } from "@/features/ai/components/model-selector";
import { X } from "lucide-react";
import type { EditorStateManager } from "@/lib/core/editor-state-manager";

interface TinkerModeProps {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sceneId: string;
  editorStateManager: EditorStateManager | null;
}

export function TinkerMode({
  editor,
  open,
  onOpenChange,
  editorStateManager,
}: TinkerModeProps) {
  const [streamingResult, setStreamingResult] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<TinkerInstructionFormData>({
    resolver: zodResolver(tinkerInstructionSchema),
    mode: "onChange",
  });

  const { generateStream, isGenerating, model, setModel, cancel } = useAI({
    system: `You are an expert creative writing editor specializing in custom text modifications.

MODIFICATION PRINCIPLES:
- Understand the intent: Interpret user instructions accurately
- Preserve tone: Match the original style unless instructed otherwise
- Show, don't tell: Use vivid sensory details
- Active voice: Prefer active constructions
- Clarity: Make every word count

COMMON MODIFICATIONS:
- "Make it more dramatic" → Heighten stakes, add tension, use shorter sentences
- "Add sensory details" → Include sight, sound, touch, smell, taste
- "Make it funnier" → Add wit, wordplay, or unexpected twists
- "Shorten" → Cut redundancy, keep strongest verbs
- "More formal/informal" → Adjust vocabulary and sentence structure

Follow the user's instructions precisely. Output only the modified text without explanation.`,
    persistModel: true,
    operationName: "Tinker Mode",
  });

  if (!editor) return null;

  const handleGenerate = async (data: TinkerInstructionFormData) => {
    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(
      selection.from,
      selection.to,
    );

    if (!selectedText) return;

    setStreamingResult("");

    await generateStream(
      {
        prompt: `TASK: ${data.instruction}

ORIGINAL TEXT:
"${selectedText}"

EXAMPLE:
Task: "Make this more dramatic"
Original: "He opened the door."
Modified: "His hand trembled on the knob. The door swung open—silence beyond, thick and waiting."

Now apply your task to the original text. Provide ONLY the modified text:`,
        maxTokens: 2000,
      },
      {
        onChunk: (chunk) => {
          setStreamingResult((prev) => prev + chunk);
        },
        onComplete: async (fullText) => {
          if (fullText) {
            const { from, to } = editor.state.selection;
            editor
              .chain()
              .focus()
              .insertContentAt({ from, to }, fullText)
              .run();

            if (editorStateManager) {
              await editorStateManager.saveImmediate();
            }
          }
          setStreamingResult("");
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  const handleCancel = () => {
    cancel();
    setStreamingResult("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85dvh] flex flex-col overflow-hidden">
        <form onSubmit={handleSubmit(handleGenerate)}>
          <DialogTitle>Tweak & Generate</DialogTitle>

          <div className="space-y-4 py-4">
            {/* Model Selector */}
            <div>
              <Label>Model</Label>
              <ModelSelector
                value={model}
                onValueChange={setModel}
                className="mt-2"
              />
            </div>

            {/* Instructions */}
            <div>
              <Label>Instructions</Label>
              <Textarea
                {...register("instruction")}
                placeholder="E.g., Make this more dramatic, Add more sensory details, Shorten while keeping the key points..."
                className="flex-1 mt-2"
                disabled={isGenerating}
              />
            </div>

            {/* Streaming Preview */}
            {isGenerating && streamingResult && (
              <div>
                <Label>Preview (streaming...)</Label>
                <div className="mt-2 p-3 bg-muted rounded-md flex-1 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">
                    {streamingResult}
                    <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!isGenerating ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!isValid || !model}>
                  Generate
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Generation
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
