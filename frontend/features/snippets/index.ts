// Public API for snippets feature
import { withErrorBoundary } from "@/features/shared/components";

import { SnippetList as SnippetListBase } from "./components/snippet-list";
export const SnippetList = withErrorBoundary(SnippetListBase, {
  name: "Snippet List",
});

export { SnippetEditor } from "./components/snippet-editor";
