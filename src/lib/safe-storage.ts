/**
 * Safe localStorage wrapper with error handling
 * Prevents app crashes from localStorage quota exceeded, malformed JSON, or disabled storage
 */

import { toast } from './toast-service';

class SafeStorage {
    /**
     * Safely get an item from localStorage with fallback
     */
    getItem<T>(key: string, fallback: T): T {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return fallback;

            return JSON.parse(item) as T;
        } catch (error) {
            console.error(`Failed to read from localStorage (${key}):`, error);
            return fallback;
        }
    }

    /**
     * Safely set an item in localStorage
     * Returns false if storage quota exceeded or storage is disabled
     */
    setItem(key: string, value: any): boolean {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error(`Failed to write to localStorage (${key}):`, error);

            // Handle quota exceeded
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                toast.error('Storage quota exceeded. Please clear some data.', {
                    action: {
                        label: 'Clear Cache',
                        onClick: () => this.clearCache(),
                    },
                });
            } else {
                toast.error('Failed to save settings. Check browser storage settings.');
            }

            return false;
        }
    }

    /**
     * Remove an item from localStorage
     */
    removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Failed to remove from localStorage (${key}):`, error);
        }
    }

    /**
     * Clear non-essential cache items to free up space
     */
    private clearCache(): void {
        try {
            // Clear backup scenes (emergency only)
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('backup_scene_')) {
                    localStorage.removeItem(key);
                }
            });
            toast.success('Cache cleared successfully');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    /**
     * Check if localStorage is available
     */
    isAvailable(): boolean {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }
}

export const storage = new SafeStorage();
