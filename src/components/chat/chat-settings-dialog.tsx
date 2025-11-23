'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ModelSelector } from '@/components/ai/model-selector';

export interface ChatSettings {
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
}

interface ChatSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    settings: ChatSettings;
    onSettingsChange: (settings: ChatSettings) => void;
}

export function ChatSettingsDialog({ open, onClose, settings, onSettingsChange }: ChatSettingsDialogProps) {
    const updateSetting = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const resetToDefaults = () => {
        onSettingsChange({
            model: '',
            temperature: 0.7,
            maxTokens: 2000,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Chat Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Model Selector */}
                    <div>
                        <Label className="text-sm font-medium">Model</Label>
                        <ModelSelector
                            value={settings.model}
                            onValueChange={(value) => updateSetting('model', value)}
                            className="mt-2"
                        />
                    </div>

                    {/* Temperature */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-sm font-medium">Temperature</Label>
                            <span className="text-sm text-muted-foreground">{settings.temperature}</span>
                        </div>
                        <Slider
                            value={[settings.temperature]}
                            onValueChange={([value]) => updateSetting('temperature', value)}
                            min={0}
                            max={2}
                            step={0.1}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Lower is more focused, higher is more creative
                        </p>
                    </div>

                    {/* Max Tokens */}
                    <div>
                        <Label className="text-sm font-medium">Max Tokens</Label>
                        <Input
                            type="number"
                            value={settings.maxTokens}
                            onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value) || 2000)}
                            min={100}
                            max={8000}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Maximum length of response
                        </p>
                    </div>

                    {/* Top P */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-sm font-medium">Top P</Label>
                            <span className="text-sm text-muted-foreground">{settings.topP}</span>
                        </div>
                        <Slider
                            value={[settings.topP]}
                            onValueChange={([value]) => updateSetting('topP', value)}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Nucleus sampling threshold
                        </p>
                    </div>

                    {/* Frequency Penalty */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-sm font-medium">Frequency Penalty</Label>
                            <span className="text-sm text-muted-foreground">{settings.frequencyPenalty}</span>
                        </div>
                        <Slider
                            value={[settings.frequencyPenalty]}
                            onValueChange={([value]) => updateSetting('frequencyPenalty', value)}
                            min={0}
                            max={2}
                            step={0.1}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Reduces word repetition
                        </p>
                    </div>

                    {/* Presence Penalty */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-sm font-medium">Presence Penalty</Label>
                            <span className="text-sm text-muted-foreground">{settings.presencePenalty}</span>
                        </div>
                        <Slider
                            value={[settings.presencePenalty]}
                            onValueChange={([value]) => updateSetting('presencePenalty', value)}
                            min={0}
                            max={2}
                            step={0.1}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Encourages topic diversity
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={resetToDefaults}>
                        Reset to Defaults
                    </Button>
                    <Button onClick={onClose}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
