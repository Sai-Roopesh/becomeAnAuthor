'use client';

import { AIProvider } from '@/lib/config/ai-vendors';

/**
 * Mapping of AI providers to their @lobehub/icons-static-svg icon names
 */
const PROVIDER_ICONS: Record<AIProvider, string> = {
    openrouter: 'openrouter',
    google: 'google-color',
    anthropic: 'anthropic',
    openai: 'openai',
    mistral: 'mistral-color',
    deepseek: 'deepseek-color',
    groq: 'groq',
    cohere: 'cohere-color',
    xai: 'xai',
    azure: 'azure-color',
    togetherai: 'together-color',
    fireworks: 'fireworks-color',
    perplexity: 'perplexity-color',
    kimi: 'moonshot',
};

/**
 * AI Vendor Logo Component
 * Uses official brand logos from @lobehub/icons-static-svg via unpkg CDN
 */
export function VendorLogo({
    providerId,
    size = 24,
    className = '',
}: {
    providerId: AIProvider;
    size?: number;
    className?: string;
}) {
    const iconName = PROVIDER_ICONS[providerId] || 'openai';
    const iconUrl = `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${iconName}.svg`;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={iconUrl}
            alt={`${providerId} logo`}
            width={size}
            height={size}
            className={`object-contain ${className}`}
            loading="lazy"
        />
    );
}
