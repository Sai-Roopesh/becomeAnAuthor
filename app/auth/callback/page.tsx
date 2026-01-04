/**
 * OAuth 2.0 Callback Handler
 * Handles redirect from Google after user authorization
 * 
 * Uses Suspense boundary for static export compatibility (Tauri).
 * useSearchParams() requires a Suspense boundary when using static export.
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { googleAuthService } from '@/infrastructure/services/google-auth-service';
import { toast } from '@/shared/utils/toast-service';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get authorization code from URL
                const code = searchParams?.get('code');
                const error = searchParams?.get('error');

                if (error) {
                    throw new Error(error === 'access_denied'
                        ? 'You denied access to Google Drive'
                        : `Authorization failed: ${error}`
                    );
                }

                if (!code) {
                    throw new Error('No authorization code received');
                }

                // Exchange code for tokens
                await googleAuthService.handleCallback(code);

                setStatus('success');
                toast.success('Successfully connected to Google Drive!');

                // Redirect to settings after 2 seconds
                setTimeout(() => {
                    router.push('/');
                }, 2000);

            } catch (error) {
                console.error('OAuth callback error:', error);
                const message = error instanceof Error ? error.message : 'Failed to connect';
                setErrorMessage(message);
                setStatus('error');
                toast.error(message);

                // Redirect back to app after 3 seconds
                setTimeout(() => {
                    router.push('/');
                }, 3000);
            }
        };

        if (searchParams) {
            handleCallback();
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full p-6 space-y-4 text-center">
                {status === 'processing' && (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <h1 className="text-xl font-semibold">Completing sign-in...</h1>
                        <p className="text-sm text-muted-foreground">
                            Please wait while we connect your Google Drive
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="text-green-500 text-5xl">✓</div>
                        <h1 className="text-xl font-semibold">Success!</h1>
                        <p className="text-sm text-muted-foreground">
                            Google Drive connected successfully. Redirecting...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="text-destructive text-5xl">✗</div>
                        <h1 className="text-xl font-semibold">Connection Failed</h1>
                        <p className="text-sm text-destructive">
                            {errorMessage}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Redirecting to app...
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full p-6 space-y-4 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <h1 className="text-xl font-semibold">Loading...</h1>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <AuthCallbackContent />
        </Suspense>
    );
}
