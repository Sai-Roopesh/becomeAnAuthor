import { useState, useEffect, useCallback } from 'react';
import type { ExportPreset } from '@/domain/types/export-types';
import { BUILT_IN_PRESETS } from '@/shared/constants/export/export-presets';

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
                // For now, only built-in presets
                // TODO: Load user custom presets from localStorage or Tauri
                const builtIn = BUILT_IN_PRESETS;
                setPresets(builtIn);

                // Set default preset to industry standard
                if (!selectedPreset && builtIn.length > 0) {
                    setSelectedPreset(builtIn[0] || null);
                }
            } catch (error) {
                console.error('Failed to load export presets:', error);
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
     * Save a custom user preset
     * TODO: Implement saving to localStorage or Tauri storage
     */
    const saveUserPreset = useCallback(async (preset: ExportPreset): Promise<void> => {
        // TODO: Save to localStorage or Tauri
        console.log('Saving user preset:', preset);

        // For now, just add to state
        setPresets(prev => {
            // Check if preset already exists
            const existingIndex = prev.findIndex(p => p.id === preset.id);
            if (existingIndex >= 0) {
                // Update existing
                const updated = [...prev];
                updated[existingIndex] = preset;
                return updated;
            } else {
                // Add new
                return [...prev, preset];
            }
        });
    }, []);

    /**
     * Delete a user preset
     * Cannot delete built-in presets
     */
    const deleteUserPreset = useCallback(async (id: string): Promise<void> => {
        // Check if it's a built-in preset
        const isBuiltIn = BUILT_IN_PRESETS.some(p => p.id === id);
        if (isBuiltIn) {
            throw new Error('Cannot delete built-in presets');
        }

        // TODO: Delete from localStorage or Tauri
        console.log('Deleting user preset:', id);

        // Remove from state
        setPresets(prev => prev.filter(p => p.id !== id));

        // If the deleted preset was selected, select the first available
        if (selectedPreset?.id === id) {
            setSelectedPreset(presets[0] || null);
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
