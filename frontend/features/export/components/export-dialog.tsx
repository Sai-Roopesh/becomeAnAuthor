"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useDocumentExport } from "@/hooks/use-document-export";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { useLiveQuery } from "@/hooks/use-live-query";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ExportDialog");

type ExportFormat = "docx" | "pdf";

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
  const { exportToDocx, exportToPDF, isExporting } = useDocumentExport();

  const project = useLiveQuery(async () => {
    return await projectRepository.get(projectId);
  }, [projectId, projectRepository]);

  const [format, setFormat] = useState<ExportFormat>("docx");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [includeTOC, setIncludeTOC] = useState(true);

  useEffect(() => {
    if (!open || !project) return;
    setTitle(project.title || "");
    setAuthor(project.author || "");
  }, [open, project]);

  const handleExport = async () => {
    try {
      if (format === "docx") {
        await exportToDocx(projectId, { title, author, includeTOC });
      } else {
        await exportToPDF(projectId, { title, author, includeTOC });
      }
      onOpenChange(false);
    } catch (error) {
      log.error("Export failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-dialog-md">
        <DialogHeader>
          <DialogTitle>Export Manuscript</DialogTitle>
          <DialogDescription>
            Export is temporarily simplified to stable DOCX/PDF only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={format === "docx" ? "default" : "outline"}
                onClick={() => setFormat("docx")}
                disabled={isExporting}
              >
                DOCX
              </Button>
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                onClick={() => setFormat("pdf")}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Manuscript title"
              disabled={isExporting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-author">Author</Label>
            <Input
              id="export-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              disabled={isExporting}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="export-toc"
              checked={includeTOC}
              onCheckedChange={(checked) => setIncludeTOC(Boolean(checked))}
              disabled={isExporting}
            />
            <Label htmlFor="export-toc">Include table of contents</Label>
          </div>
        </div>

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
              ? `Exporting ${format.toUpperCase()}...`
              : `Export ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
