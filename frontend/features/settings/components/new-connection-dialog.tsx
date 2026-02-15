"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AIProvider,
  AI_VENDORS,
  AIConnection,
  getAllVendors,
  validateApiKey,
} from "@/lib/config/ai-vendors";
import { fetchModelsForConnection } from "@/lib/ai";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { VendorLogo } from "./VendorLogo";

// Static schema for form
const connectionSchema = z.object({
  name: z.string().min(1, "Connection name is required"),
  customEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
});

type ConnectionFormData = z.infer<typeof connectionSchema>;

interface NewConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (connection: AIConnection) => void;
}

export function NewConnectionDialog({
  open,
  onClose,
  onSave,
}: NewConnectionDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(
    null,
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const vendors = getAllVendors();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    mode: "onChange",
  });

  const handleSelectProvider = (providerId: AIProvider) => {
    setSelectedProvider(providerId);
    const vendor = AI_VENDORS[providerId];
    reset({
      name: vendor.name,
      apiKey: "",
      customEndpoint: vendor.defaultEndpoint || "",
    });
  };

  const handleBack = () => {
    setSelectedProvider(null);
    reset({ name: "", apiKey: "", customEndpoint: "" });
  };

  const onSubmit = async (data: ConnectionFormData) => {
    if (!selectedProvider) return;

    const vendor = AI_VENDORS[selectedProvider];
    const normalizedApiKey = data.apiKey?.trim() || "";
    const normalizedEndpoint =
      data.customEndpoint?.trim() || vendor.defaultEndpoint;

    // Manual validation based on provider
    if (vendor.requiresAuth && !normalizedApiKey) {
      setError("apiKey", { message: "API key is required" });
      return;
    }

    if (
      selectedProvider === "openai" &&
      normalizedEndpoint === AI_VENDORS.openai.defaultEndpoint &&
      !normalizedApiKey
    ) {
      setError("apiKey", {
        message:
          "API key is required for OpenAI cloud endpoint. For local endpoints, API key can be empty.",
      });
      return;
    }

    // Validate API key format
    if (
      normalizedApiKey &&
      !validateApiKey(selectedProvider, normalizedApiKey)
    ) {
      setError("apiKey", {
        message: `Invalid API key format for ${vendor.name}`,
      });
      return;
    }

    setLoading(true);

    try {
      const connection: AIConnection = {
        id: `${selectedProvider}-${Date.now()}`,
        name: data.name,
        provider: selectedProvider,
        apiKey: normalizedApiKey,
        ...(normalizedEndpoint && { customEndpoint: normalizedEndpoint }),
        enabled: true,
        models: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const models = await fetchModelsForConnection(connection);
      connection.models = models;

      onSave(connection);
      handleClose();
    } catch (err) {
      setError("root", {
        message:
          err instanceof Error ? err.message : "Failed to create connection",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedProvider(null);
    reset({ name: "", apiKey: "", customEndpoint: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90dvh] sm:max-h-[85dvh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {!selectedProvider
              ? "Add AI Connection"
              : `Configure ${AI_VENDORS[selectedProvider].name}`}
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="connectionName" className="text-sm font-medium">
                Connection Name
              </Label>
              <Input
                id="connectionName"
                {...register("name")}
                placeholder="E.g., My Google AI"
                className="mt-2"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Give this connection a name to identify it
              </p>
            </div>

            {selectedProvider === "openai" && (
              <div>
                <Label htmlFor="customEndpoint" className="text-sm font-medium">
                  API Endpoint
                </Label>
                <Input
                  id="customEndpoint"
                  {...register("customEndpoint")}
                  placeholder={AI_VENDORS.openai.defaultEndpoint}
                  className="mt-2"
                />
                {errors.customEndpoint && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.customEndpoint.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Default is OpenAI cloud endpoint. For local models use
                  `http://localhost:1234/v1` (LM Studio) or
                  `http://localhost:11434/v1` (Ollama).
                </p>
              </div>
            )}

            {(AI_VENDORS[selectedProvider].requiresAuth ||
              selectedProvider === "openai") && (
              <div>
                <Label htmlFor="apiKey" className="text-sm font-medium">
                  {selectedProvider === "openai"
                    ? "API Key (Optional for Local)"
                    : "API Key"}
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    {...register("apiKey")}
                    placeholder={AI_VENDORS[selectedProvider].apiKeyPlaceholder}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.apiKey && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.apiKey.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedProvider === "openai"
                    ? "OpenAI cloud requires an API key. Local OpenAI-compatible endpoints can run without one."
                    : "Get your API key from "}
                  {selectedProvider !== "openai" && (
                    <a
                      href={AI_VENDORS[selectedProvider].setupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {AI_VENDORS[selectedProvider].name}
                    </a>
                  )}
                </p>
              </div>
            )}

            {errors.root && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive">
                  {errors.root.message}
                </p>
              </div>
            )}
          </form>
        )}

        <DialogFooter>
          {selectedProvider ? (
            <>
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Adding Connection..." : "Add Connection"}
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
