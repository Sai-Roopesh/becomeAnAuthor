import type { Scene, CodexEntry } from '@/domain/entities/types';
import type { TiptapNode } from '@/shared/types/tiptap';
import { isElementNode } from '@/shared/types/tiptap';

/**
 * AI Prompt Templates for Story Analysis
 */

export interface AnalysisContext {
  scenes: Scene[];
  codex: CodexEntry[];
  projectTitle?: string;
}

// Helper to format scene content
function formatSceneContent(scene: Scene): string {
  // Extract plain text from Tiptap JSON
  const content = scene.content?.content || [];
  const text = content
    .map((node: TiptapNode) => {
      if (node.type === 'paragraph' && isElementNode(node)) {
        return node.content?.map((c: TiptapNode) => (c.type === 'text' ? c.text : '') || '').join('') || '';
      }
      return '';
    })
    .join('\n');

  return `## ${scene.title}\n${text.substring(0, 2000)}\n`;
}

/**
 * Synopsis Generation Prompt
 */
export const SYNOPSIS_PROMPT = (context: AnalysisContext) => {
  const sceneSummaries = context.scenes.map(formatSceneContent).join('\n\n');

  return `Generate a comprehensive synopsis for this manuscript.

Provide:
1. A 2-3 sentence high-level summary
2. Key plot points in order
3. Main themes identified

Manuscript (${context.scenes.length} scenes):
${sceneSummaries}

Return as JSON:
{
  "summary": "2-3 sentence summary",
  "plotPoints": ["Point 1", "Point 2", "..."],
  "themes": ["Theme 1", "Theme 2", "..."]
}`;
};

/**
 * Plot Thread Tracking Prompt
 */
