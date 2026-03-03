/**
 * Secure API Key Storage
 * Stores API keys through backend secure storage commands.
 */

import { invoke } from "@tauri-apps/api/core";
import { AIProvider, validateApiKey } from "@/lib/config/ai-vendors";
import { logger } from "@/shared/utils/logger";
import { toAppError } from "@/shared/errors/app-error";

const log = logger.scope("APIKeys");
import { toast } from "@/core/toast";

/**
 * Store an API key in local app storage
 */
export async function storeAPIKey(
  provider: AIProvider,
  connectionId: string,
  apiKey: string,
): Promise<boolean> {
  try {
    const normalized = apiKey.trim();
    await invoke("store_api_key", { provider, connectionId, key: normalized });

    log.debug(`Stored API key for ${provider}/${connectionId}`);
    return true;
  } catch (error) {
    const appError = toAppError(
      error,
      "E_API_KEY_STORE_FAILED",
      `Failed to store ${provider} API key`,
    );
    log.error(
      `Failed to store API key for ${provider}/${connectionId}:`,
      appError,
    );
    toast.error(`Failed to store ${provider} API key: ${appError.message}`);
    throw appError;
  }
}

/**
 * Retrieve an API key from local app storage
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
    const appError = toAppError(
      error,
      "E_API_KEY_GET_FAILED",
      `Failed to retrieve ${provider} API key`,
    );
    log.error(
      `Failed to retrieve API key for ${provider}/${connectionId}:`,
      appError,
    );
    throw appError;
  }
}

/**
 * Delete an API key from local app storage
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
    const appError = toAppError(
      error,
      "E_API_KEY_DELETE_FAILED",
      `Failed to delete ${provider} API key`,
    );
    log.error(
      `Failed to delete API key for ${provider}/${connectionId}:`,
      appError,
    );
    throw appError;
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
    const appError = toAppError(
      error,
      "E_API_KEY_PROVIDER_LIST_FAILED",
      "Failed to list providers with stored API keys",
    );
    log.error("Failed to list stored providers:", appError);
    throw appError;
  }
}

/**
 * Check if an API key exists for a provider (without retrieving it)
 */
export async function isApiKeyStored(
  provider: AIProvider,
  connectionId: string,
): Promise<boolean> {
  try {
    const hasKey = await invoke<boolean>("has_api_key", {
      provider,
      connectionId,
    });
    return hasKey === true;
  } catch (error) {
    const appError = toAppError(
      error,
      "E_API_KEY_HAS_FAILED",
      `Failed to check ${provider} API key presence`,
    );
    log.error(
      `Failed to check API key presence for ${provider}/${connectionId}:`,
      appError,
    );
    throw appError;
  }
}

/**
 * Validate API key format (basic validation)
 */
export function validateAPIKey(
  provider: AIProvider,
  key: string,
): string | null {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return "API key cannot be empty";
  }

  if (provider === "openai") {
    if (!normalizedKey.startsWith("sk-")) {
      return 'OpenAI API keys should start with "sk-"';
    }
    if (normalizedKey.length < 40) {
      return "OpenAI API key seems too short";
    }
    return null;
  }

  if (validateApiKey(provider, normalizedKey)) {
    return null;
  }

  if (provider === "anthropic") {
    return 'Anthropic API keys should start with "sk-ant-"';
  }
  if (provider === "openrouter") {
    return 'OpenRouter API keys should start with "sk-or-"';
  }
  return `Invalid ${provider} API key format`;
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

  // Store in app-local secure storage
  try {
    await storeAPIKey(provider, connectionId, apiKey.trim());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to store API key";
    return {
      success: false,
      error: message,
    };
  }

  return { success: true };
}
