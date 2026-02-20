/**
 * Secure API Key Storage
 * Stores API keys in OS-level encrypted keychain instead of localStorage
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service (gnome-keyring/kwallet)
 */

import { invoke } from "@tauri-apps/api/core";
import { AIProvider } from "@/lib/config/ai-vendors";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("APIKeys");
import { toast } from "@/core/toast";

/**
 * Store an API key securely in OS keychain
 */
export async function storeAPIKey(
  provider: AIProvider,
  connectionId: string,
  apiKey: string,
): Promise<boolean> {
  try {
    await invoke("store_api_key", { provider, connectionId, key: apiKey });
    log.debug(`Stored API key for ${provider}/${connectionId} in OS keychain`);
    return true;
  } catch (error) {
    log.error(
      `Failed to store API key for ${provider}/${connectionId}:`,
      error,
    );
    const message = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Failed to store ${provider} API key: ${message}`);
    return false;
  }
}

/**
 * Retrieve an API key from OS keychain
 * Returns null if no key is stored
 */
export async function getAPIKey(
  provider: AIProvider,
  connectionId: string,
): Promise<string | null> {
  try {
    const key = await invoke<string | null>("get_api_key", {
      provider,
      connectionId,
    });
    return key;
  } catch (error) {
    log.error(
      `Failed to retrieve API key for ${provider}/${connectionId}:`,
      error,
    );
    return null;
  }
}

/**
 * Delete an API key from OS keychain
 */
export async function deleteAPIKey(
  provider: AIProvider,
  connectionId: string,
): Promise<boolean> {
  try {
    await invoke("delete_api_key", { provider, connectionId });
    log.debug(`Deleted API key for ${provider}/${connectionId}`);
    return true;
  } catch (error) {
    log.error(
      `Failed to delete API key for ${provider}/${connectionId}:`,
      error,
    );
    return false;
  }
}

/**
 * List all providers that have API keys stored
 */
export async function listStoredProviders(): Promise<AIProvider[]> {
  try {
    const providers = await invoke<AIProvider[]>("list_api_key_providers");
    return providers;
  } catch (error) {
    log.error("Failed to list stored providers:", error);
    return [];
  }
}

/**
 * Check if an API key exists for a provider (without retrieving it)
 */
export async function hasAPIKey(
  provider: AIProvider,
  connectionId: string,
): Promise<boolean> {
  const key = await getAPIKey(provider, connectionId);
  return key !== null && key.length > 0;
}

/**
 * Validate API key format (basic validation)
 */
export function validateAPIKey(
  provider: AIProvider,
  key: string,
): string | null {
  if (!key || key.trim().length === 0) {
    return "API key cannot be empty";
  }

  // Provider-specific validation
  switch (provider) {
    case "openai":
      if (!key.startsWith("sk-")) {
        return 'OpenAI API keys should start with "sk-"';
      }
      if (key.length < 40) {
        return "OpenAI API key seems too short";
      }
      break;

    case "anthropic":
      if (!key.startsWith("sk-ant-")) {
        return 'Anthropic API keys should start with "sk-ant-"';
      }
      break;

    case "google":
      if (key.length < 30) {
        return "Google API key seems too short";
      }
      break;

    case "openrouter":
      if (!key.startsWith("sk-or-")) {
        return 'OpenRouter API keys should start with "sk-or-"';
      }
      break;

    case "groq":
      if (!key.startsWith("gsk_")) {
        return 'Groq API keys should start with "gsk_"';
      }
      break;

    case "mistral":
      if (key.length < 30) {
        return "Mistral API key seems too short";
      }
      break;

    case "deepseek":
      if (!key.startsWith("sk-")) {
        return 'DeepSeek API keys should start with "sk-"';
      }
      break;

    default:
      // Fallback validation for unlisted providers
      if (key.length < 20) {
        return "API key seems too short";
      }
  }

  return null; // Valid
}

/**
 * Store API key with validation
 */
export async function storeAPIKeyWithValidation(
  provider: AIProvider,
  connectionId: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  // Validate format
  const validationError = validateAPIKey(provider, apiKey);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Store in keychain
  const success = await storeAPIKey(provider, connectionId, apiKey.trim());

  if (!success) {
    return {
      success: false,
      error: "Failed to store API key in secure storage",
    };
  }

  return { success: true };
}