export const PLOT_THREADS_PROMPT = (context: AnalysisContext) => {
  const sceneSummaries = context.scenes.map((s, idx) =>
    `Scene ${idx + 1}: ${s.title}\n${formatSceneContent(s)}`
  ).join('\n\n');

  return `Analyze this manuscript for plot threads and storylines.

For EACH plot thread you identify:
1. Name the thread clearly
2. Note where it's introduced (scene number and title)
3. Track all development points (scene numbers)
4. Determine if it's resolved or unresolved
5. Assess severity (1=minor subplot, 2=significant, 3=main plot)

Manuscript:
${sceneSummaries}

Return as JSON:
{
  "threads": [
    {
      "name": "The Lost Artifact",
      "setup": { "sceneIndex": 0, "sceneTitle": "Opening Scene", "description": "Artifact mentioned" },
      "development": [
        { "sceneIndex": 2, "note": "Clue discovered" },
        { "sceneIndex": 5, "note": "Search intensifies" }
      ],
      "resolution": { "sceneIndex": 10, "description": "Found in temple" } | null,
      "status": "resolved" | "unresolved",
      "severity": 1 | 2 | 3
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;
};

/**
 * Character Arc Analysis Prompt
 */
export const CHARACTER_ARCS_PROMPT = (context: AnalysisContext) => {
  const sceneSummaries = context.scenes.map((s, idx) =>
    `Scene ${idx + 1}: ${s.title}\n${formatSceneContent(s)}`
  ).join('\n\n');

  const codexCharacters = context.codex
    .filter(c => c.category === 'character')
    .map(c => `- ${c.name}: ${c.description}`)
    .join('\n');

  return `Analyze character arcs throughout this manuscript.

For EACH major character:
1. Identify the character
2. Track their key moments (scene indices)
3. Describe their character arc
4. Note if arc feels complete or incomplete

Known Characters (from Codex):
${codexCharacters || 'None defined'}

Manuscript:
${sceneSummaries}

Return as JSON:
{
  "characters": [
    {
      "name": "John Smith",
      "keyMoments": [
        { "sceneIndex": 0, "moment": "Introduction - ordinary life" },
        { "sceneIndex": 3, "moment": "Call to adventure" },
        { "sceneIndex": 7, "moment": "Faces inner demon" }
      ],
      "arcDescription": "Transforms from reluctant hero to confident leader",
      "arcStatus": "complete" | "incomplete",
      "notes": "Additional observations about character development"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;
};

/**
 * Timeline Analysis Prompt
 */
export const TIMELINE_PROMPT = (context: AnalysisContext) => {
  const sceneSummaries = context.scenes.map((s, idx) =>
    `Scene ${idx + 1}: ${s.title}\n${formatSceneContent(s)}`
  ).join('\n\n');

  return `Analyze the timeline of this manuscript.

Look for:
1. Temporal markers (dates, times, "three days later", etc.)
2. Sequence of events
3. Any timeline inconsistencies or contradictions
4. Time jumps or flashbacks

Manuscript:
${sceneSummaries}

Return as JSON:
{
  "events": [
    {
      "sceneIndex": 0,
      "timeMarker": "June 15th, morning" | null,
      "timeElapsed": "Day 1" | "3 days later" | null,
      "event": "Story begins"
    }
  ],
  "inconsistencies": [
    {
      "type": "contradiction" | "unclear",
      "sceneIndices": [3, 7],
      "description": "Scene 3 says it's Tuesday, but Scene 7 says it's Monday 2 days later",
      "severity": 1 | 2 | 3
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;
};

/**
 * Contradiction Detection Prompt
 */
export const CONTRADICTIONS_PROMPT = (context: AnalysisContext) => {
  const sceneSummaries = context.scenes.map((s, idx) =>
    `Scene ${idx + 1}: ${s.title}\n${formatSceneContent(s)}`
  ).join('\n\n');

  const codexSummary = context.codex
    .map(c => `${c.name} (${c.category}): ${c.description}`)
    .join('\n');

  return `Find contradictions and inconsistencies in this manuscript.

Look for:
1. Character description conflicts (eye color, age, background)
2. Location/world-building inconsistencies  
3. Plot contradictions (character knows something they shouldn't)
4. Cause-effect violations

Reference Codex:
${codexSummary || 'None'}

Manuscript:
${sceneSummaries}

Return as JSON:
{
  "contradictions": [
    {
      "type": "character" | "world-building" | "plot" | "logic",
      "sceneIndices": [1, 5],
      "description": "John has blue eyes in Scene 1 but brown eyes in Scene 5",
      "severity": 1 | 2 | 3,
      "suggestion": "Decide on one eye color and update consistently"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;
};

/**
 * Alpha Reader Prompt (Big Picture Feedback)
 */
export const ALPHA_READER_PROMPT = (context: AnalysisContext) => {
  const sceneSummaries = context.scenes.map(formatSceneContent).join('\n\n');

  return `Act as an alpha reader providing early-stage developmental feedback.

Focus on BIG PICTURE elements:
1. Does the premise make sense?
2. Are there obvious plot holes?
3. Is pacing appropriate?
4. Do character motivations feel clear?
5. What's confusing or unclear?

Ignore grammar and typos. Be constructive but honest.

Manuscript:
${sceneSummaries}

Return as JSON:
{
  "overallImpression": "Your general reaction to the story",
  "strengths": ["What works well", "..."],
  "concerns": [
    {
      "issue": "Pacing drags in middle section",
      "sceneIndices": [5, 6, 7],
      "suggestion": "Consider condensing or adding more conflict"
    }
  ],
  "questions": ["What happened to X?", "Why did character Y do Z?"]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;
};

/**
 * Beta Reader Prompt (Reader Experience)
 */
export const BETA_READER_PROMPT = (context: AnalysisContext) => {
  const sceneSummaries = context.scenes.map(formatSceneContent).join('\n\n');

  return `Act as a beta reader from the target audience perspective.

Evaluate:
1. Overall enjoyment and emotional impact
2. Character likability and arc satisfaction
3. World-building immersion
4. Dialogue believability  
5. Readiness for publication

Manuscript:
${sceneSummaries}

Return as JSON:
{
  "rating": 1-5,
  "enjoyment": "Description of reading experience",
  "characterFeedback": "Thoughts on characters",
  "worldBuilding": "Thoughts on setting/world",
  "dialogue": "Thoughts on dialogue quality",
  "emotionalImpact": ["Moments that resonated", "..."],
  "recommendations": ["Specific improvements", "..."]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;
};
