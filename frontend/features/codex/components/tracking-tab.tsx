'use client';

import { CodexEntry, AIContext } from '@/domain/entities/types';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface TrackingTabProps {
    entity: Partial<CodexEntry>;
    onChange: (field: keyof CodexEntry, value: CodexEntry[keyof CodexEntry]) => void;
}

export function TrackingTab({ entity, onChange }: TrackingTabProps) {
    const trackMentions = entity.trackMentions !== false;
    const aiContext = entity.aiContext || 'detected';

    return (
        <div className="max-w-3xl space-y-6">
            {/* Tracking/Matching */}
            <div className="space-y-3">
                <h3 className="font-medium">Tracking/Matching</h3>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="trackMentions"
                        checked={trackMentions}
                        onCheckedChange={(checked) => onChange('trackMentions', checked)}
                    />
                    <Label htmlFor="trackMentions" className="text-sm font-normal">
                        Track this entry by name/alias
                    </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                    When enabled, mentions of this entry will be highlighted in your manuscript and tracked in the mentions tab.
                </p>
            </div>

            {/* AI Context */}
            <div className="space-y-3">
                <h3 className="font-medium">AI Context</h3>
                <RadioGroup value={aiContext} onValueChange={(value) => onChange('aiContext', value as AIContext)}>
                    <div className="flex items-start space-x-2">
                        <RadioGroupItem value="always" id="always" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="always" className="font-normal">
                                Always include
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                This entry's information is always presented to the AI.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-2">
                        <RadioGroupItem value="detected" id="detected" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="detected" className="font-normal">
                                Include when detected <span className="text-muted-foreground">(Default)</span>
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                The entry will be added to the context when it was detected in the text/selection/chat message.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-2">
                        <RadioGroupItem value="exclude" id="exclude" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="exclude" className="font-normal">
                                Don't include when detected
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Don't add this entry to the context, even if detected. It can still be pulled in when referenced or manually added as scene context.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-2">
                        <RadioGroupItem value="never" id="never" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="never" className="font-normal">
                                Never include
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                The entry will never be shown to the AI. Useful for private notes or irrelevant information.
                            </p>
                        </div>
                    </div>
                </RadioGroup>
            </div>
        </div>
    );
}
