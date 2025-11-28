# Security & Error Handling

This document covers the security architecture, error handling patterns, and notification system implemented in the application.

## Security Fixes Implemented

All 22 security vulnerabilities have been remediated across Critical (P0), High (P1), and Medium (P2) priority levels.

### Critical Fixes (P0)

#### 1. API Key Security
**File:** `src/lib/core/ai-client.ts`

API keys for AI providers are now transmitted securely:
- Google AI: API keys in `x-goog-api-key` header (not URL parameters)
- All providers: Keys never exposed in browser history or network logs
- Response validation ensures API format changes don't cause silent failures

#### 2. Atomic Database Transactions
**File:** `src/hooks/use-import-export.ts`

Project import operations use atomic Dexie transactions:
```typescript
await db.transaction('rw', [db.projects, db.nodes, db.scenes, ...], async () => {
    // All database writes succeed or rollback together
});
```

#### 3. Safe JSON Parsing
**File:** `src/lib/json-utils.ts`

Utility functions for safe JSON operations:
```typescript
safeJsonParse<T>(json: string, fallback: T): T
safeLocalStorageGet<T>(key: string, fallback: T): T
safeLocalStorageSet<T>(key: string, value: T): boolean
```

Used in: `continue-writing-menu.tsx`, `tweak-generate-dialog.tsx`

#### 4. Data Loss Prevention
**File:** `src/hooks/use-auto-save.ts`

Synchronous emergency backup system:
- `beforeunload` handler creates instant localStorage backup
- Auto-restoration on page reload
- User warned about unsaved changes
- No reliance on async operations that may not complete

#### 5. Import Validation
**File:** `src/lib/schemas/import-schema.ts`

Comprehensive Zod schemas validate all imported data:
- XSS prevention through string sanitization
- Type validation for all fields
- Protection against malformed or malicious project files

### High Priority Fixes (P1)

#### 6. Safe Storage Wrapper
**File:** `src/lib/safe-storage.ts`

All localStorage access goes through safe wrapper:
- Automatic error handling
- Quota exceeded detection
- Type-safe get/set operations
- Graceful degradation when storage unavailable

#### 7. API Response Validation
**File:** `src/lib/core/ai-client.ts`

Validation functions for each AI vendor:
- `validateOpenRouterResponse()`
- `validateMistralResponse()`
- `validateOpenAIResponse()`
- `validateKimiResponse()`
- `validateGoogleResponse()`

Prevents silent failures when APIs change format.

#### 8. Sequential Error Handling
**File:** `src/hooks/use-import-export.ts`

Database table clearing uses sequential operations instead of `Promise.all`:
```typescript
for (const table of tables) {
    try {
        await table.clear();
    } catch (err) {
        // Individual error handling
        throw err; // Prevent partial state
    }
}
```

### Medium Priority Fixes (P2)

#### 9. Fetch Timeouts
**File:** `src/lib/fetch-utils.ts`

All API calls have timeouts:
```typescript
fetchWithTimeout(url, options, timeout)
```
- Default: 30 seconds
- AI generation: 60 seconds
- Prevents UI freezes from hanging requests

#### 10. Recursion Limits
**File:** `src/lib/context-engine.ts`

Stack overflow prevention:
```typescript
const MAX_DEPTH = 100;
function extractTextFromTiptap(node: any, depth = 0): string {
    if (depth > MAX_DEPTH) return '';
    // ... recursive extraction
}
```

#### 11. Error Message Sanitization
**File:** `src/lib/core/ai-client.ts`

Two-tier error logging:
- **Console:** Detailed technical errors for developers
- **User-facing:** Generic, safe error messages

## Toast Notification System

### Architecture

**Library:** react-hot-toast (reliable Next.js 16 compatibility)

**Components:**
- `src/components/client-toaster.tsx` - Toast provider component
- `src/lib/toast-service.ts` - Unified toast API

**Configuration:**
```typescript
<HotToaster 
    position="bottom-right"
    toastOptions={{
        duration: 4000,
        success: { iconTheme: { primary: '#10b981' }},
        error: { iconTheme: { primary: '#ef4444' }},
    }}
/>
```

### Usage Pattern

All error-prone operations should show toast notifications:

```typescript
try {
    await riskyOperation();
    toast.success('Operation completed!');
} catch (error) {
    const message = error instanceof Error ? error.message : 'Operation failed';
    toast.error(message);
}
```

### Components with Toast Error Handling

✅ `use-ai-generation.ts` - Editor AI generation  
✅ `text-replace-dialog.tsx` - Expand/Rephrase/Shorten  
✅ `AIChat.tsx` - Chat AI generation  
✅ `rewrite-menu.tsx` - Text rewriting  
✅ `tinker-mode.tsx` - Creative tinkering  
✅ `details-tab.tsx` - Codex description generation  
✅ `use-import-export.ts` - Import/export operations  

### User-Facing Error Messages

Specific, actionable messages are provided for common errors:

| Error Type | Message |
|------------|---------|
| Network failure | "Network error. Please check your internet connection." |
| Request timeout | "Request timed out. Please check your internet connection and try again." |
| API quota exceeded | "API quota exceeded. Please check your account credits or try a different model." |
| Rate limit | "Rate limit exceeded. Please wait a moment and try again." |
| Invalid API key | "Invalid API key. Please check your [Provider] API key in settings." |
| Model not found | "Model not found or not available. Please try a different model." |

## Error Flow

```
User Action
    ↓
Component calls AI/DB function
    ↓
Error occurs
    ↓
ai-client.ts catches & throws user-friendly error
    ↓
Component catch block
    ↓
toast.error(message) ← User sees notification
    ↓
console.error(details) ← Developer sees full error
```

## Best Practices

### 1. Always Use Safe Utilities

❌ **Don't:**
```typescript
const data = JSON.parse(localStorage.getItem('key') || '{}');
```

✅ **Do:**
```typescript
const data = storage.getItem<MyType>(STORAGE_KEYS.KEY, defaultValue);
```

### 2. Always Show Toast Notifications

❌ **Don't:**
```typescript
catch (error) {
    console.error(error); // User sees nothing!
}
```

✅ **Do:**
```typescript
catch (error) {
    console.error(error); // For developers
    toast.error(error.message); // For users
}
```

### 3. Use Atomic Transactions for Critical Operations

❌ **Don't:**
```typescript
await db.projects.add(project);
await db.nodes.bulkAdd(nodes); // Might fail after project added
```

✅ **Do:**
```typescript
await db.transaction('rw', [db.projects, db.nodes], async () => {
    await db.projects.add(project);
    await db.nodes.bulkAdd(nodes);
});
```

### 4. Validate External Data

❌ **Don't:**
```typescript
const imported = JSON.parse(fileContent);
await db.projects.add(imported); // Malicious data!
```

✅ **Do:**
```typescript
const parsed = JSON.parse(fileContent);
const validated = projectValidationSchema.parse(parsed);
await db.projects.add(validated);
```

## Testing

All security fixes have been verified through:
- Automated tests for localStorage safety
- Manual tests for import validation
- Network failure simulations
- API quota exceeded scenarios
- Tab close data loss prevention

See `testing_report.md` in artifacts for full test results.

## Future Improvements

1. **Add automated E2E tests** for critical security paths
2. **Implement Content Security Policy (CSP)** headers
3. **Add rate limiting** to AI API calls on client side
4. **Implement telemetry** for error tracking in production
5. **Add retry logic** with exponential backoff for transient errors
