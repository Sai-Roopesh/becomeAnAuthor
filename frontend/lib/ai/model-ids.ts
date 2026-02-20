export function parseModelIds(input: string): string[] {
  if (!input.trim()) return [];

  const parts = input
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return Array.from(new Set(parts));
}

export function formatModelIds(models?: string[]): string {
  if (!models || models.length === 0) return "";
  return models.join("\n");
}
