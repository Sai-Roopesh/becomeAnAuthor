"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { AIConnection, AIVendor } from "@/lib/config/ai-vendors";
import { Switch } from "@/components/ui/switch";
import { VendorLogo } from "../VendorLogo";

/** Maximum number of models to display in the list */
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

/**
 * Right panel form for editing AI connection details.
 */
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
  const isOpenAICloudEndpoint =
    vendor.id === "openai" &&
    (!customEndpoint.trim() ||
      customEndpoint.trim() === "https://api.openai.com/v1");
  const requiresApiKey = vendor.requiresAuth || isOpenAICloudEndpoint;
  const canRefreshModels = loading || (requiresApiKey && !apiKey);

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
    <div className="flex-1 border rounded-md p-4 sm:p-6">
      <ScrollArea className="h-full">
        <div className="space-y-6 pr-4">
          {/* Header with vendor info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <VendorLogo providerId={vendor.id} size={32} />
              <h3 className="text-lg font-semibold">{vendor.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {vendor.description}
            </p>
          </div>

          {/* Connection Name */}
          <div className="space-y-2">
            <Label htmlFor="connection-name">Connection Name</Label>
            <Input
              id="connection-name"
              value={connectionName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Connection"
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">
              {vendor.id === "openai"
                ? "API Key (Optional for Local)"
                : "API Key"}
            </Label>
            <div className="flex gap-2">
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
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {vendor.id === "openai"
                ? "Required for OpenAI cloud endpoint. Optional when using local OpenAI-compatible endpoints."
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

          {/* Custom Endpoint (for OpenAI compatible) */}
          {vendor.id === "openai" && (
            <div className="space-y-2">
              <Label htmlFor="custom-endpoint">
                Custom Endpoint (Optional)
              </Label>
              <Input
                id="custom-endpoint"
                value={customEndpoint}
                onChange={(e) => handleEndpointChange(e.target.value)}
                placeholder="http://localhost:1234/v1"
              />
              <p className="text-xs text-muted-foreground">
                For local LLMs (LM Studio, Ollama, etc.)
              </p>
            </div>
          )}

          {/* Refresh Models */}
          <div className="space-y-2">
            <Label>Available Models</Label>
            <Button
              onClick={onRefreshModels}
              disabled={canRefreshModels}
              variant="outline"
              className="w-full"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Fetching Models..." : "Refresh Models"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {connection.models && connection.models.length > 0 && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-2">
                  {connection.models.length} models available
                </p>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {connection.models
                    .slice(0, MAX_VISIBLE_MODELS)
                    .map((model) => (
                      <div key={model} className="text-muted-foreground">
                        {model}
                      </div>
                    ))}
                  {connection.models.length > MAX_VISIBLE_MODELS && (
                    <div className="text-muted-foreground italic">
                      ... and {connection.models.length - MAX_VISIBLE_MODELS}{" "}
                      more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-md">
            <div>
              <Label htmlFor="enabled-toggle" className="font-medium">
                Enable Connection
              </Label>
              <p className="text-xs text-muted-foreground">
                Disabled connections won&apos;t be used by the app
              </p>
            </div>
            <Switch
              id="enabled-toggle"
              checked={connection.enabled}
              onCheckedChange={onToggleEnabled}
            />
          </div>

          {requiresApiKey && !apiKey && (
            <p className="text-xs text-destructive">
              This provider needs an API key before it can be used.
            </p>
          )}

          {/* Delete Button */}
          <div className="pt-4 border-t">
            <Button onClick={onDelete} variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Connection
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
