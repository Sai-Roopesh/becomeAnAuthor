'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TagInput } from '@/components/ui/tag-input';
import { Brain, Heart, Target, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ArcPoint } from '@/domain/entities/types';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useAppServices } from '@/infrastructure/di/AppContext';

interface ArcPointEditorProps {
    seriesId: string;
    entryId: string;
    entryName: string;
    existingPoint?: ArcPoint | undefined;
    open: boolean;
    onClose: () => void;
    onSave: (point: Omit<ArcPoint, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

/**
 * Arc Point Editor Dialog
 * Comprehensive form for creating/editing character arc points
 * Includes Phase 4 (basic) and Phase 5 (enhanced context) fields
 */
export function ArcPointEditor({
    seriesId,
    entryId,
    entryName,
    existingPoint,
    open,
    onClose,
    onSave
}: ArcPointEditorProps) {
    const { projectRepository } = useAppServices();

    const [formData, setFormData] = useState<Partial<ArcPoint>>({
        eventLabel: '',
        eventType: 'book',
        bookId: '',
        sceneId: '',
        timestamp: Date.now(),
        description: '',
        status: '',
        location: '',
        stats: {},
        relationships: {},
        notes: '',
        significance: '',
        // Phase 5 fields
        knowledgeState: {
            knows: [],
            doesNotKnow: [],
            believes: [],
            misconceptions: []
        },
        emotionalState: {
            primaryEmotion: '',
            intensity: 5,
            mentalState: [],
            internalConflict: '',
            trauma: []
        },
        goalsAndMotivations: {
            primaryGoal: '',
            secondaryGoals: [],
            fears: [],
            desires: [],
            obstacles: []
        }
    });

    // Load existing point data
    useEffect(() => {
        if (existingPoint) {
            setFormData({
                ...existingPoint,
                knowledgeState: existingPoint.knowledgeState || {
                    knows: [],
                    doesNotKnow: [],
                    believes: [],
                    misconceptions: []
                },
                emotionalState: existingPoint.emotionalState || {
                    primaryEmotion: '',
                    intensity: 5,
                    mentalState: [],
                    internalConflict: '',
                    trauma: []
                },
                goalsAndMotivations: existingPoint.goalsAndMotivations || {
                    primaryGoal: '',
                    secondaryGoals: [],
                    fears: [],
                    desires: [],
                    obstacles: []
                }
            });
        }
    }, [existingPoint, open]);

    // Get all books in series for dropdown
    const books = useLiveQuery(
        () => projectRepository.getBySeries(seriesId),
        [projectRepository, seriesId]
    );

    const handleSave = async () => {
        if (!formData.eventLabel || !formData.description) {
            return; // Validation
        }

        await onSave(formData as Omit<ArcPoint, 'id' | 'createdAt' | 'updatedAt'>);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {existingPoint ? 'Edit' : 'Add'} Arc Point: {entryName}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Track how this character evolves at specific points in the series
                    </p>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Event Label */}
                    <div className="space-y-2">
                        <Label>Event Label *</Label>
                        <Input
                            placeholder="e.g., Book 3 - Learns Patronus"
                            value={formData.eventLabel}
                            onChange={e => setFormData(prev => ({ ...prev, eventLabel: e.target.value }))}
                        />
                    </div>

                    {/* Book Selection */}
                    <div className="space-y-2">
                        <Label>Book</Label>
                        <select
                            className="w-full  p-2 border rounded-md"
                            value={formData.bookId}
                            onChange={e => setFormData(prev => ({ ...prev, bookId: e.target.value }))}
                        >
                            <option value="">Choose book...</option>
                            {books?.map(book => (
                                <option key={book.id} value={book.id}>
                                    {book.title} ({book.seriesIndex || 'No index'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Scene Selection (Optional - for finer granularity) */}
                    <div className="space-y-2">
                        <Label>Scene ID (Optional)</Label>
                        <Input
                            placeholder="Link to specific scene (future: dropdown)"
                            value={formData.sceneId || ''}
                            onChange={e => setFormData(prev => ({ ...prev, sceneId: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Linking to a scene allows AI to know character state exactly at that point
                        </p>
                    </div>

                    {/* Age */}
                    <div className="space-y-2">
                        <Label>Age (optional)</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 13"
                            value={formData.age || ''}
                            onChange={e => setFormData(prev => ({
                                ...prev,
                                age: e.target.value ? parseInt(e.target.value) : undefined
                            } as Partial<ArcPoint>))}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label>Description at this point *</Label>
                        <Textarea
                            rows={3}
                            placeholder="How has this character changed or evolved?"
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    {/* Status & Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Input
                                placeholder="e.g., Student, Fugitive"
                                value={formData.status}
                                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                                placeholder="e.g., Hogwarts"
                                value={formData.location}
                                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Stats (Phase 4) */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Stats (for graphing)</Label>
                        <p className="text-xs text-muted-foreground">Add custom stats or use common ones like magic, confidence, leadership</p>
                        {['magic', 'confidence', 'leadership'].map(stat => (
                            <div key={stat} className="space-y-2">
                                <div className="flex justify-between">
                                    <Label className="capitalize">{stat}</Label>
                                    <span className="text-sm text-muted-foreground">
                                        {formData.stats?.[stat] || 0}/100
                                    </span>
                                </div>
                                <Slider
                                    value={[formData.stats?.[stat] || 0]}
                                    onValueChange={value => setFormData(prev => ({
                                        ...prev,
                                        stats: { ...prev.stats, [stat]: value[0] ?? 0 }
                                    }))}
                                    max={100}
                                    step={5}
                                />
                            </div>
                        ))}
                    </div>

                    {/* PHASE 5: Knowledge State */}
                    <Collapsible className="border rounded-lg p-4">
                        <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 font-semibold">
                                <Brain className="h-4 w-4 text-blue-500" />
                                Knowledge & Beliefs (Optional)
                            </div>
                            <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-3">
                            <div className="space-y-2">
                                <Label>Character Knows</Label>
                                <TagInput
                                    placeholder="e.g., Voldemort is back"
                                    values={formData.knowledgeState?.knows || []}
                                    onChange={values => setFormData(prev => ({
                                        ...prev,
                                        knowledgeState: { ...prev.knowledgeState!, knows: values }
                                    }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Facts the character knows for certain at this point
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Character Doesn't Know (Yet)</Label>
                                <TagInput
                                    placeholder="e.g., Sirius is his godfather"
                                    values={formData.knowledgeState?.doesNotKnow || []}
                                    onChange={values => setFormData(prev => ({
                                        ...prev,
                                        knowledgeState: { ...prev.knowledgeState!, doesNotKnow: values }
                                    }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Critical for preventing plot holes - AI won't reveal this early
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Character Believes</Label>
                                <TagInput
                                    placeholder="e.g., Snape is purely evil"
                                    values={formData.knowledgeState?.believes || []}
                                    onChange={values => setFormData(prev => ({
                                        ...prev,
                                        knowledgeState: { ...prev.knowledgeState!, believes: values }
                                    }))}
                                />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* PHASE 5: Emotional State */}
                    <Collapsible className="border rounded-lg p-4">
                        <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 font-semibold">
                                <Heart className="h-4 w-4 text-red-500" />
                                Emotional State (Optional)
                            </div>
                            <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Primary Emotion</Label>
                                    <Select
                                        value={formData.emotionalState?.primaryEmotion || ''}
                                        onValueChange={value => setFormData(prev => ({
                                            ...prev,
                                            emotionalState: { ...prev.emotionalState!, primaryEmotion: value }
                                        }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fear">Fear</SelectItem>
                                            <SelectItem value="anger">Anger</SelectItem>
                                            <SelectItem value="joy">Joy</SelectItem>
                                            <SelectItem value="grief">Grief</SelectItem>
                                            <SelectItem value="love">Love</SelectItem>
                                            <SelectItem value="hope">Hope</SelectItem>
                                            <SelectItem value="despair">Despair</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Intensity (1-10)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={formData.emotionalState?.intensity || ''}
                                        onChange={e => setFormData(prev => ({
                                            ...prev,
                                            emotionalState: {
                                                ...prev.emotionalState!,
                                                intensity: parseInt(e.target.value) || 1
                                            }
                                        }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Mental State</Label>
                                <TagInput
                                    placeholder="e.g., traumatized, confident"
                                    values={formData.emotionalState?.mentalState || []}
                                    onChange={values => setFormData(prev => ({
                                        ...prev,
                                        emotionalState: { ...prev.emotionalState!, mentalState: values }
                                    }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Internal Conflict</Label>
                                <Input
                                    placeholder="e.g., Wants revenge vs. doing what's right"
                                    value={formData.emotionalState?.internalConflict || ''}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        emotionalState: {
                                            ...prev.emotionalState!,
                                            internalConflict: e.target.value
                                        }
                                    }))}
                                />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* PHASE 5: Goals & Motivations */}
                    <Collapsible className="border rounded-lg p-4">
                        <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 font-semibold">
                                <Target className="h-4 w-4 text-green-500" />
                                Goals & Motivations (Optional)
                            </div>
                            <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-3">
                            <div className="space-y-2">
                                <Label>Primary Goal</Label>
                                <Input
                                    placeholder="e.g., Survive the Triwizard Tournament"
                                    value={formData.goalsAndMotivations?.primaryGoal || ''}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        goalsAndMotivations: {
                                            ...prev.goalsAndMotivations!,
                                            primaryGoal: e.target.value
                                        }
                                    }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Fears</Label>
                                <TagInput
                                    placeholder="e.g., Losing more people"
                                    values={formData.goalsAndMotivations?.fears || []}
                                    onChange={values => setFormData(prev => ({
                                        ...prev,
                                        goalsAndMotivations: {
                                            ...prev.goalsAndMotivations!,
                                            fears: values
                                        }
                                    }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Obstacles</Label>
                                <TagInput
                                    placeholder="e.g., Ministry denying truth"
                                    values={formData.goalsAndMotivations?.obstacles || []}
                                    onChange={values => setFormData(prev => ({
                                        ...prev,
                                        goalsAndMotivations: {
                                            ...prev.goalsAndMotivations!,
                                            obstacles: values
                                        }
                                    }))}
                                />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            rows={2}
                            placeholder="Why did this character change at this point?"
                            value={formData.notes}
                            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        disabled={!formData.eventLabel || !formData.description}
                    >
                        {existingPoint ? 'Update' : 'Create'} Arc Point
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
