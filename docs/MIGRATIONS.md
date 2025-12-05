# Database Migration Guide

> **This document tracks all IndexedDB schema changes for the Become An Author novel writing application.**

---

## Current Version: 9

---

## Migration History

| Version | Date | Changes | Breaking |
|---------|------|---------|----------|
| **9** | 2025-12-05 | Added `emergencyBackups` table for safe backup storage | No |
| 8 | 2024-XX | Added unique constraints `[name+category]` to templates/relation types | No |
| 7 | 2024-XX | Added Codex enhancement tables (tags, templates, relations) | No |
| 6 | 2024-XX | Initial stable schema with 11 core tables | N/A |

---

## Adding a New Migration

Follow these steps when adding a new database version:

### 1. Increment Version in `database.ts`

```typescript
// Add NEW version ABOVE existing versions
this.version(10).stores({
    // ... all existing tables
    newTable: 'id, projectId, createdAt', // New table
});

// Keep version 9 for migration compatibility
this.version(9).stores({
    // ... existing v9 schema
});
```

### 2. Add Upgrade Logic (if needed)

```typescript
this.version(10).stores({...}).upgrade(async (trans) => {
    console.log('🔄 Migrating to version 10...');
    
    // Data transformation logic
    const items = await trans.table('oldTable').toArray();
    for (const item of items) {
        await trans.table('newTable').add({
            ...item,
            newField: 'default',
        });
    }
    
    console.log('✅ Migration to version 10 complete');
});
```

### 3. Add Migration Test

Add a test case in `database.test.ts` that verifies:
- Old data is preserved after migration
- New tables/indexes are created
- Data transformations work correctly

### 4. Update This Document

Add an entry to the Migration History table above.

---

## Migration Rules

> [!CAUTION]
> These rules prevent data loss and corruption.

1. **NEVER remove a table** without a 2-version deprecation period
2. **NEVER rename columns** directly—add new column, migrate data, remove old in next version
3. **NEVER change index structure** on existing data without upgrade logic
4. **ALWAYS keep previous version** for rollback compatibility
5. **ALWAYS test migrations** with real user data samples

---

## Schema Reference (v9)

```typescript
{
    projects: 'id, title, createdAt, archived, seriesId',
    nodes: 'id, projectId, parentId, type, order',
    codex: 'id, projectId, name, category, *tags',
    series: 'id, title',
    snippets: 'id, projectId, title, pinned',
    codexRelations: 'id, parentId, childId, type',
    codexAdditions: 'id, sceneId, codexEntryId',
    sections: 'id, sceneId',
    chatThreads: 'id, projectId, pinned, archived, createdAt',
    chatMessages: 'id, threadId, timestamp',
    storyAnalyses: 'id, projectId, analysisType, scope, createdAt, manuscriptVersion',
    codexTags: 'id, projectId, name, category',
    codexEntryTags: 'id, entryId, tagId, [entryId+tagId]',
    codexTemplates: 'id, [name+category], category, isBuiltIn, projectId',
    codexRelationTypes: 'id, [name+category], category, isBuiltIn',
    emergencyBackups: 'id, sceneId, expiresAt',  // NEW in v9
}
```

---

## Troubleshooting

### "UpgradeError: Version change"
This occurs when the user has a newer database version than the code. Ensure you deploy new code before old versions are removed.

### "QuotaExceededError"
IndexedDB has a storage limit (~500MB typical). Implement storage quota monitoring to warn users before this happens.

### Migration Fails Silently
Check the browser console for migration logs. All migrations should log their progress with `console.log()`.

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-05
