/**
 * AI Usage Stats Component
 * Displays token usage and estimated costs
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, DollarSign, Zap } from 'lucide-react';

// Define types since usage tracker module doesn't exist yet
interface VendorUsage {
    tokens: number;
    cost: number;
}

interface UsageStats {
    requestCount: number;
    totalTokens: number;
    totalCost: number;
    avgTokensPerRequest: number;
    successRate: number;
    byVendor: Record<string, VendorUsage>;
}

// Mock function until actual usage tracker is implemented
async function mockGetStats(startDate: Date): Promise<UsageStats | null> {
    console.log('Mock usage stats for:', startDate);
    return null;
}

interface UsageStatsWidgetProps {
    period?: 'today' | 'week' | 'month' | 'all';
}

export function UsageStatsWidget({ period = 'week' }: UsageStatsWidgetProps) {
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [period]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const now = new Date();
            let startDate: Date;

            switch (period) {
                case 'today':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'all':
                default:
                    startDate = new Date(0);
            }

            const data = await mockGetStats(startDate);
            setStats(data);
        } catch (error) {
            console.error('Failed to load usage stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading usage stats...</div>;
    }

    if (!stats || stats.requestCount === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
                    <CardDescription>No usage data for this period</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toString();
    };

    const vendorColors: Record<string, string> = {
        google: 'text-blue-600',
        openai: 'text-green-600',
        anthropic: 'text-orange-600',
        mistral: 'text-purple-600',
        deepseek: 'text-red-600',
        openrouter: 'text-gray-600'
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    AI Usage ({period})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div className="text-2xl font-bold">{formatNumber(stats.totalTokens)}</div>
                        <div className="text-xs text-muted-foreground">Total Tokens</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {stats.totalCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Estimated Cost</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            {stats.requestCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Requests</div>
                    </div>
                </div>

                {/* Breakdown by Vendor */}
                <div className="space-y-2">
                    <div className="text-sm font-medium">Breakdown by Provider</div>
                    {Object.entries(stats.byVendor as Record<string, VendorUsage>)
                        .sort((a, b) => (b[1] as VendorUsage).tokens - (a[1] as VendorUsage).tokens)
                        .map(([vendor, data]) => {
                            const vendorData = data as VendorUsage;
                            const percentage = (vendorData.tokens / stats.totalTokens) * 100;
                            return (
                                <div key={vendor} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className={`capitalize ${vendorColors[vendor] || 'text-foreground'}`}>
                                            {vendor}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {percentage.toFixed(1)}% (${vendorData.cost.toFixed(2)})
                                        </span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs text-muted-foreground">
                    <div>
                        <div>{formatNumber(stats.avgTokensPerRequest)} tokens/request</div>
                    </div>
                    <div>
                        <div>{(stats.successRate * 100).toFixed(1)}% success rate</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
