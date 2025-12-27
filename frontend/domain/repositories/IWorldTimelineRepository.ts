/**
 * World Timeline Repository Interface
 * 
 * Abstraction for world history events persistence.
 */

import type { WorldEvent } from '@/domain/entities/types';

export interface IWorldTimelineRepository {
    /**
     * List all world events for a project
     */
    list(projectId: string): Promise<WorldEvent[]>;

    /**
     * Save a world event (create or update)
     */
    save(projectId: string, event: WorldEvent): Promise<void>;

    /**
     * Delete a world event
     */
    delete(projectId: string, eventId: string): Promise<void>;
}
