"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useFormatStore } from "@/store/use-format-store";

/**
 * General Settings Tab
 *
 * Contains appearance, editor experience, and interface settings.
 */
export function GeneralSettingsTab() {
  const formatSettings = useFormatStore();

  return (
    <div className="p-6 bg-background flex-1 overflow-y-auto min-h-0">
      <h3 className="text-lg font-semibold mb-6">General Settings</h3>

      <div className="space-y-8">
        {/* Appearance Section */}
        <section className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Appearance
          </h4>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-family">Font Family</Label>
              <Select
                value={formatSettings.fontFamily}
                onValueChange={(value) =>
                  formatSettings.updateSettings({ fontFamily: value })
                }
              >
                <SelectTrigger className="w-select">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Georgia">Georgia (Serif)</SelectItem>
                  <SelectItem value="Merriweather">
                    Merriweather (Serif)
                  </SelectItem>
                  <SelectItem value="Inter">Inter (Sans)</SelectItem>
                  <SelectItem value="Arial">Arial (Sans)</SelectItem>
                  <SelectItem value="Courier Prime">
                    Courier Prime (Mono)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size">
                  Font Size: {formatSettings.fontSize}px
                </Label>
              </div>
              <Slider
                id="font-size"
                min={12}
                max={24}
                step={1}
                value={[formatSettings.fontSize]}
                onValueChange={([value]) =>
                  value !== undefined &&
                  formatSettings.updateSettings({ fontSize: value })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="line-height">
                  Line Height: {formatSettings.lineHeight}
                </Label>
              </div>
              <Slider
                id="line-height"
                min={1.0}
                max={2.5}
                step={0.1}
                value={[formatSettings.lineHeight]}
                onValueChange={([value]) =>
                  value !== undefined &&
                  formatSettings.updateSettings({ lineHeight: value })
                }
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Editor Experience Section */}
        <section className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Editor Experience
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="typewriter-mode">Typewriter Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Keeps the active line centered in the editor.
                </p>
              </div>
              <Switch
                id="typewriter-mode"
                checked={formatSettings.typewriterMode}
                onCheckedChange={(checked) =>
                  formatSettings.updateSettings({ typewriterMode: checked })
                }
              />
            </div>

            {/* Typewriter Offset - only show when typewriter mode is enabled */}
            {formatSettings.typewriterMode && (
              <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="typewriter-offset">
                    Cursor Position: {formatSettings.typewriterOffset}% from top
                  </Label>
                </div>
                <Slider
                  id="typewriter-offset"
                  min={20}
                  max={60}
                  step={5}
                  value={[formatSettings.typewriterOffset]}
                  onValueChange={([value]) =>
                    value !== undefined &&
                    formatSettings.updateSettings({ typewriterOffset: value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Lower values keep the cursor higher on screen.
                </p>
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* Interface Section */}
        <section className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Interface
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-line-numbers">Show Line Numbers</Label>
              <Switch
                id="show-line-numbers"
                checked={formatSettings.showLineNumbers}
                onCheckedChange={(checked) =>
                  formatSettings.updateSettings({ showLineNumbers: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-word-count">Show Word Count</Label>
              <Switch
                id="show-word-count"
                checked={formatSettings.showWordCount}
                onCheckedChange={(checked) =>
                  formatSettings.updateSettings({ showWordCount: checked })
                }
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
