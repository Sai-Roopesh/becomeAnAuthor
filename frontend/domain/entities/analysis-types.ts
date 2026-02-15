/**
 * AI Analysis Response Types
 * Strongly-typed interfaces for AI-generated story analysis responses
 */

import type { AnalysisInsight } from "./types";

// ============================================
// Plot Thread Analysis
// ============================================

export interface PlotThreadSetup {
  sceneIndex: number;
  sceneTitle: string;
  description: string;
}

export interface PlotThreadDevelopment {
  sceneIndex: number;
  note: string;
}

export interface PlotThread {
  name: string;
  setup: PlotThreadSetup;
  development: PlotThreadDevelopment[];
  resolution: { sceneIndex: number; description: string } | null;
  status: "resolved" | "unresolved";
  severity: 1 | 2 | 3;
}

export interface PlotThreadResponse {
  threads: PlotThread[];
}

// ============================================
// Character Arc Analysis
// ============================================

export interface CharacterKeyMoment {
  sceneIndex: number;
  moment: string;
}

export interface CharacterArc {
  name: string;
  keyMoments: CharacterKeyMoment[];
  arcDescription: string;
  arcStatus: "complete" | "incomplete";
  notes?: string;
}

export interface CharacterArcResponse {
  characters: CharacterArc[];
}

// ============================================
// Timeline Analysis
// ============================================

export interface TimelineEvent {
  sceneIndex: number;
  timeMarker: string | null;
  timeElapsed: string | null;
  event: string;
}

export interface TimelineInconsistency {
  type: "contradiction" | "unclear";
  sceneIndices: number[];
  description: string;
  severity: 1 | 2 | 3;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  inconsistencies: TimelineInconsistency[];
}

// ============================================
// Contradiction Analysis
// ============================================

export interface Contradiction {
  type: "character" | "world-building" | "plot" | "logic";
  sceneIndices: number[];
  description: string;
  severity: 1 | 2 | 3;
  suggestion?: string;
}

export interface ContradictionResponse {
  contradictions: Contradiction[];
}

// ============================================
// Alpha/Beta Reader Analysis
// ============================================

export interface ReaderConcern {
  issue: string;
  sceneIndices?: number[];
  suggestion?: string;
}

export interface AlphaReaderResponse {
  overallImpression: string;
  strengths: string[];
  concerns: ReaderConcern[];
  questions: string[];
}

export interface BetaReaderResponse {
  rating: number;
  enjoyment: string;
  characterFeedback: string;
  worldBuilding: string;
  dialogue: string;
  emotionalImpact: string[];
  recommendations: string[];
}

// ============================================
// Synopsis Analysis
// ============================================

export interface SynopsisResponse {
  summary: string;
  plotPoints: string[];
  themes: string[];
}

// ============================================
// Union type for all responses
// ============================================

export type AnalysisResponse =
  | PlotThreadResponse
  | CharacterArcResponse
  | TimelineResponse
  | ContradictionResponse
  | AlphaReaderResponse
  | BetaReaderResponse
  | SynopsisResponse;

// ============================================
// Parsed Analysis Result
// ============================================

export interface ParsedAnalysisResult {
  summary?: string;
  insights: AnalysisInsight[];
  metrics?: Record<string, number | string>;
}

// ============================================
// Analysis Metrics (replace Record<string, any>)
// ============================================

export interface AnalysisMetrics {
  wordCount?: number;
  sceneCount?: number;
  characterCount?: number;
  threadCount?: number;
  resolvedThreads?: number;
  unresolvedThreads?: number;
  contradictionCount?: number;
  pacing?: string;
  rating?: number;
  [key: string]: number | string | undefined;
}
