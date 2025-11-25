'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import { CodexEntry, CodexCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trash2, User, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { DetailsTab } from './details-tab';
import { ResearchTab } from './research-tab';
import { RelationsTab } from './relations-tab';
import { MentionsTab } from './mentions-tab';
import { TrackingTab } from './tracking-tab';
import { toast } from '@/lib/toast-service';
import { useConfirmation } from '@/hooks/use-confirmation';

export function EntityEditor({ entityId, onBack }: { entityId: string, onBack: () => void }) {
    const codexRepo = useCodexRepository();
    const entity = useLiveQuery(() => codexRepo.get(entityId), [entityId]);
    const [formData, setFormData] = useState<Partial<CodexEntry>>({});
    const debouncedData = useDebounce(formData, 1000);
    const { confirm, ConfirmationDialog } = useConfirmation();

    useEffect(() => {
        if (entity) {
            if (!formData.id || formData.id !== entityId) {
                setFormData(entity);
            }
        }
    }, [entity, entityId]);

    useEffect(() => {
        if (debouncedData && debouncedData.id === entityId && Object.keys(debouncedData).length > 0) {
            codexRepo.update(entityId, debouncedData);
        }
    }, [debouncedData, entityId, codexRepo]);

    const handleChange = (field: keyof CodexEntry, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (formData.id) {
            await codexRepo.update(entityId, formData);
            toast.success('Entity saved');
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: 'Delete Entity',
            description: 'Are you sure you want to delete this entity? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (confirmed) {
            await codexRepo.delete(entityId);
            toast.success('Entity deleted');
            onBack();
        }
    };

    if (!entity) return <div className="p-4">Loading...</div>;

    const mentionCount = 0; // TODO: Calculate based on actual mentions

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b">
                <div className="p-4 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" /> Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Entity Info Card */}
                <div className="px-6 pb-4">
                    <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            {formData.thumbnail ? (
                                <img src={formData.thumbnail} alt={formData.name} className="h-full w-full object-cover rounded-lg" />
                            ) : (
                                <User className="h-8 w-8 text-muted-foreground" />
                            )}
                        </div>

                        {/* Name and Category */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="space-y-1">
                                <Select value={formData.category} onValueChange={v => handleChange('category', v)}>
                                    <SelectTrigger className="w-[150px] h-7 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="character">Character</SelectItem>
                                        <SelectItem value="location">Location</SelectItem>
                                        <SelectItem value="item">Item</SelectItem>
                                        <SelectItem value="lore">Lore</SelectItem>
                                        <SelectItem value="subplot">Subplot</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    value={formData.name || ''}
                                    onChange={e => handleChange('name', e.target.value)}
                                    className="text-2xl font-bold border-0 p-0 h-auto focus-visible:ring-0"
                                    placeholder="Entity Name"
                                />
                            </div>

                            {/* Tags */}
                            <div className="flex gap-2 flex-wrap">
                                {formData.tags?.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Mention Count */}
                            <div className="text-xs text-muted-foreground">
                                {mentionCount} mentions
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                    <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Details
                    </TabsTrigger>
                    <TabsTrigger value="research" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Research
                    </TabsTrigger>
                    <TabsTrigger value="relations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Relations
                    </TabsTrigger>
                    <TabsTrigger value="mentions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Mentions
                    </TabsTrigger>
                    <TabsTrigger value="tracking" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Tracking
                    </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto">
                    <TabsContent value="details" className="m-0 p-6">
                        <DetailsTab entity={formData} onChange={handleChange} />
                    </TabsContent>

                    <TabsContent value="research" className="m-0 p-6">
                        <ResearchTab entity={formData} onChange={handleChange} />
                    </TabsContent>

                    <TabsContent value="relations" className="m-0 p-6">
                        <RelationsTab entityId={entityId} />
                    </TabsContent>

                    <TabsContent value="mentions" className="m-0 p-6">
                        <MentionsTab entityId={entityId} entityName={formData.name || ''} />
                    </TabsContent>

                    <TabsContent value="tracking" className="m-0 p-6">
                        <TrackingTab entity={formData} onChange={handleChange} />
                    </TabsContent>
                </div>
            </Tabs>

            <ConfirmationDialog />
        </div>
    );
}
