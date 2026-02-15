"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Database, Download, FileJson, Loader2, Upload } from "lucide-react";
import { useImportExport } from "@/hooks/use-import-export";
import { useRef, useState } from "react";
import { invalidateQueries, useLiveQuery } from "@/hooks/use-live-query";
import { toast } from "@/shared/utils/toast-service";
import { useSeriesRepository } from "@/hooks/use-series-repository";

export function DataManagementMenu() {
  const { exportSeries, importSeries } = useImportExport();
  const seriesRepo = useSeriesRepository();
  const allSeries = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo]);

  const importInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingSeriesId, setIsExportingSeriesId] = useState<string | null>(
    null,
  );

  const handleSeriesImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImporting(true);
      try {
        const result = await importSeries(file);
        if (result.seriesId) {
          invalidateQueries();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to import series");
      } finally {
        setIsImporting(false);
      }
    }

    if (importInputRef.current) importInputRef.current.value = "";
  };

  const handleSeriesExport = async (seriesId: string, seriesTitle: string) => {
    setIsExportingSeriesId(seriesId);
    try {
      await exportSeries(seriesId);
      toast.success(`Exported series "${seriesTitle}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export series");
    } finally {
      setIsExportingSeriesId(null);
    }
  };

  const isLoading = isImporting || isExportingSeriesId !== null;

  return (
    <>
      <input
        type="file"
        ref={importInputRef}
        className="hidden"
        accept=".json"
        onChange={handleSeriesImport}
        disabled={isLoading}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {isImporting ? "Importing..." : "Backups"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Series Backup</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => importInputRef.current?.click()}
            disabled={isLoading}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import Series Backup (.json)
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Export Series</DropdownMenuLabel>
          {(allSeries ?? []).length === 0 && (
            <DropdownMenuItem disabled>
              <FileJson className="h-4 w-4 mr-2" />
              No series available
            </DropdownMenuItem>
          )}
          {(allSeries ?? []).map((series) => (
            <DropdownMenuItem
              key={series.id}
              disabled={isLoading}
              onClick={() => handleSeriesExport(series.id, series.title)}
            >
              {isExportingSeriesId === series.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export "{series.title}"
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
