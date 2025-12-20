# Coding Guidelines

Best practices and conventions for the Become An Author codebase.

## Architecture Patterns

### Clean Architecture Layers
```
Domain       → Entities, Interfaces (no dependencies)
Infrastructure → Repository implementations, Tauri bridges
Features     → UI components, hooks (Feature-Sliced Design)
Core         → Logger, API clients, storage
```

### Key Conventions

| Pattern | Where | Example |
|---------|-------|---------|
| Repository Pattern | Data access | `IMentionRepository` → `TauriMentionRepository` |
| DI via Context | React | `useAppServices()` hook |
| Scoped logging | All files | `logger.debug('[Component] message', { data })` |
| Constants file | Magic numbers | Import from `@/lib/config/constants` |

## Code Quality

### Logging
```typescript
import { logger } from '@/core/logger';

logger.debug('Dev-only');     // Silent in production
logger.info('User action');   // Always shown
logger.error('Failure', err); // Errors
```

### Types
- Use `unknown` instead of `any`
- Import from `@/domain/entities/types`
- Use proper Tiptap types from `@/shared/types/tiptap`

### Rust Backend
- **No `.unwrap()`** in production code — use `?` or `.ok_or_else()`
- Minimize `.clone()` — prefer references
- Use `serde_json::Value` for flexible JSON structures

## File Organization

```
frontend/
├── domain/          # Pure types/interfaces
├── infrastructure/  # Tauri repos, services
├── features/        # Feature modules
├── hooks/           # Reusable hooks
├── core/            # Logger, API, storage
└── lib/config/      # Constants, AI vendors
```

## Testing
- Tests in `__tests__/` subfolder
- Name: `{filename}.test.ts`
- Run: `npm test`
