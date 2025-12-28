'use client';

import { useState } from 'react';
import { useLiveQuery, invalidateQueries } from '@/hooks/use-live-query';
import { useCodexTagRepository } from '@/hooks/use-codex-tag-repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { toast } from '@/shared/utils/toast-service';

interface TagManagerProps {
    seriesId: string;
    entryId: string;
}

/**
 * Tag Manager Component
 * 
 * ✅ ARCHITECTURE COMPLIANCE:
 * - Repository hook usage (NOT db directly)
 * - Toast service abstraction
 * - Feature component location
 * - 'use client' directive
 */
export function TagManager({ seriesId, entryId }: TagManagerProps) {
    const tagRepo = useCodexTagRepository();
    const [newTagName, setNewTagName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // ✅ Repository hooks + live queries
    const allTags = useLiveQuery(
        () => tagRepo.getByProject(seriesId),
        [seriesId]
    );

    const entryTags = useLiveQuery(
        () => tagRepo.getTagsByEntry(entryId),
        [entryId]
    );

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        setIsAdding(true);
        try {
            const newTag = await tagRepo.create({
                projectId: seriesId, // Using seriesId for series-first architecture
                name: newTagName.trim(),
                color: generateRandomColor(),
            });

            await tagRepo.addTagToEntry(entryId, newTag.id);
            invalidateQueries(); // Refresh tags
            setNewTagName('');
            toast.success('Tag created and added');
        } catch (error) {
            console.error('Failed to create tag:', error);
            toast.error('Failed to create tag');
        } finally {
            setIsAdding(false);
        }
    };

    const handleAddExistingTag = async (tagId: string) => {
        try {
            await tagRepo.addTagToEntry(entryId, tagId);
            invalidateQueries(); // Refresh tags
            toast.success('Tag added');
        } catch (error) {
            console.error('Failed to add tag:', error);
            toast.error('Failed to add tag');
        }
    };

    const handleRemoveTag = async (tagId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await tagRepo.removeTagFromEntry(entryId, tagId);
            invalidateQueries(); // Refresh tags
            toast.success('Tag removed');
        } catch (error) {
            console.error('Failed to remove tag:', error);
            toast.error('Failed to remove tag');
        }
    };

    const availableTags = allTags?.filter(t =>
        !entryTags?.some(et => et.id === t.id)
    ) || [];

    return (
        <div className="space-y-4">
            {/* Current Tags */}
            <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                    {entryTags && entryTags.length > 0 ? (
                        entryTags.map(tag => (
                            <Badge
                                key={tag.id}
                                variant="secondary"
                                style={{
                                    backgroundColor: tag.color + '20',
                                    borderColor: tag.color,
                                    color: tag.color
                                }}
                                className="border"
                            >
                                {tag.name}
                                <X
                                    className="h-3 w-3 ml-1 cursor-pointer hover:opacity-70"
                                    onClick={(e) => handleRemoveTag(tag.id, e)}
                                />
                            </Badge>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No tags yet</p>
                    )}
                </div>
            </div>

            {/* Add New Tag */}
            <div>
                <h4 className="text-sm font-medium mb-2">Add New Tag</h4>
                <div className="flex gap-2">
                    <Input
                        placeholder="Tag name..."
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleCreateTag()}
                        disabled={isAdding}
                    />
                    <Button
                        size="icon"
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim() || isAdding}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Existing Tags */}
            {availableTags.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium mb-2">Or add existing tag:</h4>
                    <div className="flex flex-wrap gap-1">
                        {availableTags.map(tag => (
                            <Badge
                                key={tag.id}
                                variant="outline"
                                className="cursor-pointer hover:bg-accent"
                                onClick={() => handleAddExistingTag(tag.id)}
                                style={{ borderColor: tag.color + '40' }}
                            >
                                {tag.name}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function generateRandomColor(): string {
    const colors = [
        '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
    ];
    return colors[Math.floor(Math.random() * colors.length)] ?? '#3b82f6';
}
