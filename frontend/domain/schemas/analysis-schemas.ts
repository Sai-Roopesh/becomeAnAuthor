/**
 * Zod Schemas for AI Analysis Results
 *
 * Used with generateObject to get type-safe structured output from AI.
 * Replaces manual JSON parsing in AnalysisService.
 */

import { z } from "zod";

// ============================================================================
// Synopsis Analysis
// ============================================================================

export const SynopsisSchema = z.object({
  summary: z.string().describe("2-3 sentence high-level summary"),
  plotPoints: z.array(z.string()).describe("Key plot points in order"),
  themes: z.array(z.string()).describe("Main themes identified"),
});

export type SynopsisResult = z.infer<typeof SynopsisSchema>;

// ============================================================================
// Plot Threads Analysis
// ============================================================================

const PlotThreadDevelopmentSchema = z.object({
  sceneIndex: z.number(),
  note: z.string(),
});

const PlotThreadSetupSchema = z.object({
  sceneIndex: z.number(),
  sceneTitle: z.string(),
  description: z.string(),
});

const PlotThreadResolutionSchema = z
  .object({
    sceneIndex: z.number(),
    description: z.string(),
  })
  .nullable();

const PlotThreadSchema = z.object({
  name: z.string(),
  setup: PlotThreadSetupSchema,
  development: z.array(PlotThreadDevelopmentSchema),
  resolution: PlotThreadResolutionSchema,
  status: z.enum(["resolved", "unresolved"]),
  severity: z.number().min(1).max(3),
});

export const PlotThreadsSchema = z.object({
  threads: z.array(PlotThreadSchema),
});

export type PlotThreadsResult = z.infer<typeof PlotThreadsSchema>;

// ============================================================================
// Character Arcs Analysis
// ============================================================================

const CharacterMomentSchema = z.object({
  sceneIndex: z.number(),
  moment: z.string(),
});

const CharacterArcSchema = z.object({
  name: z.string(),
  keyMoments: z.array(CharacterMomentSchema),
  arcDescription: z.string(),
  arcStatus: z.enum(["complete", "incomplete"]),
  notes: z.string().optional(),
});

export const CharacterArcsSchema = z.object({
  characters: z.array(CharacterArcSchema),
});

export type CharacterArcsResult = z.infer<typeof CharacterArcsSchema>;

// ============================================================================
// Timeline Analysis
// ============================================================================

const TimelineEventSchema = z.object({
  sceneIndex: z.number(),
  timeMarker: z.string().nullable(),
  timeElapsed: z.string().nullable(),
  event: z.string(),
});

const TimelineInconsistencySchema = z.object({
  type: z.enum(["contradiction", "unclear"]),
  sceneIndices: z.array(z.number()),
  description: z.string(),
  severity: z.number().min(1).max(3),
});

export const TimelineSchema = z.object({
  events: z.array(TimelineEventSchema),
  inconsistencies: z.array(TimelineInconsistencySchema),
});

export type TimelineResult = z.infer<typeof TimelineSchema>;

// ============================================================================
// Contradictions Analysis
// ============================================================================

const ContradictionSchema = z.object({
  type: z.enum(["character", "world-building", "plot", "logic"]),
  sceneIndices: z.array(z.number()),
  description: z.string(),
  severity: z.number().min(1).max(3),
  suggestion: z.string().optional(),
});

export const ContradictionsSchema = z.object({
  contradictions: z.array(ContradictionSchema),
});

export type ContradictionsResult = z.infer<typeof ContradictionsSchema>;

// ============================================================================
// Alpha Reader Analysis
// ============================================================================

const AlphaReaderConcernSchema = z.object({
  issue: z.string(),
  sceneIndices: z.array(z.number()).optional(),
  suggestion: z.string().optional(),
});

export const AlphaReaderSchema = z.object({
  overallImpression: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(AlphaReaderConcernSchema),
  questions: z.array(z.string()),
});

export type AlphaReaderResult = z.infer<typeof AlphaReaderSchema>;

// ============================================================================
// Beta Reader Analysis
// ============================================================================

export const BetaReaderSchema = z.object({
  rating: z.number().min(1).max(5),
  enjoyment: z.string(),
  characterFeedback: z.string(),
  worldBuilding: z.string(),
  dialogue: z.string(),
  emotionalImpact: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type BetaReaderResult = z.infer<typeof BetaReaderSchema>;

// ============================================================================
// Schema Map for Dynamic Selection
// ============================================================================

export const ANALYSIS_SCHEMAS = {
  synopsis: SynopsisSchema,
  "plot-threads": PlotThreadsSchema,
  "character-arcs": CharacterArcsSchema,
  timeline: TimelineSchema,
  contradictions: ContradictionsSchema,
  "alpha-reader": AlphaReaderSchema,
  "beta-reader": BetaReaderSchema,
} as const;

export type AnalysisType = keyof typeof ANALYSIS_SCHEMAS;
