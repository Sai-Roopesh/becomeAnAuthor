/**
 * Safe localStorage wrapper with error handling
 * Prevents app crashes from localStorage quota exceeded, malformed JSON, or disabled storage
 */

import { toast } from "@/core/toast";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("SafeStorage");

// Check if we're in a browser environment
const isBrowser =
  typeof window !== "undefined" && typeof localStorage !== "undefined";

class SafeStorage {
  /**
   * Safely get an item from localStorage with fallback
   * Handles both JSON-encoded values (new) and plain strings (legacy)
   */
  getItem<T>(key: string, fallback: T): T {
    // Return fallback during SSR
    if (!isBrowser) return fallback;

    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;

      // Try to parse as JSON first (new format)
      try {
        return JSON.parse(item) as T;
      } catch {
        // Only return raw string if fallback is string type
        if (typeof fallback === "string") {
          return item as T;
        }
        log.warn(`Malformed storage value for ${key}, using fallback`);
        return fallback;
      }
    } catch (error) {
      log.error(`Failed to read from localStorage (${key}):`, error);
      return fallback;
    }
  }

  /**
   * Safe wrapper for localStorage.setItem
   */
  setItem<T>(key: string, value: T): boolean {
    if (!isBrowser || !this.isAvailable()) return false;
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      log.error(`Failed to write to localStorage (${key}):`, error);

      // Handle quota exceeded
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        toast.error("Storage quota exceeded. Please clear some data.", {
          action: {
            label: "Clear Cache",
            onClick: () => this.clearCache(),
          },
        });
      } else {
        toast.error("Failed to save settings. Check browser storage settings.");
      }

      return false;
    }
  }

  /**
   * Remove an item from localStorage
   */
  removeItem(key: string): void {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      log.error(`Failed to remove from localStorage (${key}):`, error);
    }
  }

  /**
   * Clear non-essential cache items to free up space
   */
  private clearCache(): void {
    if (!isBrowser) return;
    try {
      // Clear backup scenes (emergency only)
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("backup_scene_")) {
          localStorage.removeItem(key);
        }
      });
      toast.success("Cache cleared successfully");
    } catch (error) {
      log.error("Failed to clear cache:", error);
    }
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    if (!isBrowser) return false;
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

export const storage = new SafeStorage();
