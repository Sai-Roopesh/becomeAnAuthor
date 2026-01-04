'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Settings2 } from 'lucide-react';
import { useFormatStore } from '@/store/use-format-store';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { EDITOR_CONSTANTS } from '@/lib/config/constants';

export function FormatMenu() {
    const {
        fontFamily,
        fontSize,
        lineHeight,
        alignment,
        pageWidth,
        typewriterMode,
        continueInChapter,
        focusMode,
        updateSettings,
        toggleFocusMode,
    } = useFormatStore();

    return (
        <TooltipProvider delayDuration={300}>
            <Popover>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Write Settings</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80" align="end">
                    <Tabs defaultValue="focus">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="focus">Focus</TabsTrigger>
                            <TabsTrigger value="typography">Typography</TabsTrigger>
                            <TabsTrigger value="page">Page</TabsTrigger>
                        </TabsList>

                        <TabsContent value="focus" className="space-y-4 mt-4">
                            {/* Focus Mode - Most important */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Focus Mode</Label>
                                    <p className="text-xs text-muted-foreground">Full-screen distraction-free</p>
                                </div>
                                <Switch
                                    checked={focusMode}
                                    onCheckedChange={toggleFocusMode}
                                />
                            </div>

                            {/* Typewriter Mode */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Typewriter Mode</Label>
                                    <p className="text-xs text-muted-foreground">Keep cursor centered</p>
                                </div>
                                <Switch
                                    checked={typewriterMode}
                                    onCheckedChange={(checked) => updateSettings({ typewriterMode: checked })}
                                />
                            </div>

                            {/* Continue in Chapter */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Continue in Chapter</Label>
                                    <p className="text-xs text-muted-foreground">AI continues within chapter context</p>
                                </div>
                                <Switch
                                    checked={continueInChapter}
                                    onCheckedChange={(checked) => updateSettings({ continueInChapter: checked })}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="typography" className="space-y-4 mt-4">
                            {/* Font Family */}
                            <div className="space-y-2">
                                <Label>Font Family</Label>
                                <Select value={fontFamily} onValueChange={(v) => updateSettings({ fontFamily: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Georgia">Georgia</SelectItem>
                                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                        <SelectItem value="Arial">Arial</SelectItem>
                                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                                        <SelectItem value="Courier New">Courier New</SelectItem>
                                        <SelectItem value="Inter">Inter</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Font Size */}
                            <div className="space-y-2">
                                <Label>Font Size: {fontSize}px</Label>
                                <Slider
                                    value={[fontSize]}
                                    onValueChange={([v]) => v !== undefined && updateSettings({ fontSize: v })}
                                    min={EDITOR_CONSTANTS.FONT_SIZE_MIN}
                                    max={EDITOR_CONSTANTS.FONT_SIZE_MAX}
                                    step={1}
                                />
                            </div>

                            {/* Line Height */}
                            <div className="space-y-2">
                                <Label>Line Height: {lineHeight}</Label>
                                <Slider
                                    value={[lineHeight]}
                                    onValueChange={([v]) => v !== undefined && updateSettings({ lineHeight: v })}
                                    min={1.0}
                                    max={3.0}
                                    step={0.1}
                                />
                            </div>

                            {/* Alignment */}
                            <div className="space-y-2">
                                <Label>Text Alignment</Label>
                                <Select value={alignment} onValueChange={(v: 'left' | 'center' | 'right' | 'justify') => updateSettings({ alignment: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                        <SelectItem value="justify">Justify</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <TabsContent value="page" className="space-y-4 mt-4">
                            {/* Page Width */}
                            <div className="space-y-2">
                                <Label>Page Width: {pageWidth}px</Label>
                                <Slider
                                    value={[pageWidth]}
                                    onValueChange={([v]) => v !== undefined && updateSettings({ pageWidth: v })}
                                    min={EDITOR_CONSTANTS.PAGE_WIDTH_MIN}
                                    max={EDITOR_CONSTANTS.PAGE_WIDTH_MAX}
                                    step={50}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </PopoverContent>
            </Popover>
        </TooltipProvider>
    );
}

