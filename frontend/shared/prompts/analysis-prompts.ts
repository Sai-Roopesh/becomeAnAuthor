import { Scene, CodexEntry } from "@/domain/entities/types";

interface PromptContext {
  scenes: Scene[];
  codex: CodexEntry[];
}

export const SYNOPSIS_PROMPT = (context: PromptContext) => `
Analyze the following scenes and provide a synopsis.
Scenes: ${context.scenes.map(s => s.title).join(", ")}
`;

export const PLOT_THREADS_PROMPT = (context: PromptContext) => `
Analyze the plot threads in the following scenes.
Scenes: ${context.scenes.map(s => s.title).join(", ")}
`;

export const CHARACTER_ARCS_PROMPT = (context: PromptContext) => `
Analyze the character arcs in the following scenes.
Scenes: ${context.scenes.map(s => s.title).join(", ")}
`;

export const TIMELINE_PROMPT = (context: PromptContext) => `
Analyze the timeline consistency in the following scenes.
Scenes: ${context.scenes.map(s => s.title).join(", ")}
`;

export const CONTRADICTIONS_PROMPT = (context: PromptContext) => `
Analyze for contradictions in the following scenes.
Scenes: ${context.scenes.map(s => s.title).join(", ")}
`;

export const ALPHA_READER_PROMPT = (context: PromptContext) => `
Act as an alpha reader and provide feedback on the following scenes.
Scenes: ${context.scenes.map(s => s.title).join(", ")}
`;

export const BETA_READER_PROMPT = (context: PromptContext) => `
Act as a beta reader and provide feedback on the following scenes.
Scenes: ${context.scenes.map(s => s.title).join(", ")}
`;
