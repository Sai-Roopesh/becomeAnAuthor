// Public API for search feature
import { withErrorBoundary } from "@/features/shared/components";

import { SearchPalette as SearchPaletteBase } from "./components/SearchPalette";
export const SearchPalette = withErrorBoundary(SearchPaletteBase, {
  name: "Search Palette",
});

// Hooks
export { useSearch } from "./hooks/use-search";
