'use client';

import { useState, useCallback } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('AppUpdater');

/**
 * Hook for checking and installing app updates.
 * Uses Tauri's built-in updater with GitHub Releases.
 */
export function useAppUpdater() {
    const [checking, setChecking] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [update, setUpdate] = useState<Update | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkForUpdates = useCallback(async (): Promise<Update | null> => {
        setChecking(true);
        setError(null);

        try {
            const updateResult = await check();
            setUpdate(updateResult);
            return updateResult;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to check for updates';
            setError(message);
            log.error('Failed to check for updates:', err);
            return null;
        } finally {
            setChecking(false);
        }
    }, []);

    const downloadAndInstall = useCallback(async () => {
        if (!update) {
            setError('No update available');
            return;
        }

        setDownloading(true);
        setError(null);
        setProgress(0);

        try {
            let contentLength = 0;
            let downloaded = 0;

            await update.downloadAndInstall((event) => {
                if (event.event === 'Started' && event.data.contentLength) {
                    contentLength = event.data.contentLength;
                } else if (event.event === 'Progress') {
                    downloaded += event.data.chunkLength;
                    if (contentLength > 0) {
                        const percent = Math.round((downloaded / contentLength) * 100);
                        setProgress(percent);
                    }
                } else if (event.event === 'Finished') {
                    setProgress(100);
                }
            });

            // Relaunch the app after update
            await relaunch();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to install update';
            setError(message);
            log.error('Update installation failed:', err);
        } finally {
            setDownloading(false);
        }
    }, [update]);

    return {
        checking,
        downloading,
        progress,
        update,
        error,
        checkForUpdates,
        downloadAndInstall,
    };
}

/**
 * Simple function to check for updates and prompt the user.
 * Can be called on app startup or from a menu item.
 */
export async function checkForAppUpdates(options?: { silent?: boolean }): Promise<void> {
    try {
        const update = await check();

        if (update) {
            const shouldUpdate = options?.silent
                ? true // Auto-update in silent mode
                : confirm(
                    `A new version (${update.version}) is available!\n\n` +
                    `${update.body || 'No release notes available.'}\n\n` +
                    `Would you like to download and install it now?`
                );

            if (shouldUpdate) {
                await update.downloadAndInstall();
                await relaunch();
            }
        } else if (!options?.silent) {
            alert('You are running the latest version!');
        }
    } catch (err) {
        log.error('Update check failed:', err);
        if (!options?.silent) {
            alert('Failed to check for updates. Please try again later.');
        }
    }
}
