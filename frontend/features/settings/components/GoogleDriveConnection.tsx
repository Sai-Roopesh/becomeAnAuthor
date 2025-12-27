/**
 * Google Drive Connection Component
 * Displays Google Drive connection status and quota info
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleAuth } from '@/features/google-drive/hooks/use-google-auth';
import { useGoogleDrive } from '@/features/google-drive/hooks/use-google-drive';
import { Cloud } from 'lucide-react';
import { toast } from '@/shared/utils/toast-service';
import { DriveQuota } from '@/domain/entities/types';

export function GoogleDriveConnection() {
    const { isAuthenticated, user, isLoading, signIn, signOut } = useGoogleAuth();
    const { getQuota } = useGoogleDrive();
    const [quota, setQuota] = useState<DriveQuota | null>(null);
    const [loadingQuota, setLoadingQuota] = useState(false);

    // Fetch storage quota when authenticated
    useEffect(() => {
        async function fetchQuota() {
            if (isAuthenticated) {
                setLoadingQuota(true);
                try {
                    const driveQuota = await getQuota();
                    setQuota(driveQuota);
                } catch (error) {
                    console.error('Failed to fetch quota:', error);
                } finally {
                    setLoadingQuota(false);
                }
            }
        }

        fetchQuota();
    }, [isAuthenticated]);

    const handleSignIn = async () => {
        try {
            await signIn();
        } catch (error) {
            toast.error('Failed to connect Google Drive');
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            setQuota(null);
            toast.success('Disconnected from Google Drive');
        } catch (error) {
            toast.error('Failed to disconnect');
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 GB';
        const gb = bytes / (1024 ** 3);
        return `${gb.toFixed(2)} GB`;
    };

    const getUsagePercentage = (): number => {
        if (!quota || quota.limit === 0) return 0;
        return (quota.usage / quota.limit) * 100;
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Google Drive</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Google Drive Backup</CardTitle>
                    <CardDescription>
                        Securely back up your novels to your personal Google Drive account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Connect your Google Drive to enable cloud backups. Your data will be stored in your own Google Drive account - we never see or store your files.
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                            <li>Backup projects from project menu</li>
                            <li>Restore from home screen</li>
                            <li>Your data stays in your control</li>
                        </ul>
                    </div>
                    <Button onClick={handleSignIn} className="w-full">
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Connect Google Drive
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-green-600" />
                    Google Drive Connected
                </CardTitle>
                <CardDescription>
                    Your backup destination is ready
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* User Info */}
                <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                    {user?.picture && (
                        <img
                            src={user.picture}
                            alt={user.name}
                            className="w-12 h-12 rounded-full"
                        />
                    )}
                    <div className="flex-1">
                        <p className="font-medium">{user?.name}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                </div>

                {/* Storage Quota */}
                {loadingQuota ? (
                    <div className="text-sm text-muted-foreground">Loading storage info...</div>
                ) : quota && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Drive Storage</span>
                            <span>{formatBytes(quota.usage)} / {formatBytes(quota.limit)}</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {(100 - getUsagePercentage()).toFixed(1)}% available
                        </p>
                    </div>
                )}

                {/* Quick Access Info */}
                <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-medium">Quick Access</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Backup: Project menu → "Backup to Google Drive"</li>
                        <li>• Restore: Home screen → "Restore Project"</li>
                    </ul>
                </div>

                {/* Disconnect Button */}
                <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="w-full"
                >
                    Disconnect Google Drive
                </Button>
            </CardContent>
        </Card>
    );
}
