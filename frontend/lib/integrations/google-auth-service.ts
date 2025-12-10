/**
 * Google OAuth 2.0 Service with PKCE Flow
 * Implements secure authentication for Single Page Applications
 * No backend required - follows OAuth 2.0 best practices
 */

import { GOOGLE_CONFIG, STORAGE_KEYS } from '@/lib/config/constants';
import { GoogleTokens, GoogleUser } from '@/lib/config/types';
import { storage } from '@/core/storage/safe-storage';

/**
 * Generate cryptographically secure random string for PKCE
 */
function generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues)
        .map(v => charset[v % charset.length])
        .join('');
}

/**
 * Generate SHA256 hash and base64url encode (for PKCE code challenge)
 */
async function sha256(plain: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);

    // Convert to base64url
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

class GoogleAuthService {
    /**
     * Initiate OAuth 2.0 with PKCE flow
     * Redirects user to Google sign-in page
     */
    async signIn(): Promise<void> {
        try {
            // Generate PKCE code verifier and challenge
            const codeVerifier = generateRandomString(128);
            const codeChallenge = await sha256(codeVerifier);

            // Store code verifier in localStorage (needed for token exchange)
            storage.setItem(STORAGE_KEYS.GOOGLE_PKCE_VERIFIER, codeVerifier);

            // Build authorization URL
            const params = new URLSearchParams({
                client_id: GOOGLE_CONFIG.CLIENT_ID,
                redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
                response_type: 'code',
                scope: GOOGLE_CONFIG.SCOPES.join(' '),
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                access_type: 'offline', // Request refresh token
                prompt: 'consent', // Force consent to get refresh token
            });

            // Redirect to Google OAuth
            window.location.href = `${GOOGLE_CONFIG.AUTH_ENDPOINT}?${params}`;
        } catch (error) {
            console.error('OAuth sign-in error:', error);
            throw new Error('Failed to initiate Google sign-in');
        }
    }

    /**
     * Complete OAuth flow after redirect
     * Exchange authorization code for tokens
     */
    async handleCallback(code: string): Promise<void> {
        try {
            // Retrieve code verifier
            const codeVerifier = storage.getItem<string>(STORAGE_KEYS.GOOGLE_PKCE_VERIFIER, '');
            if (!codeVerifier) {
                throw new Error('Missing code verifier');
            }

            // Exchange code for tokens
            const response = await fetch(GOOGLE_CONFIG.TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: GOOGLE_CONFIG.CLIENT_ID,
                    client_secret: GOOGLE_CONFIG.CLIENT_SECRET,
                    code,
                    code_verifier: codeVerifier,
                    grant_type: 'authorization_code',
                    redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error_description || 'Token exchange failed');
            }

            const data = await response.json();

            // Store tokens
            const tokens: GoogleTokens = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + (data.expires_in * 1000),
                scope: data.scope,
            };

            storage.setItem(STORAGE_KEYS.GOOGLE_TOKENS, tokens);

            // Fetch and store user info
            await this.fetchUserInfo(tokens.accessToken);

            // Clean up code verifier
            localStorage.removeItem(STORAGE_KEYS.GOOGLE_PKCE_VERIFIER);

        } catch (error) {
            console.error('OAuth callback error:', error);
            throw new Error('Failed to complete Google sign-in');
        }
    }

    /**
     * Fetch user profile information
     */
    private async fetchUserInfo(accessToken: string): Promise<void> {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const data = await response.json();
        const user: GoogleUser = {
            id: data.id,
            email: data.email,
            name: data.name,
            picture: data.picture,
        };

        storage.setItem(STORAGE_KEYS.GOOGLE_USER, user);
    }

    /**
     * Sign out and revoke access
     */
    async signOut(): Promise<void> {
        try {
            const tokens = storage.getItem<GoogleTokens | null>(STORAGE_KEYS.GOOGLE_TOKENS, null);

            if (tokens?.accessToken) {
                // Revoke token with Google
                await fetch(GOOGLE_CONFIG.REVOKE_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        token: tokens.accessToken,
                    }),
                });
            }
        } catch (error) {
            console.error('Sign-out error:', error);
            // Continue even if revoke fails
        } finally {
            // Clear local storage
            localStorage.removeItem(STORAGE_KEYS.GOOGLE_TOKENS);
            localStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);
            localStorage.removeItem(STORAGE_KEYS.GOOGLE_PKCE_VERIFIER);
        }
    }

    /**
     * Get valid access token (refreshes if expired)
     */
    async getAccessToken(): Promise<string | null> {
        const tokens = storage.getItem<GoogleTokens | null>(STORAGE_KEYS.GOOGLE_TOKENS, null);

        if (!tokens) {
            return null;
        }

        // Check if token is expired (with 5 minute buffer)
        const isExpired = tokens.expiresAt < Date.now() + (5 * 60 * 1000);

        if (isExpired && tokens.refreshToken) {
            // Refresh access token
            await this.refreshAccessToken(tokens.refreshToken);

            // Get new tokens
            const newTokens = storage.getItem<GoogleTokens | null>(STORAGE_KEYS.GOOGLE_TOKENS, null);
            return newTokens?.accessToken || null;
        }

        return tokens.accessToken;
    }

    /**
     * Refresh access token using refresh token
     */
    private async refreshAccessToken(refreshToken: string): Promise<void> {
        try {
            const response = await fetch(GOOGLE_CONFIG.TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: GOOGLE_CONFIG.CLIENT_ID,
                    client_secret: GOOGLE_CONFIG.CLIENT_SECRET,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                }),
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();

            // Update stored tokens
            const existingTokens = storage.getItem<GoogleTokens | null>(STORAGE_KEYS.GOOGLE_TOKENS, null);
            const newTokens: GoogleTokens = {
                accessToken: data.access_token,
                refreshToken: refreshToken, // Keep existing refresh token
                expiresAt: Date.now() + (data.expires_in * 1000),
                scope: data.scope,
            };

            storage.setItem(STORAGE_KEYS.GOOGLE_TOKENS, newTokens);

        } catch (error) {
            console.error('Token refresh error:', error);
            // Clear invalid tokens
            await this.signOut();
            throw new Error('Session expired. Please sign in again.');
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        const tokens = storage.getItem<GoogleTokens | null>(STORAGE_KEYS.GOOGLE_TOKENS, null);
        return !!tokens?.accessToken;
    }

    /**
     * Get stored user information
     */
    getUserInfo(): GoogleUser | null {
        return storage.getItem<GoogleUser | null>(STORAGE_KEYS.GOOGLE_USER, null);
    }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
