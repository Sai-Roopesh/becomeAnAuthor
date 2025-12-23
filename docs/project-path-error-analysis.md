# ProjectPath Error Root Cause Analysis

## Executive Summary

The "No project path set" errors occurred due to an **architectural mismatch** between how repositories were instantiated and how projectPath was shared across them.

---

## The Architecture Problem

### How ProjectPath Works

```
TauriProjectRepository.get(id)  
    │
    ▼
TauriNodeRepository.getInstance().setProjectPath(path)
    │
    ▼ All other repos read from this:
TauriCodexRepository → TauriNodeRepository.getInstance().getProjectPath()
TauriChatRepository  → TauriNodeRepository.getInstance().getProjectPath()
TauriSnippetRepository → TauriNodeRepository.getInstance().getProjectPath()
... (11 total repos)
```

### The Bug: Instance Mismatch

**Before fix** - `AppContext.tsx` created NEW instances:
```typescript
// ❌ WRONG - Creates orphan instance
const nodeRepo = createLazy(() => new TauriNodeRepository());
```

**But** `TauriProjectRepository` set projectPath on the SINGLETON:
```typescript
// Sets path on DIFFERENT instance!
TauriNodeRepository.getInstance().setProjectPath(created.path);
```

**Result:** The DI-injected `nodeRepo` never received the `projectPath`.

---

## Timeline of Issues

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| "Create Novel" fails | AppContext used `new` instead of singleton | Use `getInstance()` |
| "Add Act" in existing project fails | UI rendered before `projectPath` set | Added loading gate in `ProjectPageClient` |
| Creates fail after project load | Same singleton issue | Same fix |

---

## Why This Pattern Exists

The original design intended:
1. **Lazy initialization** - Don't create repos until needed
2. **Singleton for state** - Share `projectPath` across all repos
3. **DI for testability** - Inject mocks in tests

The bug was that lazy initialization created NEW instances instead of using the singleton.

---

## Prevention

### Rule 1: Always Use Singleton
```typescript
// ✅ CORRECT
TauriNodeRepository.getInstance()

// ❌ WRONG  
new TauriNodeRepository()
```

### Rule 2: Gate UI on Initialization
```typescript
// In project page
if (!isInitialized) return <Loading />;
```

### Rule 3: Set projectPath Early
```typescript
// Call this before any repo operations
await projectRepository.get(projectId);
```

---

## Files Modified

| File | Change |
|------|--------|
| `AppContext.tsx` | Use singleton for nodeRepo |
| `ProjectPageClient` | Add initialization gate |
| `CODING_GUIDELINES.md` | Document singleton pattern |

## Affected Repositories (All Fixed)

All 11 repositories now work correctly:
- TauriNodeRepository ✅
- TauriCodexRepository ✅
- TauriChatRepository ✅
- TauriSnippetRepository ✅
- TauriAnalysisRepository ✅
- TauriCodexTagRepository ✅
- TauriCodexTemplateRepository ✅
- TauriCodexRelationRepository ✅
- TauriCodexRelationTypeRepository ✅
- TauriSceneCodexLinkRepository ✅
- TauriCollaborationRepository ✅
