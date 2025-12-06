'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, RefreshCw, Eye, EyeOff, Plus } from 'lucide-react';
import { AIConnection, AIProvider, AI_VENDORS } from '@/lib/config/ai-vendors';
import { fetchModelsForConnection } from '@/lib/core/ai-client';
import { NewConnectionDialog } from './new-connection-dialog';
import { useConfirmation } from '@/hooks/use-confirmation';
import { storage } from '@/lib/safe-storage';

export function AIConnectionsTab() {
    const [connections, setConnections] = useState<AIConnection[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [connectionName, setConnectionName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [customEndpoint, setCustomEndpoint] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [models, setModels] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showNewDialog, setShowNewDialog] = useState(false);

    useEffect(() => {
        loadConnections();
    }, []);

    useEffect(() => {
        const selected = connections.find(c => c.id === selectedId);
        if (selected) {
            setConnectionName(selected.name);
            setApiKey(selected.apiKey);
            setCustomEndpoint(selected.customEndpoint || '');
            setModels(selected.models || []);
        }
    }, [selectedId, connections]);

    const loadConnections = () => {
        const parsed = storage.getItem<AIConnection[]>('ai_connections', []);

        if (parsed.length > 0) {
            setConnections(parsed);
            if (!selectedId) {
                setSelectedId(parsed[0].id);
            }
        } else {
            initializeDefaultConnection();
        }
    };

    const initializeDefaultConnection = () => {
        // Migrate old OpenRouter key if exists
        const oldKey = storage.getItem<string>('openrouter_api_key', '');
        const defaultConnection: AIConnection = {
            id: 'openrouter-default',
            name: 'OpenRouter',
            provider: 'openrouter',
            apiKey: oldKey || '',
            enabled: true,
            models: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const newConnections = [defaultConnection];
        setConnections(newConnections);
        setSelectedId(defaultConnection.id);
        storage.setItem('ai_connections', newConnections);
    };

    const saveConnection = () => {
        const updated = connections.map(c =>
            c.id === selectedId
                ? {
                    ...c,
                    name: connectionName,
                    apiKey,
                    customEndpoint: c.provider === 'openai' ? customEndpoint : undefined,
                    models,
                    updatedAt: Date.now(),
                }
                : c
        );
        setConnections(updated);
        storage.setItem('ai_connections', updated);

        // Legacy support for old OpenRouter key
        const selected = connections.find(c => c.id === selectedId);
        if (selected?.provider === 'openrouter') {
            storage.setItem('openrouter_api_key', apiKey);
        }
    };

    const handleRefreshModels = async () => {
        const connection = connections.find(c => c.id === selectedId);
        if (!connection) return;

        if (!apiKey) {
            setError('Please enter an API key first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const fetchedModels = await fetchModelsForConnection({
                ...connection,
                apiKey,
                customEndpoint,
            });

            setModels(fetchedModels);

            // Auto-save with fetched models
            const updated = connections.map(c =>
                c.id === selectedId
                    ? { ...c, name: connectionName, apiKey, customEndpoint, models: fetchedModels, updatedAt: Date.now() }
                    : c
            );
            setConnections(updated);
            storage.setItem('ai_connections', updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch models');
        } finally {
            setLoading(false);
        }
    };

    const { confirm, ConfirmationDialog } = useConfirmation();

    const handleDelete = async () => {
        if (connections.length === 1) {
            setError('Cannot delete the last connection');
            return;
        }

        const confirmed = await confirm({
            title: 'Delete Connection',
            description: 'Are you sure you want to delete this connection? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (confirmed) {
            const updated = connections.filter(c => c.id !== selectedId);
            setConnections(updated);
            storage.setItem('ai_connections', updated);
            setSelectedId(updated[0]?.id || '');
        }
    };

    const toggleEnabled = () => {
        const updated = connections.map(c =>
            c.id === selectedId
                ? { ...c, enabled: !c.enabled, updatedAt: Date.now() }
                : c
        );
        setConnections(updated);
        storage.setItem('ai_connections', updated);
    };

    const handleAddConnection = (newConnection: AIConnection) => {
        const updated = [...connections, newConnection];
        setConnections(updated);
        storage.setItem('ai_connections', updated);
        setSelectedId(newConnection.id);
    };

    const selected = connections.find(c => c.id === selectedId);
    const vendor = selected ? AI_VENDORS[selected.provider] : null;

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header with proper spacing to avoid overlap */}
            <div className="flex-none p-6 pr-16 bg-background border-b">
                <h3 className="text-sm font-medium mb-2 uppercase tracking-wide text-muted-foreground">
                    CONNECTED AI VENDORS
                </h3>
                <p className="text-sm text-muted-foreground">
                    These are all your AI connections in this browser. Add or edit new ones using the right column.
                    Organize the list on the left by priority, as the first entry that supports a specific model will be used.
                </p>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex gap-6 p-6 bg-background overflow-hidden">
                {/* Vendor List with improved shadow and contrast */}
                <div className="w-56 flex-none bg-card border rounded-lg shadow-sm overflow-hidden">
                    <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                        <div className="text-sm font-medium">Your connections</div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewDialog(true)}
                            className="h-7 w-7 p-0"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="h-[calc(100%-50px)]">
                        <div className="p-2 space-y-1 bg-card">
                            {connections.map(conn => {
                                const connVendor = AI_VENDORS[conn.provider];
                                return (
                                    <button
                                        key={conn.id}
                                        onClick={() => setSelectedId(conn.id)}
                                        className={`w-full p-2 text-left rounded-md transition-colors ${selectedId === conn.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{connVendor.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{conn.name}</div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase">
                                                        {conn.enabled ? 'On' : 'Off'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {conn.models?.length || 0} models
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>

                {/* Configuration Panel with improved shadow */}
                <div className="flex-1 space-y-4 bg-card border rounded-lg shadow-sm p-6 overflow-y-auto">
                    <div className="flex items-center justify-between bg-card">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{vendor?.icon}</span>
                            <h3 className="text-lg font-medium">{selected?.name || 'Select a connection'}</h3>
                        </div>
                        {selected && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={toggleEnabled}>
                                    {selected.enabled ? 'Disable' : 'Enable'}
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleDelete}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleRefreshModels} disabled={loading}>
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        )}
                    </div>

                    {selected && (
                        <div className="space-y-4 bg-card">
                            <div className="bg-card">
                                <Label htmlFor="connectionName" className="text-sm font-medium">Connection Name</Label>
                                <Input
                                    id="connectionName"
                                    value={connectionName}
                                    onChange={(e) => setConnectionName(e.target.value)}
                                    onBlur={saveConnection}
                                    placeholder="Give your connection a name"
                                    className="mt-2 bg-background border-input shadow-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Give your connection a name so you can easily identify it.
                                </p>
                            </div>

                            {selected.provider === 'openai' && (
                                <div className="bg-card">
                                    <Label htmlFor="customEndpoint" className="text-sm font-medium">API Endpoint</Label>
                                    <Input
                                        id="customEndpoint"
                                        value={customEndpoint}
                                        onChange={(e) => setCustomEndpoint(e.target.value)}
                                        onBlur={saveConnection}
                                        placeholder="https://api.openai.com/v1"
                                        className="mt-2 bg-background border-input shadow-sm"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        For local models: http://localhost:1234/v1 (LM Studio) or http://localhost:11434/v1 (Ollama)
                                    </p>
                                </div>
                            )}

                            {vendor?.requiresAuth && (
                                <div className="bg-card">
                                    <Label htmlFor="apiKey" className="text-sm font-medium">API Key</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            id="apiKey"
                                            type={showApiKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            onBlur={saveConnection}
                                            placeholder={vendor.apiKeyPlaceholder}
                                            className="flex-1 bg-background border-input shadow-sm"
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
                                        You can get your own API key over at{' '}
                                        <a
                                            href={vendor.setupUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline"
                                        >
                                            {vendor.name}
                                        </a>
                                        .
                                    </p>
                                    {error && (
                                        <p className="text-xs text-destructive mt-2">{error}</p>
                                    )}
                                </div>
                            )}

                            <div className="bg-card">
                                <Label className="text-sm font-medium">Supported Models</Label>
                                <ScrollArea className="h-[200px] border rounded-md p-3 mt-2 bg-background shadow-inner">
                                    {models.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Click refresh to load models
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {models.slice(0, 50).map(model => (
                                                <div
                                                    key={model}
                                                    className="px-2 py-1 bg-secondary/80 hover:bg-secondary rounded text-xs font-medium transition-colors"
                                                >
                                                    {model}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex-none p-6 border-t bg-background">
                <h4 className="text-sm font-medium mb-2 uppercase tracking-wide text-muted-foreground">
                    CREDENTIALS ARE STORED PER MACHINE
                </h4>
                <p className="text-sm text-muted-foreground">
                    Your settings are stored <strong>locally in your browser.</strong> You will have to enter them again if you use a
                    different browser or device. We do not store any credentials on our servers to protect your privacy.
                </p>
            </div>

            <NewConnectionDialog
                open={showNewDialog}
                onClose={() => setShowNewDialog(false)}
                onSave={handleAddConnection}
            />

            <ConfirmationDialog />
        </div>
    );
}
