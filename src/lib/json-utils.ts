/**
 * Safe JSON parsing utilities
 * Prevents application crashes from malformed JSON or localStorage errors
 */

export function safeJsonParse<T>(json: string | null, fallback: T): T {
    if (!json) return fallback;

    try {
        return JSON.parse(json) as T;
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return fallback;
    }
}

export function safeLocalStorageGet<T>(key: string, fallback: T): T {
    try {
        const item = localStorage.getItem(key);
        return safeJsonParse(item, fallback);
    } catch (error) {
        console.error(`Failed to read localStorage key "${key}":`, error);
        return fallback;
    }
}

export function safeLocalStorageSet(key: string, value: any): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Failed to write localStorage key "${key}":`, error);
        return false;
    }
}
