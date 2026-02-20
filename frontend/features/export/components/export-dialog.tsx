"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentExport } from "@/hooks/use-document-export";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";
import {
  DEFAULT_EXPORT_CONFIG,
  type ExportConfigV2,
  type ExportFontFamily,
} from "@/domain/types/export-types";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ExportDialog");

interface ExportDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({
  projectId,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const { projectRepository } = useAppServices();
  const { exportDocument, isExporting } = useDocumentExport();

  const project = useLiveQuery(async () => {
    return await projectRepository.get(projectId);
  }, [projectId, projectRepository]);

  const [config, setConfig] = useState<ExportConfigV2>(DEFAULT_EXPORT_CONFIG);

  useEffect(() => {
    if (!open || !project) return;

    setConfig((previous) => ({
      ...DEFAULT_EXPORT_CONFIG,
      ...previous,
      title: project.title || "",
      author: project.author || "",
    }));
  }, [open, project]);

  const updateConfig = <K extends keyof ExportConfigV2>(
    key: K,
    value: ExportConfigV2[K],
  ) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
  };

  const updateMargin = (
    key: keyof ExportConfigV2["marginsMm"],
    value: number,
  ) => {
    setConfig((previous) => ({
      ...previous,
      marginsMm: {
        ...previous.marginsMm,
        [key]: value,
      },
    }));
  };

  const handleExport = async () => {
    try {
      await exportDocument(projectId, config);
      onOpenChange(false);
    } catch (error) {
      log.error("Export failed", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-dialog-md max-h-[86vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Manuscript</DialogTitle>
          <DialogDescription>
            Customize formatting and layout for DOCX or PDF export.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="gap-4">
          <TabsList>
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={config.format === "docx" ? "default" : "outline"}
                  onClick={() => updateConfig("format", "docx")}
                  disabled={isExporting}
                >
                  DOCX
                </Button>
                <Button
                  type="button"
                  variant={config.format === "pdf" ? "default" : "outline"}
                  onClick={() => updateConfig("format", "pdf")}
                  disabled={isExporting}
                >
                  PDF
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-title">Title</Label>
              <Input
                id="export-title"
                value={config.title}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Manuscript title"
                disabled={isExporting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-author">Author</Label>
              <Input
                id="export-author"
                value={config.author}
                onChange={(e) => updateConfig("author", e.target.value)}
                placeholder="Author name"
                disabled={isExporting}
              />
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <ToggleRow
                id="include-title-page"
                label="Include title page"
                checked={config.includeTitlePage}
                disabled={isExporting}
                onChange={(checked) =>
                  updateConfig("includeTitlePage", checked)
                }
              />
              <ToggleRow
                id="include-toc"
                label="Include table of contents"
                checked={config.includeTOC}
                disabled={isExporting}
                onChange={(checked) => updateConfig("includeTOC", checked)}
              />
              <ToggleRow
                id="include-page-numbers"
                label="Include page numbers"
                checked={config.includePageNumbers}
                disabled={isExporting}
                onChange={(checked) =>
                  updateConfig("includePageNumbers", checked)
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Page Size</Label>
                <Select
                  value={config.pageSize}
                  onValueChange={(value) =>
                    updateConfig(
                      "pageSize",
                      value as ExportConfigV2["pageSize"],
                    )
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Letter">US Letter</SelectItem>
                    <SelectItem value="A4">A4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font</Label>
                <Select
                  value={config.fontFamily}
                  onValueChange={(value) =>
                    updateConfig("fontFamily", value as ExportFontFamily)
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="times">Times</SelectItem>
                    <SelectItem value="georgia">Georgia</SelectItem>
                    <SelectItem value="arial">Arial</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <NumberField
                id="font-size"
                label="Font Size"
                value={config.fontSizePt}
                step={1}
                min={9}
                max={18}
                disabled={isExporting}
                onChange={(value) => updateConfig("fontSizePt", value)}
              />
              <NumberField
                id="line-height"
                label="Line Height"
                value={config.lineHeight}
                step={0.1}
                min={1.2}
                max={2.5}
                disabled={isExporting}
                onChange={(value) => updateConfig("lineHeight", value)}
              />
              <NumberField
                id="paragraph-spacing"
                label="Paragraph Space"
                value={config.paragraphSpacingPt}
                step={1}
                min={0}
                max={24}
                disabled={isExporting}
                onChange={(value) => updateConfig("paragraphSpacingPt", value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Text Alignment</Label>
              <Select
                value={config.alignment}
                onValueChange={(value) =>
                  updateConfig(
                    "alignment",
                    value as ExportConfigV2["alignment"],
                  )
                }
                disabled={isExporting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="justify">Justified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-sm">Margins (mm)</Label>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="margin-top"
                  label="Top"
                  value={config.marginsMm.top}
                  step={1}
                  min={8}
                  max={50}
                  disabled={isExporting}
                  onChange={(value) => updateMargin("top", value)}
                />
                <NumberField
                  id="margin-right"
                  label="Right"
                  value={config.marginsMm.right}
                  step={1}
                  min={8}
                  max={50}
                  disabled={isExporting}
                  onChange={(value) => updateMargin("right", value)}
                />
                <NumberField
                  id="margin-bottom"
                  label="Bottom"
                  value={config.marginsMm.bottom}
                  step={1}
                  min={8}
                  max={50}
                  disabled={isExporting}
                  onChange={(value) => updateMargin("bottom", value)}
                />
                <NumberField
                  id="margin-left"
                  label="Left"
                  value={config.marginsMm.left}
                  step={1}
                  min={8}
                  max={50}
                  disabled={isExporting}
                  onChange={(value) => updateMargin("left", value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <ToggleRow
                id="include-act-headings"
                label="Show act headings"
                checked={config.includeActHeadings}
                disabled={isExporting}
                onChange={(checked) =>
                  updateConfig("includeActHeadings", checked)
                }
              />
              <ToggleRow
                id="include-chapter-headings"
                label="Show chapter headings"
                checked={config.includeChapterHeadings}
                disabled={isExporting}
                onChange={(checked) =>
                  updateConfig("includeChapterHeadings", checked)
                }
              />
              <ToggleRow
                id="include-scene-titles"
                label="Show scene titles"
                checked={config.includeSceneTitles}
                disabled={isExporting}
                onChange={(checked) =>
                  updateConfig("includeSceneTitles", checked)
                }
              />
              <ToggleRow
                id="include-summaries"
                label="Include scene summaries"
                checked={config.includeSummaries}
                disabled={isExporting}
                onChange={(checked) =>
                  updateConfig("includeSummaries", checked)
                }
              />
              <ToggleRow
                id="chapter-new-page"
                label="Start each chapter on a new page"
                checked={config.chapterStartsOnNewPage}
                disabled={isExporting}
                onChange={(checked) =>
                  updateConfig("chapterStartsOnNewPage", checked)
                }
              />

              <div className="space-y-2">
                <Label>Scene Break Style</Label>
                <Select
                  value={config.sceneBreakStyle}
                  onValueChange={(value) =>
                    updateConfig(
                      "sceneBreakStyle",
                      value as ExportConfigV2["sceneBreakStyle"],
                    )
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asterisks">Asterisks (***)</SelectItem>
                    <SelectItem value="divider">Divider line</SelectItem>
                    <SelectItem value="blank-line">Blank line</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting
              ? `Exporting ${config.format.toUpperCase()}...`
              : `Export ${config.format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ToggleRowProps {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ id, label, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(Boolean(value))}
      />
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) {
            onChange(parsed);
          }
        }}
      />
    </div>
  );
}
