"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AIConnection, AIVendor } from "@/lib/config/ai-vendors";
import { VendorLogo } from "../VendorLogo";

const MAX_VISIBLE_MODELS = 10;

interface ConnectionFormProps {
  connection: AIConnection;
  vendor: AIVendor;
  onSave: (updates: {
    name?: string;
    apiKey?: string;
    customEndpoint?: string;
    models?: string[];
  }) => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  onRefreshModels: () => void;
  loading: boolean;
  error: string;
}

export function ConnectionForm({
  connection,
  vendor,
  onSave,
  onToggleEnabled,
  onDelete,
  onRefreshModels,
  loading,
  error,
}: ConnectionFormProps) {
  const [connectionName, setConnectionName] = useState(connection.name);
  const [apiKey, setApiKey] = useState(connection.apiKey);
  const [customEndpoint, setCustomEndpoint] = useState(
    connection.customEndpoint || "",
  );
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setConnectionName(connection.name);
    setApiKey(connection.apiKey);
    setCustomEndpoint(connection.customEndpoint || "");
  }, [
    connection.id,
    connection.name,
    connection.apiKey,
    connection.customEndpoint,
  ]);

  const isOpenAICloudEndpoint =
    vendor.id === "openai" &&
    (!customEndpoint.trim() ||
      customEndpoint.trim() === "https://api.openai.com/v1");
  const requiresApiKey = vendor.requiresAuth || isOpenAICloudEndpoint;
  const canRefreshModels = loading || (requiresApiKey && !apiKey.trim());

  const handleNameChange = (value: string) => {
    setConnectionName(value);
    onSave({ name: value });
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    onSave({ apiKey: value });
  };

  const handleEndpointChange = (value: string) => {
    setCustomEndpoint(value);
    onSave({ customEndpoint: value });
  };

  return (
    <div className="min-w-0 overflow-x-hidden rounded-xl border bg-card p-4 sm:p-6">
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <VendorLogo providerId={vendor.id} size={32} />
            <h4 className="text-lg font-semibold">{vendor.name}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{vendor.description}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="connection-name">Connection Name</Label>
          <Input
            id="connection-name"
            value={connectionName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Connection"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="api-key">
            {vendor.id === "openai"
              ? "API Key (Optional for Local)"
              : "API Key"}
          </Label>
          <div className="flex min-w-0 gap-2">
            <Input
              id="api-key"
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={vendor.apiKeyPlaceholder}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowApiKey((current) => !current)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {vendor.id === "openai"
              ? "Required for the OpenAI cloud endpoint. Optional for local OpenAI-compatible endpoints."
              : "Get your API key from "}
            {vendor.id !== "openai" && (
              <a
                href={vendor.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {vendor.setupUrl}
              </a>
            )}
          </p>
        </div>

        {vendor.id === "openai" && (
          <div className="space-y-2">
            <Label htmlFor="custom-endpoint">Custom Endpoint (Optional)</Label>
            <Input
              id="custom-endpoint"
              value={customEndpoint}
              onChange={(e) => handleEndpointChange(e.target.value)}
              placeholder="http://localhost:1234/v1"
            />
            <p className="text-xs text-muted-foreground">
              Use this for local providers such as LM Studio or Ollama.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Available Models</Label>
          <Button
            onClick={onRefreshModels}
            disabled={canRefreshModels}
            variant="outline"
            className="w-full"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Fetching Models..." : "Refresh Models"}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {connection.models && connection.models.length > 0 && (
            <div className="mt-2 rounded-md bg-muted p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                {connection.models.length} models available
              </p>
              <div className="max-h-36 space-y-1 overflow-y-auto text-xs">
                {connection.models.slice(0, MAX_VISIBLE_MODELS).map((model) => (
                  <div key={model} className="break-all text-muted-foreground">
                    {model}
                  </div>
                ))}
                {connection.models.length > MAX_VISIBLE_MODELS && (
                  <div className="italic text-muted-foreground">
                    ... and {connection.models.length - MAX_VISIBLE_MODELS} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <Label htmlFor="enabled-toggle" className="font-medium">
              Enable Connection
            </Label>
            <p className="text-xs text-muted-foreground">
              Disabled connections are ignored when selecting models.
            </p>
          </div>
          <Switch
            id="enabled-toggle"
            checked={connection.enabled}
            onCheckedChange={onToggleEnabled}
          />
        </div>

        {requiresApiKey && !apiKey.trim() && (
          <p className="text-xs text-destructive">
            This provider needs an API key before it can be used.
          </p>
        )}

        <div className="border-t pt-3">
          <Button onClick={onDelete} variant="destructive" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Connection
          </Button>
        </div>
      </div>
    </div>
  );
}
