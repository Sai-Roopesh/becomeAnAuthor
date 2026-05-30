// Public API for navigation feature
import { withErrorBoundary } from "@/features/shared/components";

import { ProjectNavigation as ProjectNavigationBase } from "./components/ProjectNavigation";
export const ProjectNavigation = withErrorBoundary(ProjectNavigationBase, {
  name: "Project Navigation",
});

import { TopNavigation as TopNavigationBase } from "./components/TopNavigation";
export const TopNavigation = withErrorBoundary(TopNavigationBase, {
  name: "Top Navigation",
});
