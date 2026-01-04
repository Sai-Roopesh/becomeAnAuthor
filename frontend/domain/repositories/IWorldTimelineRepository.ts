/**
 * World Timeline Repository Interface
 * 
 * Abstraction for world history events persistence.
 */

import type { WorldEvent } from '@/domain/entities/types';

export interface IWorldTimelineRepository {
    /**
     * List all world events for a project
     * @param projectId - Project ID to get events for
     * @returns All world history events in the project
     */
    list(projectId: string): Promise<WorldEvent[]>;

    /**
     * Save a world event (upsert - creates if not exists, updates if exists)
     * @param projectId - Project ID the event belongs to
     * @param event - World event data to save
     */
    save(projectId: string, event: WorldEvent): Promise<void>;

    /**
     * Delete a world event
     * @param projectId - Project ID the event belongs to
     * @param eventId - Event ID to delete
     */
    delete(projectId: string, eventId: string): Promise<void>;
}
