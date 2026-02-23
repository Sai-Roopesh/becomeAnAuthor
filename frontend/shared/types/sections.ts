export type SceneSectionType = "standard" | "chapter" | "part" | "appendix";

export const DEFAULT_SCENE_SECTION_TITLE = "Untitled Section";
export const DEFAULT_SCENE_SECTION_TYPE: SceneSectionType = "standard";

export function isSceneSectionType(value: unknown): value is SceneSectionType {
  return (
    value === "standard" ||
    value === "chapter" ||
    value === "part" ||
    value === "appendix"
  );
}
