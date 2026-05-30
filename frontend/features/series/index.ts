// Public API for series feature
import { withErrorBoundary } from "@/features/shared/components";

export { SeriesCard } from "./components/SeriesCard";

import { SeriesList as SeriesListBase } from "./components/SeriesList";
export const SeriesList = withErrorBoundary(SeriesListBase, {
  name: "Series List",
});

import { CreateSeriesDialog as CreateSeriesDialogBase } from "./components/CreateSeriesDialog";
export const CreateSeriesDialog = withErrorBoundary(CreateSeriesDialogBase, {
  name: "Create Series",
});

import { EditSeriesDialog as EditSeriesDialogBase } from "./components/EditSeriesDialog";
export const EditSeriesDialog = withErrorBoundary(EditSeriesDialogBase, {
  name: "Edit Series",
});
