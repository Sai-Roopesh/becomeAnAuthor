# Quick Architecture Rules (Condensed for Prompt Injection)

**CRITICAL**: Follow these rules for ALL code changes.

---

## MANDATORY PATTERNS

### 1. Data Access - ALWAYS Use Repositories
```typescript
// ✅ CORRECT
const nodeRepo = useNodeRepository();
const nodes = await nodeRepo.getByProject(id);

// ❌ NEVER
import { db } from '@/lib/core/database';
const nodes = await db.nodes.where()... // WRONG!
```

### 2. Feature Structure
```
src/features/[feature-name]/
├── components/     # Feature UI
├── hooks/         # Feature hooks  
└── types.ts       # Feature types (optional)
```

**NEVER** put feature code in root `src/components` or `src/hooks` (shared only).

### 3. New Repository Checklist
- [ ] Interface in `domain/repositories/IYourRepo.ts`
- [ ] Implementation in `infrastructure/repositories/DexieYourRepo.ts`
- [ ] Hook in `hooks/use-your-repository.ts`
- [ ] Register in `infrastructure/di/AppContext.tsx`

### 4. IndexedDB Storage - ALWAYS Serialize
```typescript
// ✅ CORRECT
const clean = JSON.parse(JSON.stringify(data));
await db.table.add(clean);

// ❌ NEVER
await db.table.add(data); // May contain Promises!
```

### 5. Toast Notifications
```typescript
// ✅ CORRECT
import { toast } from '@/lib/toast-service';

// ❌ NEVER
import { toast } from 'sonner';
```

### 6. Cross-Feature Imports
```typescript
// ✅ CORRECT - Via shared
import { Component } from '@/features/shared/components';

// ❌ NEVER
import { Component } from '@/features/other-feature/components';
```

---

## ZERO TOLERANCE VIOLATIONS

1. ❌ Direct `db` import in components
2. ❌ Cross-feature dependencies  
3. ❌ Direct `sonner` imports
4. ❌ Promises in IndexedDB data
5. ❌ Features in root `components/`

---

## IMPLEMENTATION ORDER

1. Domain interfaces
2. Infrastructure implementations  
3. Application hooks
4. DI registration
5. Components (using hooks only)

---

See full rules: `.ai/rules.md`

**Version**: 1.0 | **Updated**: 2025-12-01
