// Public API for plan feature
import { withErrorBoundary } from "@/features/shared/components";

import { PlanView as PlanViewBase } from "./components/plan-view";
export const PlanView = withErrorBoundary(PlanViewBase, {
  name: "Plan View",
});

export { OutlineView } from "./components/outline-view";
export { GridView } from "./components/grid-view";
export { TimelineView } from "./components/timeline-view";
export { SceneCard } from "./components/scene-card";
export { SceneCodexBadges } from "./components/scene-codex-badges";
export { SceneLinkPanel } from "./components/scene-link-panel";
export { CodexFilterBar } from "./components/codex-filter-bar";

// Utils
export { extractScenes } from "./utils/timeline-utils";
