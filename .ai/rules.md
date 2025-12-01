# AI Development Rules - Become An Author

> **CRITICAL**: Read and follow these rules for EVERY code change. Violations require extensive refactoring.

---

## 🚨 MANDATORY ARCHITECTURE RULES

### 1. Feature Structure - ALWAYS Follow

```
src/features/[feature-name]/
├── components/          # Feature-specific UI components
│   └── FeatureComponent.tsx
├── hooks/              # Feature-specific hooks
│   └── use-feature-data.ts
└── (optional) types.ts # Feature-specific types
```

**NEVER**:
- ❌ Put feature code in `src/components` (reserved for shared only)
- ❌ Put feature code in `src/hooks` (reserved for shared only)
- ❌ Import from other features directly (use `shared` instead)

---

### 2. Data Access Pattern - REQUIRED

**✅ CORRECT Pattern**:
```typescript
// In component
import { useNodeRepository } from '@/hooks/use-node-repository';

function MyComponent() {
    const nodeRepo = useNodeRepository();
    const nodes = await nodeRepo.getByProject(projectId);
}
```

**❌ NEVER DO THIS**:
```typescript
import { db } from '@/lib/core/database';

function MyComponent() {
    const nodes = await db.nodes.where('projectId').equals(id).toArray(); // ❌ WRONG!
}
```

**RULE**: NEVER import `db` directly in components. ALWAYS use repository hooks.

---

### 3. Repository Pattern - MANDATORY

**Creating a New Repository**:

1. **Define Interface** (`src/domain/repositories/IYourRepository.ts`):
```typescript
export interface IYourRepository {
    get(id: string): Promise<YourEntity | undefined>;
    create(data: Omit<YourEntity, 'id' | 'createdAt'>): Promise<YourEntity>;
    update(id: string, data: Partial<YourEntity>): Promise<void>;
    delete(id: string): Promise<void>;
}
```

2. **Implement with Dexie** (`src/infrastructure/repositories/DexieYourRepository.ts`):
```typescript
import { db } from '@/lib/core/database';
import type { IYourRepository } from '@/domain/repositories/IYourRepository';

export class DexieYourRepository implements IYourRepository {
    async get(id: string): Promise<YourEntity | undefined> {
        return await db.yourTable.get(id);
    }
    // ... implement all interface methods
}
```

3. **Create Hook** (`src/hooks/use-your-repository.ts`):
```typescript
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { IYourRepository } from '@/domain/repositories/IYourRepository';

export function useYourRepository(): IYourRepository {
    return useAppServices().yourRepository;
}
```

4. **Register in DI Container** (`src/infrastructure/di/AppContext.tsx`):
```typescript
const yourRepository = new DexieYourRepository(db);

const appServices: AppServices = {
    // ... existing repos
    yourRepository,
};
```

---

### 4. Component Rules

**✅ DO**:
- Use `'use client'` directive for client components
- Import types from `@/lib/config/types`
- Use repository hooks for data access
- Use `toast` from `@/lib/toast-service` (NOT from 'sonner')

**❌ DON'T**:
- Import `db` directly
- Import `toast` from `sonner` directly
- Create cross-feature dependencies
- Put business logic in components (use hooks or services)

---

### 5. Shared Components - When and How

**When to Create Shared Component**:
- Used by 2+ different features
- General-purpose UI element

**Location**: `src/features/shared/components/`

**Export Pattern**:
```typescript
// src/features/shared/components/YourComponent.tsx
export function YourComponent() { ... }

// src/features/shared/components/index.ts
export { YourComponent } from './YourComponent';
```

**Usage in Features**:
```typescript
import { YourComponent } from '@/features/shared/components';
```

---

### 6. Database Operations - CRITICAL RULES

**✅ ALWAYS Serialize Before Storing**:
```typescript
// When saving to IndexedDB
const cleanData = JSON.parse(JSON.stringify(data));
await db.table.add(cleanData);
```

**Why**: IndexedDB cannot store Promises, functions, or circular references.

**❌ NEVER**:
```typescript
await db.table.add(data); // ❌ WRONG - might contain Promises
```

---

### 7. Service Layer Pattern

**When to Create a Service**:
- Complex business logic
- Multi-repository operations
- External API calls (AI, Google Drive)

**Pattern**:

1. **Interface** (`src/domain/services/IYourService.ts`):
```typescript
export interface IYourService {
    doSomething(params: Params): Promise<Result>;
}
```

2. **Implementation** (`src/infrastructure/services/YourService.ts`):
```typescript
export class YourService implements IYourService {
    constructor(
        private repo1: IRepo1,
        private repo2: IRepo2
    ) {}
    
    async doSomething(params: Params): Promise<Result> {
        // Complex business logic here
    }
}
```

3. **Register in DI** and **create hook** (same as repository pattern)

---

### 8. State Management

**Global UI State**: Use Zustand
```typescript
// src/store/use-feature-store.ts
import { create } from 'zustand';

export const useFeatureStore = create<FeatureState>((set) => ({
    // state and actions
}));
```

**Data State**: Use repository hooks + `useLiveQuery` from Dexie
```typescript
const nodes = useLiveQuery(
    () => nodeRepo.getByProject(projectId),
    [projectId]
);
```

---

### 9. Import Path Aliases - REQUIRED

**✅ USE**:
```typescript
import { db } from '@/lib/core/database';
import { useNodeRepository } from '@/hooks/use-node-repository';
import type { Node } from '@/lib/config/types';
import { toast } from '@/lib/toast-service';
```

**❌ DON'T USE**:
```typescript
import { db } from '../../../lib/core/database';  // ❌ WRONG
import { toast } from 'sonner';                    // ❌ WRONG
```

