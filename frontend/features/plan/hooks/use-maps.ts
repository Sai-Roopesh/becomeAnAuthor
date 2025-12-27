/**
 * useMaps hook
 * Encapsulates map management logic using MapRepository
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { ProjectMap } from '@/domain/entities/types';
import { toast } from '@/shared/utils/toast-service';

interface UseMapsProps {
    projectId: string;
}

export function useMaps({ projectId }: UseMapsProps) {
    const { mapRepository } = useAppServices();
    const [maps, setMaps] = useState<ProjectMap[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMaps = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const data = await mapRepository.list(projectId);
            setMaps(data);
        } catch (error) {
            console.error('Failed to fetch maps:', error);
            toast.error('Failed to load maps');
        } finally {
            setLoading(false);
        }
    }, [projectId, mapRepository]);

    useEffect(() => {
        fetchMaps();
    }, [fetchMaps]);

    const saveMap = async (map: ProjectMap) => {
        try {
            await mapRepository.save(projectId, map);
            await fetchMaps();
            toast.success('Map saved successfully');
        } catch (error) {
            console.error('Failed to save map:', error);
            toast.error('Failed to save map');
            throw error;
        }
    };

    const deleteMap = async (mapId: string) => {
        try {
            await mapRepository.delete(projectId, mapId);
            await fetchMaps();
            toast.success('Map deleted successfully');
        } catch (error) {
            console.error('Failed to delete map:', error);
            toast.error('Failed to delete map');
            throw error;
        }
    };

    const uploadImage = async (mapId: string, file: File): Promise<string> => {
        try {
            const buffer = await file.arrayBuffer();
            const imageData = Array.from(new Uint8Array(buffer));
            const path = await mapRepository.uploadImage(projectId, mapId, imageData, file.name);
            await fetchMaps();
            return path;
        } catch (error) {
            console.error('Failed to upload image:', error);
            toast.error('Failed to upload image');
            throw error;
        }
    };

    return {
        maps,
        loading,
        refresh: fetchMaps,
        saveMap,
        deleteMap,
        uploadImage
    };
}
