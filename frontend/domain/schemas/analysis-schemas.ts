import { z } from "zod";

export const SynopsisSchema = z.object({
  summary: z.string(),
  plotPoints: z.array(z.string()),
  themes: z.array(z.string()),
});

export const PlotThreadsSchema = z.object({
  threads: z.array(z.object({
    name: z.string(),
    setup: z.object({
      sceneIndex: z.number(),
      sceneTitle: z.string(),
      description: z.string(),
    }),
    development: z.array(z.object({
      sceneIndex: z.number(),
      note: z.string(),
    })),
    resolution: z.object({
      sceneIndex: z.number(),
      description: z.string(),
    }).nullable(),
    status: z.enum(["resolved", "unresolved"]),
    severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })),
});

export const CharacterArcsSchema = z.object({
  characters: z.array(z.object({
    name: z.string(),
    keyMoments: z.array(z.object({
      sceneIndex: z.number(),
      moment: z.string(),
    })),
    arcDescription: z.string(),
    arcStatus: z.enum(["complete", "incomplete"]),
    notes: z.string().optional(),
  })),
});

export const TimelineSchema = z.object({
  events: z.array(z.object({
    sceneIndex: z.number(),
    timeMarker: z.string().nullable(),
    timeElapsed: z.string().nullable(),
    event: z.string(),
  })),
  inconsistencies: z.array(z.object({
    type: z.enum(["contradiction", "unclear"]),
    sceneIndices: z.array(z.number()),
    description: z.string(),
    severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })),
});

export const ContradictionsSchema = z.object({
  contradictions: z.array(z.object({
    type: z.enum(["character", "world-building", "plot", "logic"]),
    sceneIndices: z.array(z.number()),
    description: z.string(),
    severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    suggestion: z.string().optional(),
  })),
});

export const AlphaReaderSchema = z.object({
  overallImpression: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.object({
    issue: z.string(),
    sceneIndices: z.array(z.number()).optional(),
    suggestion: z.string().optional(),
  })),
  questions: z.array(z.string()),
});

export const BetaReaderSchema = z.object({
  rating: z.number(),
  enjoyment: z.string(),
  characterFeedback: z.string(),
  worldBuilding: z.string(),
  dialogue: z.string(),
  emotionalImpact: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export const ANALYSIS_SCHEMAS = {
  "synopsis": SynopsisSchema,
  "plot-threads": PlotThreadsSchema,
  "character-arcs": CharacterArcsSchema,
  "timeline": TimelineSchema,
  "contradictions": ContradictionsSchema,
  "alpha-reader": AlphaReaderSchema,
  "beta-reader": BetaReaderSchema,
};

export type AnalysisType = keyof typeof ANALYSIS_SCHEMAS;
