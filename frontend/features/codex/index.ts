// Public API for codex feature
import { withErrorBoundary } from "@/features/shared/components";

// Components
import { EntityEditor as EntityEditorBase } from "./components/entity-editor";
export const EntityEditor = withErrorBoundary(EntityEditorBase, {
  name: "Codex Entity Editor",
  maxRetries: 3,
});

export { CodexList } from "./components/codex-list";
export { DetailsTab } from "./components/details-tab";
export { TrackingTab } from "./components/tracking-tab";
export { RelationsTab } from "./components/relations-tab";
export { TagManager } from "./components/tag-manager";
export { TemplateSelector } from "./components/template-selector";

// Hooks
export { useCodexRepository } from "@/hooks/use-codex-repository";
export { useCodexTagRepository } from "@/hooks/use-codex-tag-repository";
export { useCodexTemplateRepository } from "@/hooks/use-codex-template-repository";
export { useCodexRelationTypeRepository } from "@/hooks/use-codex-relation-type-repository";
