# Documentation Index

**Become An Author** - Technical Documentation

---

## Core Documentation

### [architecture_doc.md](./architecture_doc.md)
**The definitive source of truth** for all technical decisions and system architecture.

**Contents**:
- System goals and constraints
- 5-layer architecture model
- Feature module structure
- Repository pattern implementation
- Service layer design
- Data flow patterns
- Recent improvements and metrics

**Version**: v1.1 (Updated: 2025-12-01)

---

### [feature_spec.md](./feature_spec.md)
Complete feature specifications for all application features.

**Contents**:
- Project management
- Editor capabilities
- Codex (world-building)
- AI integration
- Planning tools
- Review feature (story analysis)

---

### [security.md](./security.md)
Security considerations and privacy-first design.

**Contents**:
- Local-first data storage
- API key management
- External API integrations
- Data export/import security

---

## Analysis & Maintenance

### [dependency_analysis.md](./dependency_analysis.md) ⭐ NEW
Comprehensive visual dependency analysis of the entire codebase.

**Contents**:
- 12 detailed Mermaid diagrams (dark mode optimized)
- 5-layer architecture visualization
- Feature module dependencies
- Repository layer architecture
- Service layer patterns
- DI container structure
- Hook architecture
- Data flow diagrams (write/read/AI)
- Component relationships
- Critical statistics and metrics

**Highlights**:
- Zero cross-feature dependencies confirmed
- 100% repository pattern coverage
- Complete DI container mapping
- 17 custom hooks documented
- 9 repository implementations
- 14 feature modules analyzed

---

### [maintenance.md](./maintenance.md) ⭐ NEW
Ongoing log of refactoring, cleanup, and architectural improvements.

**Recent Activities**:
- Phase 5: Toast consolidation (100% complete)
- Phase 6: Feature boundaries & shared components
- File cleanup (712 lines removed)
- DataCloneError fixes (3 locations)
- JSON parsing robustness improvements

**Metrics Tracked**:
- Architecture health scores
- Code cleanup statistics
- Technical debt items
- Version history

---

### [troubleshooting.md](./troubleshooting.md) ⭐ NEW
Common issues, bugs, and their solutions.

**Currently Documented**:
- **DataCloneError** - Complete fix documentation for IndexedDB Promise cloning issues
  - SaveCoordinator serialization
  - AnalysisService metrics handling
  - DexieAnalysisRepository deep cloning
- **JSON Parsing** - Control character sanitization in AI responses
- **File Corruption** - Suggestion.ts restoration

**Includes**:
- Root cause analysis
- Solution implementations
- Code examples
- Testing verification
- Performance considerations

---

## Quick Reference

### Architecture at a Glance

```
┌─────────────────────────────────────────┐
│     Presentation Layer (React/Next)     │
│  - Features (14 modules)                │
│  - Shared Components (3 cross-feature)  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│    Application Layer (Business Logic)   │
│  - Custom Hooks (17)                    │
│  - State Management (Zustand)           │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      Domain Layer (Interfaces)          │
│  - Repository Interfaces (7)            │
│  - Service Interfaces (4)               │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│   Infrastructure (Implementations)      │
│  - Repositories (9 Dexie)               │
│  - Services (3 + lib services)          │
│  - DI Container (AppContext)            │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│        Data Layer (Persistence)         │
│  - IndexedDB (12 tables)                │
│  - LocalStorage (settings, tokens)      │
│  - External APIs (AI, Google Drive)     │
└─────────────────────────────────────────┘
```

### Key Principles

1. **Clean Architecture**: 5 distinct layers with clear boundaries
2. **Repository Pattern**: All data access abstracted
3. **Dependency Injection**: Single AppContext container
4. **Feature Isolation**: Zero cross-feature dependencies
5. **Type Safety**: 100% TypeScript coverage
6. **Offline-First**: Full functionality without network

---

## Documentation Standards

### When to Update

- **architecture_doc.md** - Any architectural decisions or patterns
- **feature_spec.md** - New features or feature changes
- **maintenance.md** - After any refactoring or cleanup
- **troubleshooting.md** - When bugs are fixed
- **dependency_analysis.md** - Major structural changes

### Versioning

All documentation follows semantic versioning:
- **Major** (v2.0) - Fundamental architecture changes
- **Minor** (v1.1) - New sections or significant updates  
- **Patch** (v1.0.1) - Small corrections or clarifications

---

## Contributing to Documentation

### Mermaid Diagrams
- Use dark mode optimization (white text on colored backgrounds)
- Keep labels concise but descriptive
- Use consistent color schemes
- Test rendering before committing

### Markdown Style
- Use proper heading hierarchy
- Include code examples where relevant
- Add tables for metrics and comparisons
- Link between related documents

---

**Last Updated**: 2025-12-01  
**Documentation Version**: 1.0
