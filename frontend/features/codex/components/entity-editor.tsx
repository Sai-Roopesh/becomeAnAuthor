'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import { useCodexRepository } from '@/hooks/use-codex-repository';
import { useCodexTemplateRepository } from '@/hooks/use-codex-template-repository';
import { CodexEntry, CodexCategory } from '@/lib/config/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Extracted sub-components
import { EntityEditorHeader } from './entity-editor/EntityEditorHeader';
import { EntityEditorInfoCard } from './entity-editor/EntityEditorInfoCard';

/**
 * EntityEditor - Main Codex Entity Editor
 * 
 * Orchestrates entity editing using decomposed sub-components:
 * - EntityEditorHeader: Navigation and action buttons
 * - EntityEditorInfoCard: Entity info display
 * - Tab components for different aspects (Details, Research, Relations, etc.)
 * 
 * Reduced from 282 lines to ~210 lines via component decomposition.
 */
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
            customFields: { ...prev.customFields, [fieldId]: value }
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
            await codexRepo.update(entityId, { templateId: undefined, customFields: {} });
            toast.success('Template cleared - you can now change the category');
        }
    };

    if (!entity) return <div className="p-4">Loading...</div>;

    const mentionCount = 0; // TODO: Calculate based on actual mentions

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b">
                <EntityEditorHeader
                    onBack={onBack}
                    onSave={handleSave}
                    onDelete={handleDeleteClick}
                />
                <EntityEditorInfoCard
                    formData={formData}
                    hasTemplate={!!entity?.templateId}
                    mentionCount={mentionCount}
                    onNameChange={(name: string) => handleChange('name', name)}
                    onCategoryChange={(category: CodexCategory) => handleChange('category', category)}
                    onClearTemplate={handleClearTemplate}
                />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto overflow-x-auto flex-nowrap scrollbar-hide">
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
                        <DetailsTab entity={formData as CodexEntry} onChange={handleChange} />
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
                        {entity && <TagManager projectId={entity.projectId} entryId={entityId} />}
                    </TabsContent>

                    <TabsContent value="research" className="p-6 m-0">
                        <ResearchTab entity={formData as CodexEntry} onChange={handleChange} />
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

