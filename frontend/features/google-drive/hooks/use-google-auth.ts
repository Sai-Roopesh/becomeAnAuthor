/**
 * React hook for Google OAuth authentication
 * Manages authentication state and provides auth methods
 */

'use client';

import { useState, useEffect } from 'react';
import { googleAuthService } from '@/infrastructure/services/google-auth-service';
import { GoogleUser } from '@/domain/entities/types';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('GoogleAuth');

export function useGoogleAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = () => {
            const authenticated = googleAuthService.isAuthenticated();
            setIsAuthenticated(authenticated);

            if (authenticated) {
                const userInfo = googleAuthService.getUserInfo();
                setUser(userInfo);
            }

            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const signIn = async () => {
        try {
            await googleAuthService.signIn();
            // User will be redirected to Google
        } catch (error) {
            log.error('Sign-in error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await googleAuthService.signOut();
            setIsAuthenticated(false);
            setUser(null);
        } catch (error) {
            log.error('Sign-out error:', error);
            throw error;
        }
    };

    return {
        isAuthenticated,
        user,
        isLoading,
        signIn,
        signOut,
    };
}
