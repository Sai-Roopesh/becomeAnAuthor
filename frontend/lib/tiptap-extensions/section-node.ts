import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SectionComponent } from "@/features/editor/components/section-component";
import { SECTION_COLORS } from "@/lib/config/constants";
import {
  DEFAULT_SCENE_SECTION_TITLE,
  DEFAULT_SCENE_SECTION_TYPE,
  isSceneSectionType,
  type SceneSectionType,
} from "@/shared/types/sections";

export interface SectionAttributes {
  title: string;
  color: string;
  sectionType: SceneSectionType;
  excludeFromAI: boolean;
  collapsed: boolean;
}

export const Section = Node.create({
  name: "section",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      title: {
        default: DEFAULT_SCENE_SECTION_TITLE,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => ({
          "data-title": attributes["title"],
        }),
      },
      color: {
        default: SECTION_COLORS[0].value, // Blue
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attributes) => ({
          "data-color": attributes["color"],
        }),
      },
      sectionType: {
        default: DEFAULT_SCENE_SECTION_TYPE,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-section-type");
          return isSceneSectionType(raw) ? raw : DEFAULT_SCENE_SECTION_TYPE;
        },
        renderHTML: (attributes) => ({
          "data-section-type": attributes["sectionType"],
        }),
      },
      excludeFromAI: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-exclude-ai") === "true",
        renderHTML: (attributes) => ({
          "data-exclude-ai": attributes["excludeFromAI"],
        }),
      },
      collapsed: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-collapsed") === "true",
        renderHTML: (attributes) => ({
          "data-collapsed": attributes["collapsed"],
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="section"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "section" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SectionComponent);
  },
});
