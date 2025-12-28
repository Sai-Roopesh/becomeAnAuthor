'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { AIProvider, AI_VENDORS, AIConnection, getAllVendors, validateApiKey } from '@/lib/config/ai-vendors';
import { fetchModelsForConnection } from '@/lib/ai';
import { Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { VendorLogo } from './VendorLogo';


interface NewConnectionDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (connection: AIConnection) => void;
}

export function NewConnectionDialog({ open, onClose, onSave }: NewConnectionDialogProps) {
    const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
    const [connectionName, setConnectionName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [customEndpoint, setCustomEndpoint] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const vendors = getAllVendors();

    const handleSelectProvider = (providerId: AIProvider) => {
        setSelectedProvider(providerId);
        const vendor = AI_VENDORS[providerId];
        setConnectionName(vendor.name);
        setApiKey('');
        setCustomEndpoint('');
        setError('');
    };

    const handleBack = () => {
        setSelectedProvider(null);
        setConnectionName('');
        setApiKey('');
        setCustomEndpoint('');
        setError('');
    };

    const handleSave = async () => {
        if (!selectedProvider) return;

        // Validate
        if (!connectionName.trim()) {
            setError('Please enter a connection name');
            return;
        }

        const vendor = AI_VENDORS[selectedProvider];
        if (vendor.requiresAuth && !apiKey.trim()) {
            setError('Please enter an API key');
            return;
        }

        if (vendor.requiresAuth && !validateApiKey(selectedProvider, apiKey)) {
            setError(`Invalid API key format for ${vendor.name}`);
            return;
        }

        if (selectedProvider === 'openai' && !customEndpoint.trim()) {
            setError('Please enter a custom endpoint');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Create connection object
            const connection: AIConnection = {
                id: `${selectedProvider}-${Date.now()}`,
                name: connectionName,
                provider: selectedProvider,
                apiKey,
                ...(selectedProvider === 'openai' && customEndpoint && { customEndpoint }),
                enabled: true,
                models: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            // Try to fetch models
            const models = await fetchModelsForConnection(connection);
            connection.models = models;

            onSave(connection);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create connection');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedProvider(null);
        setConnectionName('');
        setApiKey('');
        setCustomEndpoint('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {!selectedProvider ? 'Add AI Connection' : `Configure ${AI_VENDORS[selectedProvider].name}`}
                    </DialogTitle>
                </DialogHeader>

                {!selectedProvider ? (
                    // Provider Selection
                    <div className="flex-1 min-h-0 py-2">
                        <p className="text-sm text-muted-foreground mb-4">
                            Select an AI vendor to add to your connections
                        </p>

                        <ScrollArea className="h-[50vh]">
                            <div className="grid gap-3 pr-4">
                                {vendors.map((vendor) => (
                                    <button
                                        key={vendor.id}
                                        onClick={() => handleSelectProvider(vendor.id)}
                                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent transition-colors text-left"
                                    >
                                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
                                            <VendorLogo providerId={vendor.id} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium">{vendor.name}</h3>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {vendor.description}
                                            </p>
                                        </div>
                                        <Check className="h-5 w-5 text-muted-foreground opacity-0 flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    // Configuration Form
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="connectionName" className="text-sm font-medium">
                                Connection Name
                            </Label>
                            <Input
                                id="connectionName"
                                value={connectionName}
                                onChange={(e) => setConnectionName(e.target.value)}
                                placeholder="E.g., My Google AI"
                                className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Give this connection a name to identify it
                            </p>
                        </div>

                        {selectedProvider === 'openai' && (
                            <div>
                                <Label htmlFor="customEndpoint" className="text-sm font-medium">
                                    API Endpoint
                                </Label>
                                <Input
                                    id="customEndpoint"
                                    value={customEndpoint}
                                    onChange={(e) => setCustomEndpoint(e.target.value)}
                                    placeholder="https://api.openai.com/v1"
                                    className="mt-2"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    For local models, use: http://localhost:1234/v1 (LM Studio) or http://localhost:11434/v1 (Ollama)
                                </p>
                            </div>
                        )}

                        {AI_VENDORS[selectedProvider].requiresAuth && (
                            <div>
                                <Label htmlFor="apiKey" className="text-sm font-medium">
                                    API Key
                                </Label>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        id="apiKey"
                                        type={showApiKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={AI_VENDORS[selectedProvider].apiKeyPlaceholder}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                    >
                                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Get your API key from{' '}
                                    <a
                                        href={AI_VENDORS[selectedProvider].setupUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline"
                                    >
                                        {AI_VENDORS[selectedProvider].name}
                                    </a>
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {selectedProvider ? (
                        <>
                            <Button variant="outline" onClick={handleBack} disabled={loading}>
                                Back
                            </Button>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {loading ? 'Adding Connection...' : 'Add Connection'}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