---

### 10. File Naming Conventions

**Components**: PascalCase
- `EditorContainer.tsx`
- `CreateNodeDialog.tsx`

**Hooks**: kebab-case with `use-` prefix
- `use-node-repository.ts`
- `use-auto-save.ts`

**Services/Repositories**: PascalCase
- `AnalysisService.ts`
- `DexieNodeRepository.ts`

**Utilities**: kebab-case
- `safe-storage.ts`
- `toast-service.ts`

---

## 📋 CHECKLIST FOR NEW FEATURES

Before implementing ANY new feature, verify:

- [ ] **Repository Created?** 
  - ✅ Interface in `domain/repositories/`
  - ✅ Implementation in `infrastructure/repositories/`
  - ✅ Hook in `hooks/`
  - ✅ Registered in `AppContext`

- [ ] **Components in Correct Location?**
  - ✅ Feature components in `features/[name]/components/`
  - ✅ Shared components in `features/shared/components/`
  - ✅ NOT in root `components/` (legacy location)

- [ ] **No Direct DB Access?**
  - ✅ All data access via repository hooks
  - ✅ No `import { db }` in components

- [ ] **Data Serialization?**
  - ✅ `JSON.parse(JSON.stringify())` before IndexedDB storage
  - ✅ No Promises in stored data

- [ ] **Toast Service?**
  - ✅ Using `@/lib/toast-service`
  - ✅ NOT importing from 'sonner' directly

- [ ] **Types Defined?**
  - ✅ In `@/lib/config/types` for shared types
  - ✅ In `features/[name]/types.ts` for feature-specific

- [ ] **No Cross-Feature Dependencies?**
  - ✅ Features only import from `shared` or `ai`
  - ✅ No `features/A` importing from `features/B`

---

## 🚫 COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Direct Database Access
```typescript
// ❌ WRONG
import { db } from '@/lib/core/database';
const nodes = await db.nodes.toArray();

// ✅ CORRECT
const nodeRepo = useNodeRepository();
const nodes = await nodeRepo.getAll();
```

### ❌ Mistake 2: Cross-Feature Import
```typescript
// ❌ WRONG
import { ChatDialog } from '@/features/chat/components/ChatDialog';

// ✅ CORRECT - Move to shared first
import { ChatDialog } from '@/features/shared/components';
```

### ❌ Mistake 3: Direct Toast Import
```typescript
// ❌ WRONG
import { toast } from 'sonner';

// ✅ CORRECT
import { toast } from '@/lib/toast-service';
```

### ❌ Mistake 4: Storing Promises
```typescript
// ❌ WRONG
await db.table.add({ data: somePromise });

// ✅ CORRECT
const clean = JSON.parse(JSON.stringify(data));
await db.table.add(clean);
```

### ❌ Mistake 5: Wrong Component Location
```typescript
// ❌ WRONG - Feature component in root
src/components/MyFeatureComponent.tsx

// ✅ CORRECT
src/features/my-feature/components/MyFeatureComponent.tsx
```

---

## 🎯 IMPLEMENTATION WORKFLOW

### For ANY New Feature:

1. **Plan the Architecture**
   - What repositories needed?
   - What services needed?
   - What components needed?
   - Where do they belong?

2. **Create Domain Layer** (Interfaces)
   - `domain/repositories/IYourRepository.ts`
   - `domain/services/IYourService.ts` (if needed)

3. **Create Infrastructure Layer** (Implementations)
   - `infrastructure/repositories/DexieYourRepository.ts`
   - `infrastructure/services/YourService.ts` (if needed)

4. **Create Application Layer** (Hooks)
   - `hooks/use-your-repository.ts`
   - `hooks/use-your-service.ts` (if needed)

5. **Update DI Container**
   - Register in `infrastructure/di/AppContext.tsx`

6. **Create Components**
   - `features/[name]/components/YourComponent.tsx`
   - Only use repository hooks, never `db` directly

7. **Add Types**
   - `lib/config/types.ts` (if shared)
   - `features/[name]/types.ts` (if feature-specific)

8. **Update Database Schema** (if new table needed)
   - `lib/core/database.ts` - Add to Dexie schema

---

## 📚 QUICK REFERENCE

### Current Architecture

```
5-Layer Architecture:
┌─────────────────────────────────────┐
│ Presentation (Features, Components) │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ Application (Hooks, State)          │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ Domain (Interfaces)                 │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ Infrastructure (Repos, Services)    │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ Data (IndexedDB, LocalStorage, APIs)│
└─────────────────────────────────────┘
```

### Key Modules

- **14 Features**: ai, chat, codex, data-management, editor, google-drive, navigation, plan, project, review, search, settings, shared, snippets
- **7 Repository Interfaces**: INodeRepository, IProjectRepository, ICodexRepository, IChatRepository, ISnippetRepository, IAnalysisRepository, ICodexRelationRepository
- **9 Repository Implementations**: All Dexie-based
- **DI Container**: AppContext provides all dependencies

---

## ⚡ FINAL RULE

**When in doubt**:
1. Look at existing similar features
2. Follow the same pattern
3. Never create new patterns without discussing first
4. If you must deviate, document why

**Zero Tolerance**:
- Direct `db` imports in components → ALWAYS refactor
- Cross-feature dependencies → ALWAYS use shared
- Direct `sonner` imports → ALWAYS use toast-service
- Promises in IndexedDB → ALWAYS serialize

---

**Last Updated**: 2025-12-01  
**Version**: 1.0  
**Status**: MANDATORY - Violations require immediate refactoring
