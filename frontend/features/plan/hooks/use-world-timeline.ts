/**
 * useWorldTimeline hook
 * Encapsulates world timeline management logic using WorldTimelineRepository
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { WorldEvent } from '@/domain/entities/types';
import { toast } from '@/shared/utils/toast-service';

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
            console.error('Failed to fetch world events:', error);
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
            console.error('Failed to save event:', error);
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
            console.error('Failed to delete event:', error);
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
