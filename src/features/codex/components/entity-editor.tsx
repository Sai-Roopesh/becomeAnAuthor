'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import { useCodexTemplateRepository } from '@/hooks/use-codex-template-repository';
import { CodexEntry, CodexCategory } from '@/lib/config/types';
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
import { TagManager } from './tag-manager';
import { TemplateFieldRenderer } from './template-field-renderer';
import { toast } from '@/lib/toast-service';
import { useConfirmation } from '@/hooks/use-confirmation';

export function EntityEditor({ entityId, onBack }: { entityId: string, onBack: () => void }) {
    const codexRepo = useCodexRepository();
    const templateRepo = useCodexTemplateRepository();
    const entity = useLiveQuery(() => codexRepo.get(entityId), [entityId]);

    // Load template if entity has one
    const template = useLiveQuery(
        () => entity?.templateId ? templateRepo.get(entity.templateId) : Promise.resolve(undefined),
        [entity?.templateId]
    );

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

    const handleTemplateFieldChange = (fieldId: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            customFields: {
                ...prev.customFields,
                [fieldId]: value
            }
        }));
    };

    const handleSave = async () => {
        if (formData.id) {
            await codexRepo.update(entityId, formData);
            toast.success('Entity saved');
        }
    };

    const handleDeleteClick = async () => {
        const confirmed = await confirm({
            title: 'Delete Entity',
            description: 'Are you sure you want to delete this entity? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (confirmed && entity) {
            await codexRepo.delete(entityId);
            toast.success('Entity deleted');
            onBack();
        }
    };

    const handleClearTemplate = async () => {
        const confirmed = await confirm({
            title: 'Clear Template?',
            description: 'This will remove all template fields and their data. This action cannot be undone.',
            confirmText: 'Clear Template',
            variant: 'destructive'
        });

        if (confirmed) {
            await codexRepo.update(entityId, {
                templateId: undefined,
                customFields: {}
            });
            toast.success('Template cleared - you can now change the category');
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
                        <Button variant="ghost" size="icon" onClick={handleSave}>
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
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
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={formData.category}
                                        onValueChange={v => handleChange('category', v)}
                                        disabled={!!entity?.templateId}
                                    >
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
                                    {entity?.templateId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={handleClearTemplate}
                                        >
                                            Clear Template
                                        </Button>
                                    )}
                                </div>
                                {entity?.templateId && (
                                    <p className="text-xs text-muted-foreground">
                                        Category locked because entry uses a template. Clear template to change category.
                                    </p>
                                )}
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
                    {template && (
                        <TabsTrigger value="template" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                            Template Fields
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="tags" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                        Tags
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

                <div className="flex-1 overflow-y-auto">
                    <TabsContent value="details" className="p-6 m-0">
                        <DetailsTab
                            entity={formData as CodexEntry}
                            onChange={handleChange}
                        />
                    </TabsContent>

                    {template && (
                        <TabsContent value="template" className="p-6 m-0">
                            <TemplateFieldRenderer
                                template={template}
                                values={formData.customFields || {}}
                                onChange={handleTemplateFieldChange}
                            />
                        </TabsContent>
                    )}

                    <TabsContent value="tags" className="p-6 m-0">
                        {entity && (
                            <TagManager
                                projectId={entity.projectId}
                                entryId={entityId}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="research" className="p-6 m-0">
                        <ResearchTab
                            entity={formData as CodexEntry}
                            onChange={handleChange}
                        />
                    </TabsContent>

                    <TabsContent value="relations" className="p-6 m-0">
                        <RelationsTab entityId={entityId} />
                    </TabsContent>

                    <TabsContent value="mentions" className="p-6 m-0">
                        <MentionsTab entityId={entityId} entityName={formData.name || ''} />
                    </TabsContent>

                    <TabsContent value="tracking" className="p-6 m-0">
                        <TrackingTab entity={formData as CodexEntry} onChange={handleChange} />
                    </TabsContent>
                </div>
            </Tabs>

            <ConfirmationDialog />
        </div>
    );
}
