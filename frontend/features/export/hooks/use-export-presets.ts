import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ExportPreset } from '@/domain/types/export-types';
import { BUILT_IN_PRESETS } from '@/shared/constants/export/export-presets';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('ExportPresets');

/**
 * Hook for managing export presets
 * Provides access to built-in and custom user presets
 */
export function useExportPresets() {
    const [presets, setPresets] = useState<ExportPreset[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<ExportPreset | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Load all available presets (built-in + user custom)
     */
    useEffect(() => {
        const loadPresets = async () => {
            setIsLoading(true);
            try {
                // Load user custom presets from Tauri storage
                const customPresets = await invoke<ExportPreset[]>('list_custom_presets');
                log.debug('Loaded custom presets', { count: customPresets.length });

                // Combine built-in and custom
                const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
                setPresets(allPresets);

                // Set default preset to first available
                if (!selectedPreset && allPresets.length > 0) {
                    setSelectedPreset(allPresets[0] || null);
                }
            } catch (error) {
                log.error('Failed to load export presets:', error);
                // Fall back to built-in only
                setPresets(BUILT_IN_PRESETS);
                if (!selectedPreset && BUILT_IN_PRESETS.length > 0) {
                    setSelectedPreset(BUILT_IN_PRESETS[0] || null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadPresets();
    }, []);

    /**
     * Get a preset by ID
     */
    const getPresetById = useCallback((id: string): ExportPreset | undefined => {
        return presets.find(p => p.id === id);
    }, [presets]);

    /**
     * Save a custom user preset via Tauri
     */
    const saveUserPreset = useCallback(async (preset: ExportPreset): Promise<void> => {
        try {
            await invoke('save_custom_preset', { preset });
            log.debug('Saved custom preset', { id: preset.id });

            // Update local state
            setPresets(prev => {
                const existingIndex = prev.findIndex(p => p.id === preset.id);
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = preset;
                    return updated;
                } else {
                    return [...prev, preset];
                }
            });
        } catch (error) {
            log.error('Failed to save preset', error);
            throw error;
        }
    }, []);

    /**
     * Delete a user preset via Tauri
     * Cannot delete built-in presets
     */
    const deleteUserPreset = useCallback(async (id: string): Promise<void> => {
        // Check if it's a built-in preset
        const isBuiltIn = BUILT_IN_PRESETS.some(p => p.id === id);
        if (isBuiltIn) {
            throw new Error('Cannot delete built-in presets');
        }

        try {
            await invoke('delete_custom_preset', { presetId: id });
            log.debug('Deleted custom preset', { id });

            // Remove from local state
            setPresets(prev => prev.filter(p => p.id !== id));

            // If the deleted preset was selected, select the first available
            if (selectedPreset?.id === id) {
                setSelectedPreset(presets[0] || null);
            }
        } catch (error) {
            log.error('Failed to delete preset', error);
            throw error;
        }
    }, [selectedPreset, presets]);

    /**
     * Duplicate a preset with a new ID
     */
    const duplicatePreset = useCallback((preset: ExportPreset): ExportPreset => {
        return {
            ...preset,
            id: `${preset.id}-copy-${Date.now()}`,
            name: `${preset.name} (Copy)`,
        };
    }, []);

    return {
        presets,
        selectedPreset,
        setSelectedPreset,
        isLoading,
        getPresetById,
        saveUserPreset,
        deleteUserPreset,
        duplicatePreset,
    };
}
