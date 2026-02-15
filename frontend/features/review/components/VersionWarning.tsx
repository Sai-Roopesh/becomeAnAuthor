import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface VersionWarningProps {
  lastAnalyzed: number;
  scenesEdited: number;
}

export function VersionWarning({
  lastAnalyzed,
  scenesEdited,
}: VersionWarningProps) {
  const daysSince = Math.floor(
    (Date.now() - lastAnalyzed) / (1000 * 60 * 60 * 24),
  );
  const timeAgo =
    daysSince === 0
      ? "today"
      : daysSince === 1
        ? "yesterday"
        : `${daysSince} days ago`;

  return (
    <Alert variant="default" className="mx-6 mt-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Last analyzed {timeAgo}. {scenesEdited} scene
        {scenesEdited !== 1 ? "s" : ""} edited since then. Consider running a
        new analysis for up-to-date insights.
      </AlertDescription>
    </Alert>
  );
}
