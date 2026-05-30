// Public API for editor feature
import { withErrorBoundary } from "@/features/shared/components";

// Core Components
export { TiptapEditor } from "./components/tiptap-editor";
import { EditorContainer as EditorContainerBase } from "./components/EditorContainer";
export const EditorContainer = withErrorBoundary(EditorContainerBase, {
  name: "Editor",
});
export { EditorToolbar } from "./components/editor-toolbar";

// AI Menu Components
export { TextReplaceDialog } from "./components/text-replace-dialog";
export { TweakGenerateDialog } from "./components/tweak-generate-dialog";
export { ContinueWritingMenu } from "./components/continue-writing-menu";
export { TextSelectionMenu } from "./components/text-selection-menu";
export { SparkPopover } from "./components/spark-popover";

// Panel Components
export { FocusModeToggle } from "./components/FocusModeToggle";
export { FormatMenu } from "./components/format-menu";
export { SceneNotesPanel } from "./components/scene-notes-panel";
export { WriteRightPanel } from "./components/write-right-panel";
export { StoryTimeline } from "./components/story-timeline";
export { NodeActionsMenu } from "./components/NodeActionsMenu";

// Editor Extensions
export { SectionComponent } from "./components/section-component";
export { TypewriterExtension } from "./extensions/TypewriterExtension";

// Hooks
export { useSceneNote } from "./hooks/use-scene-note";
export { useEditorState } from "./hooks/useEditorState";
