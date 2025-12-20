/**
 * Streaming Utilities
 * SSE parser and streaming helpers for AI responses
 */

import { logger } from '@/core/logger';

/**
 * Parse Server-Sent Events (SSE) stream
 * Used by OpenRouter, OpenAI, Mistral, Kimi
 */
export async function parseSSEStream(
    response: Response,
    onChunk: (text: string) => void,
    onComplete: () => void,
    signal?: AbortSignal
): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            // Check if cancelled
            if (signal?.aborted) {
                reader.cancel();
                throw new Error('Stream cancelled');
            }

            const { done, value } = await reader.read();

            if (done) break;

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                if (!line.trim() || line.startsWith(':')) continue;

                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    // Check for done signal
                    if (data === '[DONE]') {
                        onComplete();
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = extractContent(parsed);
                        if (content) {
                            onChunk(content);
                        }
                    } catch (e) {
                        // Ignore parse errors for malformed chunks
                        console.warn('Failed to parse SSE chunk:', e);
                    }
                }
            }
        }

        onComplete();
    } finally {
        reader.releaseLock();
    }
}

/**
 * Extract content from SSE chunk
 * Handles different provider formats
 */
interface SSEChunk {
    choices?: Array<{
        delta?: { content?: string };
        text?: string;
    }>;
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
}

function extractContent(data: SSEChunk): string | null {
    // Log the raw data structure to understand Gemini's format
    if (data.candidates) {
        logger.debug('[SSE] Gemini format detected', { data });
    }

    // OpenRouter/OpenAI/Mistral format
    if (data.choices?.[0]?.delta?.content) {
        return data.choices[0].delta.content;
    }

    // Alternative format
    if (data.choices?.[0]?.text) {
        return data.choices[0].text;
    }

    // Google Gemini SSE format
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        logger.debug('[SSE] Extracting Gemini text', { preview: data.candidates[0].content.parts[0].text.substring(0, 50) });
        return data.candidates[0].content.parts[0].text;
    }

    console.warn('[SSE] Unknown format, data:', JSON.stringify(data).substring(0, 200));
    return null;
}

/**
 * Parse Google Gemini streaming response
 * Gemini sends multi-line pretty-printed JSON objects
 */
export async function parseGeminiStream(
    response: Response,
    onChunk: (text: string) => void,
    onComplete: () => void,
    signal?: AbortSignal
): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let braceCount = 0;
    let currentObject = '';

    try {
        while (true) {
            if (signal?.aborted) {
                reader.cancel();
                throw new Error('Stream cancelled by user');
            }

            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process buffer character by character to find complete JSON objects
            for (let i = 0; i < buffer.length; i++) {
                const char = buffer[i];
                currentObject += char;

                if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;

                    // Found complete JSON object
                    if (braceCount === 0 && currentObject.trim()) {
                        try {
                            const data = JSON.parse(currentObject);
                            logger.debug('[Gemini] Parsed object', { data });

                            // Extract text from Gemini response structure
                            const candidates = data.candidates || [];
                            for (const candidate of candidates) {
                                const content = candidate.content;
                                if (content && content.parts) {
                                    for (const part of content.parts) {
                                        if (part.text) {
                                            logger.debug('[Gemini] Extracted text', { preview: part.text.substring(0, 50) });
                                            onChunk(part.text);
                                        }
                                    }
                                }
                            }
                        } catch (parseError) {
                            console.warn('[Gemini] Failed to parse object:', currentObject.substring(0, 100));
                        }

                        // Reset for next object
                        currentObject = '';
                    }
                }
            }

            // Clear processed buffer
            buffer = '';
        }

        onComplete();
    } finally {
        reader.releaseLock();
    }
}
