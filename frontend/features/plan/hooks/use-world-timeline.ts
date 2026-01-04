/**
 * useWorldTimeline hook
 * Encapsulates world timeline management logic using WorldTimelineRepository
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { WorldEvent } from '@/domain/entities/types';
import { toast } from '@/shared/utils/toast-service';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('WorldTimeline');

interface UseWorldTimelineProps {
    projectId: string;
}

export function useWorldTimeline({ projectId }: UseWorldTimelineProps) {
    const { worldTimelineRepository } = useAppServices();
    const [events, setEvents] = useState<WorldEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const data = await worldTimelineRepository.list(projectId);
            setEvents(data);
        } catch (error) {
            log.error('Failed to fetch world events:', error);
            toast.error('Failed to load world timeline');
        } finally {
            setLoading(false);
        }
    }, [projectId, worldTimelineRepository]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const saveEvent = async (event: WorldEvent) => {
        try {
            await worldTimelineRepository.save(projectId, event);
            await fetchEvents();
            toast.success('Event saved successfully');
        } catch (error) {
            log.error('Failed to save event:', error);
            toast.error('Failed to save event');
            throw error;
        }
    };

    const deleteEvent = async (eventId: string) => {
        try {
            await worldTimelineRepository.delete(projectId, eventId);
            await fetchEvents();
            toast.success('Event deleted successfully');
        } catch (error) {
            log.error('Failed to delete event:', error);
            toast.error('Failed to delete event');
            throw error;
        }
    };

    return {
        events,
        loading,
        refresh: fetchEvents,
        saveEvent,
        deleteEvent
    };
}
